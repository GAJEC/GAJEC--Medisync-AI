"""Central model lifecycle: device selection, single loading, status, and inference locking.

Concurrency policy (measured on an RTX 2060 6 GB, see README):
  * Each model is loaded at most once per process (guarded by a per-slot load lock).
  * Inference is serialized per device with one lock per device ("cuda" / "cpu"),
    so MedGemma and Whisper never run concurrently on the GPU and cannot
    stack activation memory. MERaLiON defaults to CPU and uses the CPU lock.
  * Run uvicorn with a single worker; more workers would load duplicate copies.
"""
from __future__ import annotations

import logging
import threading
import time
from contextlib import contextmanager
from dataclasses import dataclass, field
from typing import Any, Callable

from .errors import ServiceError, disabled, not_ready

log = logging.getLogger("ai.models")

_device_locks: dict[str, threading.Lock] = {"cuda": threading.Lock(), "cpu": threading.Lock()}


def resolve_device(requested: str) -> str:
    import torch

    if requested == "cpu":
        return "cpu"
    if requested == "cuda":
        if not torch.cuda.is_available():
            raise RuntimeError("Device 'cuda' requested but CUDA is not available to PyTorch.")
        return "cuda"
    return "cuda" if torch.cuda.is_available() else "cpu"


@contextmanager
def inference_slot(device: str, timeout: float):
    """Serialize inference per device. Raises 503 if the queue wait is too long."""
    lock = _device_locks["cuda" if device.startswith("cuda") else "cpu"]
    if not lock.acquire(timeout=timeout):
        raise ServiceError(503, "INFERENCE_BUSY", "The inference engine is busy. Please retry shortly.")
    try:
        yield
    finally:
        lock.release()


@contextmanager
def oom_guard():
    """Convert CUDA OOM into a 503 instead of crashing the process."""
    import torch

    try:
        yield
    except torch.cuda.OutOfMemoryError:
        log.error("CUDA out of memory during inference")
        torch.cuda.empty_cache()
        raise ServiceError(503, "GPU_OUT_OF_MEMORY", "The GPU ran out of memory for this request. Try a shorter input.")


@dataclass
class ModelSlot:
    name: str
    enabled: bool
    loader: Callable[[], Any]
    state: str = "not_loaded"  # disabled | not_loaded | loading | ready | failed
    error: str | None = None
    device: str | None = None
    load_seconds: float | None = None
    gpu_memory_mb: float | None = None
    info: dict[str, Any] = field(default_factory=dict)
    instance: Any = None
    _lock: threading.Lock = field(default_factory=threading.Lock, repr=False)

    def __post_init__(self):
        if not self.enabled:
            self.state = "disabled"

    def load(self) -> None:
        if not self.enabled:
            return
        with self._lock:
            if self.state == "ready":
                return
            self.state, self.error = "loading", None
            started = time.perf_counter()
            before = _gpu_allocated()
            try:
                inst = self.loader()
            except Exception as exc:  # noqa: BLE001 - surface any load failure as status
                self.state = "failed"
                # Keep a short, path-free message for status reporting.
                self.error = f"{type(exc).__name__}: {str(exc)[:300]}"
                log.exception("Failed to load model %s", self.name)
                return
            self.instance = inst
            self.device = getattr(inst, "device_name", None)
            self.info = getattr(inst, "info", {}) or {}
            self.load_seconds = round(time.perf_counter() - started, 1)
            after = _gpu_allocated()
            if before is not None and after is not None:
                self.gpu_memory_mb = round((after - before) / 2**20, 1)
            self.state = "ready"
            log.info("Loaded %s on %s in %.1fs (gpu delta %s MB)", self.name, self.device,
                     self.load_seconds, self.gpu_memory_mb)

    def get(self, lazy: bool) -> Any:
        if not self.enabled:
            raise disabled(self.name)
        if self.state == "ready":
            return self.instance
        if lazy and self.state in ("not_loaded",):
            self.load()
            if self.state == "ready":
                return self.instance
        raise not_ready(self.name, self.state)

    def status(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "enabled": self.enabled,
            "state": self.state,
            "device": self.device,
            "load_seconds": self.load_seconds,
            "gpu_memory_mb": self.gpu_memory_mb,
            "error": self.error,
            **({"info": self.info} if self.info else {}),
        }


def _gpu_allocated() -> int | None:
    try:
        import torch

        if torch.cuda.is_available():
            torch.cuda.synchronize()
            return torch.cuda.memory_allocated()
    except Exception:  # noqa: BLE001
        return None
    return None


class ModelManager:
    def __init__(self, settings):
        from .services.medgemma_service import MedGemmaService
        from .services.meralion_service import MeralionService
        from .services.whisper_service import WhisperService

        self.settings = settings
        self.lazy = not settings.load_on_startup
        self.slots: dict[str, ModelSlot] = {
            "medgemma": ModelSlot("medgemma", settings.medgemma_enabled, lambda: MedGemmaService(settings)),
            "whisper": ModelSlot("whisper", settings.whisper_enabled, lambda: WhisperService(settings)),
            "meralion": ModelSlot("meralion", settings.meralion_enabled, lambda: MeralionService(settings)),
        }

    def load_all(self) -> None:
        # Load the smaller audio model first so the large model sees the true remaining VRAM.
        for key in ("whisper", "meralion", "medgemma"):
            self.slots[key].load()

    def get(self, key: str):
        return self.slots[key].get(self.lazy)

    def status(self) -> dict[str, Any]:
        gpu: dict[str, Any] = {"available": False}
        try:
            import torch

            if torch.cuda.is_available():
                free, total = torch.cuda.mem_get_info()
                gpu = {
                    "available": True,
                    "name": torch.cuda.get_device_name(0),
                    "total_mb": round(total / 2**20),
                    "free_mb": round(free / 2**20),
                    "allocated_mb": round(torch.cuda.memory_allocated() / 2**20),
                }
        except Exception:  # noqa: BLE001
            pass
        return {"gpu": gpu, "models": {k: s.status() for k, s in self.slots.items()}}
