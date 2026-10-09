"""MedGemma 4B IT (local weights) for symptom intake and image-plus-text analysis.

The local checkpoint is google/medgemma-4b-it v1.0.1 (Gemma3ForConditionalGeneration).
On GPUs with < ~10 GB VRAM it must be quantized (default: 4-bit NF4 via bitsandbytes).
The model never makes the final triage decision; the Fastify safety layer does.
"""
from __future__ import annotations

import json
import logging
import re
import time
from typing import Any

from pydantic import ValidationError

from ..errors import ServiceError
from ..model_manager import inference_slot, oom_guard, resolve_device
from ..prompts import load_prompt, retry_instruction
from ..safety import detect_red_flags, emergency_response
from ..schemas import ChatOutput, HistoryMessage, ImageOutput, PatientContext

log = logging.getLogger("ai.medgemma")

REQUIRED_FILES = ("config.json", "model.safetensors.index.json", "tokenizer.model", "preprocessor_config.json")

def _context_text(ctx: PatientContext | None) -> str:
    if not ctx:
        return ""
    parts = []
    if ctx.age_years is not None:
        parts.append(f"age {ctx.age_years}")
    if ctx.sex and ctx.sex != "unspecified":
        parts.append(f"sex {ctx.sex}")
    if ctx.known_conditions:
        parts.append("known conditions: " + ", ".join(c[:80] for c in ctx.known_conditions[:10]))
    return ("Patient context: " + "; ".join(parts) + ".\n") if parts else ""


def normalize_history(history: list[HistoryMessage], max_messages: int, max_chars: int) -> list[dict[str, str]]:
    """Return alternating user/assistant turns that start with 'user', bounded in size."""
    turns: list[dict[str, str]] = []
    for m in history[-max_messages:] if max_messages else []:
        text = m.content.strip()
        if not text:
            continue
        if turns and turns[-1]["role"] == m.role:
            turns[-1]["text"] += "\n" + text
        else:
            turns.append({"role": m.role, "text": text})
    while turns and turns[0]["role"] != "user":
        turns.pop(0)
    # Trim oldest turns (in user/assistant pairs) until within the character budget.
    while turns and sum(len(t["text"]) for t in turns) > max_chars:
        turns = turns[2:] if len(turns) >= 2 else []
    if turns and turns[-1]["role"] == "user":
        # The new message will be a user turn; keep strict alternation.
        turns.append({"role": "assistant", "text": "(acknowledged)"})
    return turns


_FENCE = re.compile(r"```(?:json)?\s*(.*?)```", re.S)


def extract_json(text: str) -> dict[str, Any] | None:
    """Best-effort extraction of the first JSON object from model output."""
    candidates = [m.group(1) for m in _FENCE.finditer(text)]
    start, end = text.find("{"), text.rfind("}")
    if start != -1 and end > start:
        candidates.append(text[start : end + 1])
    for c in candidates:
        c = c.strip()
        for attempt in (c, re.sub(r",\s*([}\]])", r"\1", c)):
            try:
                obj = json.loads(attempt)
            except json.JSONDecodeError:
                continue
            if isinstance(obj, dict):
                return obj
    return None


def parse_output(raw: str, model_cls, language: str = "en"):
    """Validate generated text into model_cls. Returns (output, valid: bool)."""
    obj = extract_json(raw)
    if obj is not None:
        try:
            return model_cls.model_validate(obj), True
        except ValidationError as exc:
            log.warning("MedGemma JSON failed validation: %s", exc.error_count())
    # Fallback: never forward unstructured free text as clinical content.
    if language == "fil":
        reply = (
            "Hindi nakabuo ng maaasahang paunang gabay ang system. "
            "Magpatingin agad sa healthcare professional; kung malubha o mabilis lumalala ang sintomas, "
            "humingi ngayon ng emergency care."
        )
        advice = ["Magpa-assess agad nang personal; emergency care ngayon kung malubha o lumalala ang sintomas."]
    else:
        reply = (
            "I could not produce reliable preliminary guidance. Please arrange prompt in-person assessment; "
            "seek emergency care now if symptoms are severe or rapidly worsening."
        )
        advice = ["Arrange prompt in-person assessment; seek emergency care now for severe or worsening symptoms."]
    fallback = model_cls(
        reply=reply,
        suggested_urgency="urgent",
        care_advice=advice,
        uncertainty_note="The model response failed validation; no diagnosis or explanation is provided.",
    )
    return fallback, False


