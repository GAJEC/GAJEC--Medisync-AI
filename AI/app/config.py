"""Environment-based configuration for the internal AI service.

All values can be set via environment variables or AI/.env (see .env.example).
"""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path
from typing import Literal

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

AI_ROOT = Path(__file__).resolve().parent.parent

Device = Literal["auto", "cuda", "cpu"]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=str(AI_ROOT / ".env"), env_file_encoding="utf-8", extra="ignore")

    # --- network / auth -------------------------------------------------
    host: str = Field("127.0.0.1", alias="AI_HOST")
    port: int = Field(8001, alias="AI_PORT")
    # Shared secret the Fastify backend must send in X-Internal-Token.
    internal_token: str = Field("", alias="AI_INTERNAL_TOKEN")

    # --- model locations ------------------------------------------------
    weights_dir: Path = Field(AI_ROOT / "weights", alias="AI_WEIGHTS_DIR")
    medgemma_subdir: str = Field("medgemma-4b-it", alias="MEDGEMMA_DIR")
    whisper_subdir: str = Field("whisper-small", alias="WHISPER_DIR")
    meralion_subdir: str = Field("meralion-ser-v1", alias="MERALION_DIR")

    load_on_startup: bool = Field(True, alias="AI_LOAD_ON_STARTUP")

    # --- MedGemma ---------------------------------------------------------
    medgemma_enabled: bool = Field(True, alias="MEDGEMMA_ENABLED")
    medgemma_device: Device = Field("auto", alias="MEDGEMMA_DEVICE")
    # 4bit is required to fit a 6 GB GPU; "none" loads full precision.
    medgemma_quantization: Literal["4bit", "8bit", "none"] = Field("4bit", alias="MEDGEMMA_QUANTIZATION")
    medgemma_compute_dtype: Literal["auto", "bfloat16", "float16", "float32"] = Field(
        "auto", alias="MEDGEMMA_COMPUTE_DTYPE"
    )
    # auto = fp16 for the (unquantized) vision encoder on GPUs without native bf16, else compute dtype.
    medgemma_vision_dtype: Literal["auto", "bfloat16", "float16", "float32"] = Field(
        "auto", alias="MEDGEMMA_VISION_DTYPE"
    )
    medgemma_max_new_tokens: int = Field(700, ge=64, le=2048, alias="MEDGEMMA_MAX_NEW_TOKENS")
    medgemma_max_input_chars: int = Field(6000, ge=500, le=20000, alias="MEDGEMMA_MAX_INPUT_CHARS")
    medgemma_max_history_messages: int = Field(10, ge=0, le=40, alias="MEDGEMMA_MAX_HISTORY_MESSAGES")

    # --- Whisper ----------------------------------------------------------
    whisper_enabled: bool = Field(True, alias="WHISPER_ENABLED")
    whisper_device: Device = Field("auto", alias="WHISPER_DEVICE")

    # --- MERaLiON (optional, experimental) --------------------------------
    meralion_enabled: bool = Field(False, alias="MERALION_ENABLED")
    meralion_device: Device = Field("cpu", alias="MERALION_DEVICE")

    # --- limits -------------------------------------------------------------
    max_image_bytes: int = Field(10 * 1024 * 1024, alias="AI_MAX_IMAGE_BYTES")
    max_image_pixels: int = Field(40_000_000, alias="AI_MAX_IMAGE_PIXELS")
    max_audio_bytes: int = Field(15 * 1024 * 1024, alias="AI_MAX_AUDIO_BYTES")
    max_audio_seconds: float = Field(120.0, alias="AI_MAX_AUDIO_SECONDS")
    min_audio_seconds: float = Field(0.5, alias="AI_MIN_AUDIO_SECONDS")
    # How long a request waits for the GPU/CPU inference slot before 503.
    queue_timeout_seconds: float = Field(120.0, alias="AI_QUEUE_TIMEOUT_SECONDS")

    @field_validator("weights_dir")
    @classmethod
    def _abs(cls, v: Path) -> Path:
        return v if v.is_absolute() else (AI_ROOT / v).resolve()

    @property
    def medgemma_path(self) -> Path:
        return self.weights_dir / self.medgemma_subdir

    @property
    def whisper_path(self) -> Path:
        return self.weights_dir / self.whisper_subdir

    @property
    def meralion_path(self) -> Path:
        return self.weights_dir / self.meralion_subdir


@lru_cache
def get_settings() -> Settings:
    return Settings()
