"""Isolated real-model smoke tests. Loads actual local weights; not part of pytest.

Usage (from AI/):
    .venv\\Scripts\\python -m scripts.smoke_test whisper
    .venv\\Scripts\\python -m scripts.smoke_test medgemma
    .venv\\Scripts\\python -m scripts.smoke_test medgemma-image
    .venv\\Scripts\\python -m scripts.smoke_test meralion
    .venv\\Scripts\\python -m scripts.smoke_test all
Optional: --audio path\\to\\speech.wav  --image path\\to\\photo.jpg
"""
from __future__ import annotations

import os

os.environ.setdefault("HF_HUB_OFFLINE", "1")
os.environ.setdefault("TRANSFORMERS_OFFLINE", "1")
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

import argparse
import json
import sys
import time
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.config import get_settings  # noqa: E402
from app.media import decode_audio, decode_image  # noqa: E402
from app.schemas import ChatRequest, ImageContext  # noqa: E402


def gpu(tag: str):
    import torch

    if torch.cuda.is_available():
        free, total = torch.cuda.mem_get_info()
        print(f"[gpu] {tag}: allocated={torch.cuda.memory_allocated()/2**20:.0f}MB "
              f"peak={torch.cuda.max_memory_allocated()/2**20:.0f}MB used(total)={(total-free)/2**20:.0f}/{total/2**20:.0f}MB")


def synth_audio(seconds=3.0):
    sr = 16000
    t = np.arange(int(seconds * sr)) / sr
    return (0.2 * np.sin(2 * np.pi * 220 * t) * (1 + np.sin(2 * np.pi * 3 * t))).astype(np.float32), seconds


def load_audio(path: str | None):
    s = get_settings()
    if path:
        return decode_audio(Path(path).read_bytes(), s.max_audio_bytes, s.max_audio_seconds, s.min_audio_seconds)
    print("[info] no --audio given; using a synthetic tone (expect empty/garbage transcript)")
    return synth_audio()


def run_whisper(args):
    from app.services.whisper_service import WhisperService

    t = time.perf_counter()
    svc = WhisperService(get_settings())
    print(f"[whisper] loaded on {svc.device_name} in {time.perf_counter()-t:.1f}s")
    gpu("whisper loaded")
    samples, dur = load_audio(args.audio)
    for lang in ("auto", "en", "fil"):
        t = time.perf_counter()
        out = svc.transcribe(samples, dur, lang)
        print(f"[whisper:{lang}] {time.perf_counter()-t:.2f}s ->", json.dumps(out, ensure_ascii=False))
    gpu("whisper after inference")
    return svc


def run_medgemma(args, image: bool):
    from app.services.medgemma_service import MedGemmaService

    t = time.perf_counter()
    svc = MedGemmaService(get_settings())
    print(f"[medgemma] loaded on {svc.device_name} in {time.perf_counter()-t:.1f}s info={svc.info}")
    gpu("medgemma loaded")
    req = ChatRequest(message="I have had a sore throat and mild fever for two days. No trouble breathing.")
    t = time.perf_counter()
    out = svc.chat(req)
    print(f"[medgemma:chat] {time.perf_counter()-t:.1f}s valid={out['output_valid']} meta={out['meta']}")
    print(json.dumps(out["result"], indent=1, ensure_ascii=False)[:3000])
    gpu("medgemma after chat")
    if image:
        s = get_settings()
        if args.image:
            img = decode_image(Path(args.image).read_bytes(), s.max_image_bytes, s.max_image_pixels)
        else:
            from PIL import Image, ImageDraw

            img = Image.new("RGB", (512, 512), (225, 190, 170))
            ImageDraw.Draw(img).ellipse((180, 200, 330, 320), fill=(200, 80, 80))
            print("[info] no --image given; using a synthetic skin-tone image with a red patch")
        t = time.perf_counter()
        out = svc.analyze_image(img, ImageContext(description="Red itchy patch on forearm for 3 days", body_location="forearm"))
        print(f"[medgemma:image] {time.perf_counter()-t:.1f}s valid={out['output_valid']} meta={out['meta']}")
        print(json.dumps(out["result"], indent=1, ensure_ascii=False)[:3000])
        gpu("medgemma after image")
    return svc


def run_meralion(args):
    from app.services.meralion_service import MeralionService

    t = time.perf_counter()
    svc = MeralionService(get_settings())
    print(f"[meralion] loaded on {svc.device_name} in {time.perf_counter()-t:.1f}s labels={svc.labels}")
    samples, dur = load_audio(args.audio)
    t = time.perf_counter()
    out = svc.analyze(samples, dur)
    print(f"[meralion] {time.perf_counter()-t:.2f}s ->", json.dumps(out))
    return svc


def main():
    p = argparse.ArgumentParser()
    p.add_argument("target", choices=["whisper", "medgemma", "medgemma-image", "meralion", "all"])
    p.add_argument("--audio")
    p.add_argument("--image")
    args = p.parse_args()
    import torch

    print(f"[env] torch {torch.__version__} cuda={torch.cuda.is_available()} "
          f"{torch.cuda.get_device_name(0) if torch.cuda.is_available() else ''}")
    keep = []
    if args.target in ("whisper", "all"):
        keep.append(run_whisper(args))
    if args.target in ("meralion", "all"):
        keep.append(run_meralion(args))
    if args.target in ("medgemma", "medgemma-image", "all"):
        keep.append(run_medgemma(args, image=args.target != "medgemma"))
    gpu("final (all requested models resident)")


if __name__ == "__main__":
    main()
