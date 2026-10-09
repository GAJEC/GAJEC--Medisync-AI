"""Whisper Small (local weights) speech-to-text for English and Filipino (Tagalog).

Whisper has no dedicated code-switching mode; mixed English-Filipino speech is
transcribed with whichever language is forced or detected per 30 s chunk, so
Taglish and medical terms may be transcribed inaccurately.
"""
from __future__ import annotations

import logging
import time
from typing import Any

import numpy as np

from ..media import TARGET_SR, is_near_silent
from ..model_manager import inference_slot, oom_guard, resolve_device

log = logging.getLogger("ai.whisper")

CHUNK_SECONDS = 30
# Whisper language codes. "tl" is Tagalog, which covers Filipino.
LANGUAGE_CODES = {"en": "en", "fil": "tl", "tl": "tl"}
DETECTABLE = ("en", "tl")


class WhisperService:
    def __init__(self, settings):
        import torch
        from transformers import WhisperForConditionalGeneration, WhisperProcessor

        path = settings.whisper_path
        if not (path / "config.json").exists() or not (path / "model.safetensors").exists():
            raise FileNotFoundError("Whisper weights incomplete; config.json or model.safetensors missing in WHISPER_DIR")
        self.settings = settings
        self.device_name = resolve_device(settings.whisper_device)
        self.dtype = torch.float16 if self.device_name == "cuda" else torch.float32
        self.processor = WhisperProcessor.from_pretrained(str(path), local_files_only=True)
        self.model = (
            WhisperForConditionalGeneration.from_pretrained(
                str(path), local_files_only=True, dtype=self.dtype, use_safetensors=True
            )
            .to(self.device_name)
            .eval()
        )
        tok = self.processor.tokenizer
        self._sot = tok.convert_tokens_to_ids("<|startoftranscript|>")
        self._lang_token_ids = {code: tok.convert_tokens_to_ids(f"<|{code}|>") for code in DETECTABLE}
        self._all_lang_ids = [i for t, i in zip(tok.additional_special_tokens, tok.additional_special_tokens_ids)
                              if len(t) <= 9 and t.startswith("<|") and t.endswith("|>") and t[2:-2].isalpha()
                              and t[2:-2].islower() and len(t[2:-2]) <= 3]
        self.info = {"identity": "openai/whisper-small (local)", "dtype": str(self.dtype).replace("torch.", "")}

    def _features(self, chunk: np.ndarray):
        feats = self.processor.feature_extractor(chunk, sampling_rate=TARGET_SR, return_tensors="pt").input_features
        return feats.to(self.device_name, dtype=self.dtype)

    def _detect_language(self, feats) -> tuple[str, float]:
        """Probability over all Whisper languages; report the best of en/tl with its share."""
        import torch

        dec = torch.tensor([[self._sot]], device=self.device_name)
        logits = self.model(input_features=feats, decoder_input_ids=dec).logits[0, -1].float()
        ids = torch.tensor(self._all_lang_ids, device=logits.device)
        probs = torch.softmax(logits[ids], dim=-1)
        by_id = dict(zip(self._all_lang_ids, probs.tolist()))
        best_code, best_p = max(((c, by_id.get(i, 0.0)) for c, i in self._lang_token_ids.items()), key=lambda x: x[1])
        return best_code, float(best_p)

    def transcribe(self, samples: np.ndarray, duration: float, language: str) -> dict[str, Any]:
        import torch

        warnings: list[str] = [
            "Automatic transcription may be inaccurate, especially for mixed English-Filipino speech and medical terms. Please review it."
        ]
        if is_near_silent(samples):
            return {
                "text": "", "language": None, "language_probability": None, "requested_language": language,
                "duration_seconds": round(duration, 2), "chunks": 0,
                "warnings": warnings + ["No speech was detected in the recording."],
            }

        step = CHUNK_SECONDS * TARGET_SR
        chunks = [samples[i : i + step] for i in range(0, samples.size, step)]
        # Drop a trailing fragment shorter than 0.3 s; it only produces hallucinations.
        if len(chunks) > 1 and chunks[-1].size < 0.3 * TARGET_SR:
            chunks.pop()

        texts: list[str] = []
        detected: tuple[str, float] | None = None
        started = time.perf_counter()
        with inference_slot(self.device_name, self.settings.queue_timeout_seconds), oom_guard(), torch.inference_mode():
            for idx, chunk in enumerate(chunks):
                feats = self._features(chunk)
                lang = LANGUAGE_CODES.get(language)
                if lang is None:  # auto: restrict detection to English vs Tagalog
                    code, prob = self._detect_language(feats)
                    if idx == 0:
                        detected = (code, prob)
                    lang = code

                ids = self.model.generate(
                    feats, language=lang, task="transcribe", max_new_tokens=440, num_beams=1, do_sample=False
                )
                texts.append(self.processor.batch_decode(ids, skip_special_tokens=True)[0].strip())

        text = " ".join(t for t in texts if t).strip()
        if not text:
            warnings.append("No speech was recognised in the recording.")
        # `language` is only reported when it was detected; a forced language is echoed in requested_language.
        lang_out = {"en": "en", "tl": "fil"}.get(detected[0]) if detected else None
        prob = round(detected[1], 3) if detected else None
        if prob is not None and prob < 0.5:
            warnings.append("Language detection was uncertain; consider selecting the spoken language manually.")
        log.info("Transcribed %.1fs audio in %.2fs", duration, time.perf_counter() - started)
        return {
            "text": text[:8000],
            "language": lang_out,
            "language_probability": prob,
            "requested_language": language,
            "duration_seconds": round(duration, 2),
            "chunks": len(chunks),
            "warnings": warnings,
        }
