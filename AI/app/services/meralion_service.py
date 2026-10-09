"""MERaLiON-SER-v1 speech emotion recognition (optional, experimental).

Limitations (documented, enforced by the backend):
  * Trained/evaluated on English, Chinese, Malay, Tamil (limited Thai/Indonesian/Vietnamese).
    Filipino/Tagalog is NOT a supported language.
  * Output is a vocal-affect estimate only. It is never used for triage and does not
    measure pain, distress, disease severity, or emergency status.
  * The upstream remote code fetches the openai/whisper-medium *config* from the Hub at
    load time. We pass a bundled architecture-only config instead so loading is fully offline.
"""
from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

import numpy as np

from ..media import TARGET_SR, is_near_silent
from ..model_manager import inference_slot, oom_guard, resolve_device

log = logging.getLogger("ai.meralion")

LOCAL_WHISPER_MEDIUM_CONFIG = Path(__file__).resolve().parent.parent / "resources" / "whisper-medium-config"
WINDOW_SECONDS = 30
MAX_WINDOWS = 4
LOW_CONFIDENCE = 0.5


class MeralionService:
    def __init__(self, settings):
        import torch
        from transformers import AutoModelForAudioClassification, WhisperFeatureExtractor

        path = settings.meralion_path
        for f in ("config.json", "model.safetensors", "modeling_ser_whisper_ecapa.py", "preprocessor_config.json"):
            if not (path / f).exists():
                raise FileNotFoundError(f"MERaLiON weights incomplete; missing {f} in MERALION_DIR")
        self.settings = settings
        self.device_name = resolve_device(settings.meralion_device)
        self.feature_extractor = WhisperFeatureExtractor.from_pretrained(str(path), local_files_only=True)
        model = AutoModelForAudioClassification.from_pretrained(
            str(path),
            trust_remote_code=True,  # executes the model's own local modeling_ser_whisper_ecapa.py
            local_files_only=True,
            whisper_name=str(LOCAL_WHISPER_MEDIUM_CONFIG),
            dtype=torch.float32,
        )
        self.model = model.to(self.device_name).eval()
        id2label = model.config.id2label or {}
        self.labels = [str(id2label.get(i, id2label.get(str(i), f"class_{i}"))) for i in range(model.config.num_emotions)]
        self.info = {"identity": "MERaLiON/MERaLiON-SER-v1 (local)", "labels": self.labels}

    def analyze(self, samples: np.ndarray, duration: float) -> dict[str, Any]:
        import torch

        warnings = [
            "Experimental: vocal emotion estimates are unreliable and are not used for triage.",
            "This model was not trained on Filipino/Tagalog; results for Filipino speech are less reliable.",
        ]
        step = WINDOW_SECONDS * TARGET_SR
        windows = [samples[i : i + step] for i in range(0, samples.size, step)][:MAX_WINDOWS]
        windows = [w for w in windows if w.size >= TARGET_SR] or windows[:1]
        analyzed = sum(w.size for w in windows) / TARGET_SR
        if analyzed + 0.5 < duration:
            warnings.append(f"Only the first {int(analyzed)} seconds were analysed.")
        if is_near_silent(samples):
            warnings.append("The recording is very quiet; results are unreliable.")

        feats = self.feature_extractor(windows, sampling_rate=TARGET_SR, return_tensors="pt").input_features
        with inference_slot(self.device_name, self.settings.queue_timeout_seconds), oom_guard(), torch.inference_mode():
            out = self.model(input_features=feats.to(self.device_name))
        probs = torch.softmax(out["logits"].float(), dim=-1).mean(dim=0).cpu().tolist()
        dims = out["dims"].float().mean(dim=0).cpu().tolist()

        scores = sorted(({"label": l, "score": round(p, 4)} for l, p in zip(self.labels, probs)),
                        key=lambda x: x["score"], reverse=True)
        top = scores[0]
        low = top["score"] < LOW_CONFIDENCE
        if low:
            warnings.append("Low confidence: no emotion category clearly dominated.")
        return {
            "top_label": top["label"],
            "top_score": top["score"],
            "low_confidence": low,
            "scores": scores,
            "dimensions": {"valence": round(dims[0], 4), "arousal": round(dims[1], 4), "dominance": round(dims[2], 4)},
            "analyzed_seconds": round(analyzed, 2),
            "duration_seconds": round(duration, 2),
            "warnings": warnings,
            "experimental": True,
        }
