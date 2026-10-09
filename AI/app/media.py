"""Validation and decoding of uploaded images and audio.

Files are decoded entirely in memory; nothing is written to disk, so there is
no temporary-file cleanup or path traversal surface in the AI service.
"""
from __future__ import annotations

import io

import numpy as np

from .errors import bad_input

ALLOWED_IMAGE_FORMATS = {"JPEG", "PNG", "WEBP"}
TARGET_SR = 16_000


def decode_image(data: bytes, max_bytes: int, max_pixels: int):
    """Return an RGB PIL image or raise a 422 ServiceError."""
    from PIL import Image, ImageOps, UnidentifiedImageError

    if not data:
        raise bad_input("EMPTY_FILE", "The uploaded image is empty.")
    if len(data) > max_bytes:
        raise bad_input("FILE_TOO_LARGE", "The uploaded image is too large.")
    Image.MAX_IMAGE_PIXELS = max_pixels
    try:
        with Image.open(io.BytesIO(data)) as probe:
            fmt = probe.format
            probe.verify()  # structural check
        if fmt not in ALLOWED_IMAGE_FORMATS:
            raise bad_input("UNSUPPORTED_IMAGE", "Only JPEG, PNG and WebP images are supported.")
        img = Image.open(io.BytesIO(data))
        img.load()  # full decode
    except Image.DecompressionBombError:
        raise bad_input("IMAGE_TOO_LARGE", "The image resolution is too large.")
    except (UnidentifiedImageError, OSError, SyntaxError, ValueError):
        raise bad_input("CORRUPT_IMAGE", "The image could not be decoded.")
    img = ImageOps.exif_transpose(img)  # honour camera orientation
    if img.width < 32 or img.height < 32:
        raise bad_input("IMAGE_TOO_SMALL", "The image is too small to analyse.")
    return img.convert("RGB")


def decode_audio(data: bytes, max_bytes: int, max_seconds: float, min_seconds: float) -> tuple[np.ndarray, float]:
    """Decode any FFmpeg-supported audio container to mono float32 16 kHz.

    Returns (samples, duration_seconds). Raises 422 ServiceError on invalid input.
    """
    import av

    if not data:
        raise bad_input("EMPTY_FILE", "The uploaded audio is empty.")
    if len(data) > max_bytes:
        raise bad_input("FILE_TOO_LARGE", "The uploaded audio is too large.")

    max_samples = int((max_seconds + 0.5) * TARGET_SR)
    chunks: list[np.ndarray] = []
    total = 0
    try:
        with av.open(io.BytesIO(data), mode="r", metadata_errors="ignore") as container:
            streams = [s for s in container.streams if s.type == "audio"]
            if not streams:
                raise bad_input("NO_AUDIO_STREAM", "The file does not contain an audio track.")
            resampler = av.AudioResampler(format="flt", layout="mono", rate=TARGET_SR)
            for frame in container.decode(streams[0]):
                for out in resampler.resample(frame):
                    arr = out.to_ndarray().reshape(-1).astype(np.float32, copy=False)
                    chunks.append(arr)
                    total += arr.size
                if total > max_samples:
                    raise bad_input("AUDIO_TOO_LONG", f"Audio is longer than the {int(max_seconds)} second limit.")
            for out in resampler.resample(None):
                chunks.append(out.to_ndarray().reshape(-1).astype(np.float32, copy=False))
    except av.error.FFmpegError:
        raise bad_input("CORRUPT_AUDIO", "The audio could not be decoded.")

    samples = np.concatenate(chunks) if chunks else np.zeros(0, dtype=np.float32)
    duration = samples.size / TARGET_SR
    if duration > max_seconds:
        raise bad_input("AUDIO_TOO_LONG", f"Audio is longer than the {int(max_seconds)} second limit.")
    if duration < min_seconds:
        raise bad_input("AUDIO_TOO_SHORT", "The recording is too short.")
    if not np.isfinite(samples).all():
        raise bad_input("CORRUPT_AUDIO", "The audio could not be decoded.")
    return samples, duration


def is_near_silent(samples: np.ndarray, threshold: float = 0.003) -> bool:
    if samples.size == 0:
        return True
    rms = float(np.sqrt(np.mean(np.square(samples, dtype=np.float64))))
    return rms < threshold
