"""Conservative speech preprocessing for already-decoded 16 kHz mono audio."""
from __future__ import annotations

import numpy as np


def preprocess_audio(
    samples: np.ndarray,
    silence_threshold: float = 0.003,
    frame_ms: int = 20,
    max_gain: float = 4.0,
) -> tuple[np.ndarray, dict[str, float]]:
    """Trim leading/trailing low-energy frames and apply capped peak normalization.

    The waveform is expected to be mono float audio at 16 kHz, as produced by
    ``media.decode_audio``. No VAD is used; internal pauses are preserved.
    """
    audio = np.asarray(samples, dtype=np.float32).reshape(-1)
    if not np.isfinite(audio).all():
        raise ValueError("Audio contains non-finite samples.")
    if frame_ms <= 0 or max_gain < 1.0 or silence_threshold < 0:
        raise ValueError("Invalid audio preprocessing settings.")
    if audio.size == 0:
        return audio, {"trimmed_seconds": 0.0, "gain": 1.0}

    frame_size = max(1, int(16_000 * frame_ms / 1000))
    frame_count = (audio.size + frame_size - 1) // frame_size
    padded = np.pad(audio, (0, frame_count * frame_size - audio.size))
    frames = padded.reshape(frame_count, frame_size)
    rms = np.sqrt(np.mean(np.square(frames, dtype=np.float64), axis=1))
    active = np.flatnonzero(rms >= silence_threshold)

    if active.size:
        start = int(active[0]) * frame_size
        end = min(audio.size, (int(active[-1]) + 1) * frame_size)
        trimmed = audio[start:end].copy()
    else:
        start, end = 0, audio.size
        trimmed = audio.copy()

    peak = float(np.max(np.abs(trimmed))) if trimmed.size else 0.0
    gain = min(max_gain, 1.0 / peak) if peak > 0 else 1.0
    if gain > 1.0:
        trimmed *= gain
    return trimmed, {
        "trimmed_seconds": round((start + audio.size - end) / 16_000, 3),
        "gain": round(gain, 3),
    }