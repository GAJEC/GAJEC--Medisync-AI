import pytest
from pydantic import ValidationError

from app.config import AI_ROOT, Settings


def test_default_model_paths_are_local_to_ai_root():
    settings = Settings(_env_file=None)
    assert settings.weights_dir == AI_ROOT / "weights"
    assert settings.medgemma_path == AI_ROOT / "weights" / "medgemma-4b-it"
    assert settings.whisper_path == AI_ROOT / "weights" / "whisper-small"
    assert settings.meralion_enabled is False


def test_audio_preprocessing_settings_are_bounded():
    settings = Settings(_env_file=None, AI_AUDIO_MAX_GAIN=3.0, AI_AUDIO_FRAME_MS=30)
    assert settings.audio_max_gain == 3
    assert settings.audio_frame_ms == 30
    with pytest.raises(ValidationError):
        Settings(_env_file=None, AI_AUDIO_MAX_GAIN=0.5)
