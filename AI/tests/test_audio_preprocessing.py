import numpy as np
import pytest

from app.audio import preprocess_audio


def test_preprocessing_trims_leading_and_trailing_silence():
    silence = np.zeros(16_000, dtype=np.float32)
    speech = np.full(16_000, 0.1, dtype=np.float32)
    processed, meta = preprocess_audio(np.concatenate([silence, speech, silence]))
    assert processed.size == speech.size
    assert meta["trimmed_seconds"] == 2.0


def test_preprocessing_applies_capped_peak_gain():
    samples = np.full(8_000, 0.1, dtype=np.float32)
    processed, meta = preprocess_audio(samples, silence_threshold=0, max_gain=3)
    assert np.max(np.abs(processed)) == pytest.approx(0.3)
    assert meta["gain"] == 3


def test_preprocessing_does_not_amplify_silence():
    samples = np.zeros(16_000, dtype=np.float32)
    processed, meta = preprocess_audio(samples)
    assert np.array_equal(processed, samples)
    assert meta["gain"] == 1


@pytest.mark.parametrize("samples", [
    np.array([np.nan], dtype=np.float32),
    np.array([np.inf], dtype=np.float32),
])
def test_preprocessing_rejects_non_finite_samples(samples):
    with pytest.raises(ValueError, match="non-finite"):
        preprocess_audio(samples)


def test_preprocessing_rejects_invalid_configuration():
    with pytest.raises(ValueError, match="settings"):
        preprocess_audio(np.ones(16, dtype=np.float32), max_gain=0.5)