class MedGemmaService:
    def __init__(self, settings):
        import torch
        from transformers import AutoModelForImageTextToText, AutoProcessor, BitsAndBytesConfig

        self.settings = settings
        path = settings.medgemma_path
        missing = [f for f in REQUIRED_FILES if not (path / f).exists()]
        if missing:
            raise FileNotFoundError(f"MedGemma weights incomplete; missing {missing} in configured MEDGEMMA_DIR")

        self.device_name = resolve_device(settings.medgemma_device)
        quant = settings.medgemma_quantization
        if self.device_name == "cpu" and quant != "none":
            log.warning("bitsandbytes quantization requires CUDA; loading MedGemma unquantized on CPU (slow).")
            quant = "none"

        compute_dtype = self._compute_dtype(torch, settings.medgemma_compute_dtype)
        kwargs: dict[str, Any] = {"local_files_only": True, "low_cpu_mem_usage": True}
        if quant == "4bit":
            kwargs["quantization_config"] = BitsAndBytesConfig(
                load_in_4bit=True,
                bnb_4bit_quant_type="nf4",
                bnb_4bit_use_double_quant=True,
                bnb_4bit_compute_dtype=compute_dtype,
                # The vision tower and projector stay unquantized for image fidelity.
                llm_int8_skip_modules=["vision_tower", "multi_modal_projector", "lm_head"],
            )
            kwargs["dtype"] = compute_dtype
            kwargs["device_map"] = {"": 0}
        elif quant == "8bit":
            kwargs["quantization_config"] = BitsAndBytesConfig(
                load_in_8bit=True, llm_int8_skip_modules=["vision_tower", "multi_modal_projector", "lm_head"]
            )
            kwargs["dtype"] = compute_dtype
            kwargs["device_map"] = {"": 0}
        else:
            kwargs["dtype"] = compute_dtype if self.device_name == "cuda" else torch.float32

        self.processor = AutoProcessor.from_pretrained(str(path), local_files_only=True, use_fast=True)
        model = AutoModelForImageTextToText.from_pretrained(str(path), **kwargs)
        if quant == "none":
            model = model.to(self.device_name)
        model.eval()
        self.vision_dtype = self._vision_dtype(torch, settings.medgemma_vision_dtype, compute_dtype)
        if self.vision_dtype != compute_dtype:
            # The vision tower and projector are unquantized; run them in their own dtype.
            model.model.vision_tower.to(self.vision_dtype)
            model.model.multi_modal_projector.to(self.vision_dtype)
        self.model = model
        self.compute_dtype = compute_dtype
        self.info = {
            "identity": "google/medgemma-4b-it (local, v1.0.1)",
            "quantization": quant,
            "compute_dtype": str(compute_dtype).replace("torch.", ""),
            "vision_dtype": str(self.vision_dtype).replace("torch.", ""),
        }

    @staticmethod
    def _vision_dtype(torch, requested: str, compute_dtype):
        if requested != "auto":
            return getattr(torch, requested)
        if torch.cuda.is_available() and compute_dtype == torch.bfloat16 and not torch.cuda.is_bf16_supported(
            including_emulation=False
        ):
            # Measured on RTX 2060: emulated bf16 SigLIP encode = 38.6 s / +2.4 GB peak,
            # fp16 = 0.96 s / +0.1 GB, with cosine similarity 0.9997 between outputs.
            return torch.float16
        return compute_dtype

    @staticmethod
    def _compute_dtype(torch, requested: str):
        if requested != "auto":
            return getattr(torch, requested)
        if torch.cuda.is_available():
            # Gemma 3 activations can overflow in fp16, so prefer bf16 (same exponent range as fp32).
            # Turing GPUs (RTX 20xx) run bf16 via PyTorch's emulated path; measured on an RTX 2060 it is
            # numerically fine and faster than fp32, and it halves the large unquantized embedding/lm_head
            # (262k vocab), which in fp32 alone needs ~2.7 GB and pushed a 6 GB GPU into system-memory spill.
            return torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float32
        return torch.float32

    # ------------------------------------------------------------------ public
    def chat(self, req) -> dict[str, Any]:
        findings = detect_red_flags(req.message, req.history)
        if findings:
            return emergency_response(findings, req.reply_language, ChatOutput)

        s = self.settings
        system = load_prompt("chat-v1.txt", req.reply_language)
        turns = normalize_history(req.history, s.medgemma_max_history_messages, s.medgemma_max_input_chars)
        user_text = _context_text(req.patient_context) + "Patient message:\n" + req.message[: s.medgemma_max_input_chars]
        messages = self._messages(system, turns, user_text, image=None)
        out, valid, meta = self._generate_validated(messages, ChatOutput, req.reply_language)
        return {"result": out.model_dump(), "output_valid": valid, "meta": meta}

    def analyze_image(self, image, ctx) -> dict[str, Any]:
        findings = detect_red_flags(ctx.description, ctx.history)
        if findings:
            return emergency_response(findings, ctx.reply_language, ImageOutput)

        s = self.settings
        system = load_prompt("image-v1.txt", ctx.reply_language)
        turns = normalize_history(ctx.history, s.medgemma_max_history_messages, s.medgemma_max_input_chars)
        parts = [_context_text(ctx.patient_context)]
        if ctx.body_location:
            parts.append(f"Body location: {ctx.body_location}\n")
        parts.append("Patient description: " + (ctx.description[: s.medgemma_max_input_chars] or "(none provided)"))
        messages = self._messages(system, turns, "".join(parts), image=image)
        out, valid, meta = self._generate_validated(messages, ImageOutput, ctx.reply_language)
        return {"result": out.model_dump(), "output_valid": valid, "meta": meta}

    # ----------------------------------------------------------------- helpers
    def _generate_validated(self, messages, model_cls, language):
        started = time.perf_counter()
        raw, meta = self._generate(messages)
        out, valid = parse_output(raw, model_cls, language)
        if not valid:
            log.warning("Structured MedGemma output invalid; retrying once")
            retry_messages = [dict(message) for message in messages]
            retry_messages[0]["content"] = [dict(part) for part in messages[0]["content"]]
            retry_messages[0]["content"][0]["text"] += "\n\n" + retry_instruction()
            raw, retry_meta = self._generate(retry_messages)
            out, valid = parse_output(raw, model_cls, language)
            meta = {
                **retry_meta,
                "retry_count": 1,
                "total_inference_seconds": round(time.perf_counter() - started, 2),
            }
        else:
            meta["retry_count"] = 0
        return out, valid, meta

    @staticmethod
    def _messages(system: str, turns: list[dict[str, str]], user_text: str, image) -> list[dict[str, Any]]:
        msgs: list[dict[str, Any]] = [{"role": "system", "content": [{"type": "text", "text": system}]}]
        for t in turns:
            msgs.append({"role": t["role"], "content": [{"type": "text", "text": t["text"]}]})
        content: list[dict[str, Any]] = []
        if image is not None:
            content.append({"type": "image", "image": image})
        content.append({"type": "text", "text": user_text})
        msgs.append({"role": "user", "content": content})
        return msgs

    def _generate(self, messages) -> tuple[str, dict[str, Any]]:
        import torch

        s = self.settings
        inputs = self.processor.apply_chat_template(
            messages, add_generation_prompt=True, tokenize=True, return_dict=True, return_tensors="pt"
        )
        input_len = inputs["input_ids"].shape[-1]
        if input_len > 8192:
            raise ServiceError(422, "INPUT_TOO_LONG", "The conversation is too long to analyse. Start a new session.")
        dev = self.model.device
        moved = {}
        for k, v in inputs.items():
            if k == "pixel_values":
                moved[k] = v.to(dev, dtype=self.vision_dtype)
            elif v.is_floating_point():
                moved[k] = v.to(dev, dtype=self.compute_dtype)
            else:
                moved[k] = v.to(dev)
        inputs = moved

        started = time.perf_counter()
        with inference_slot(self.device_name, s.queue_timeout_seconds), oom_guard(), torch.inference_mode():
            out = self.model.generate(
                **inputs,
                max_new_tokens=s.medgemma_max_new_tokens,
                do_sample=False,
                repetition_penalty=1.05,
            )
        gen = out[0][input_len:]
        text = self.processor.decode(gen, skip_special_tokens=True)
        meta = {
            "model": "medgemma-4b-it",
            "input_tokens": int(input_len),
            "output_tokens": int(gen.shape[-1]),
            "truncated": int(gen.shape[-1]) >= s.medgemma_max_new_tokens,
            "inference_seconds": round(time.perf_counter() - started, 2),
        }
        return text, meta
