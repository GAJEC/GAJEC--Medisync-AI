"""Internal AI inference service (FastAPI). Not for public exposure.

Run (single worker so each model is loaded once):
    .venv\\Scripts\\python -m app.main
"""
from __future__ import annotations

import os

# Force fully-offline operation before any Hugging Face import.
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
os.environ["HF_HUB_DISABLE_TELEMETRY"] = "1"
os.environ.setdefault("PYTORCH_CUDA_ALLOC_CONF", "expandable_segments:True")

import asyncio
import hmac
import json
import logging
import uuid
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import Depends, FastAPI, File, Form, Header, Request, UploadFile
from fastapi.concurrency import run_in_threadpool
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from .config import get_settings
from .audio import preprocess_audio
from .errors import ServiceError, bad_input
from .media import TARGET_SR, decode_audio, decode_image
from .model_manager import ModelManager
from .schemas import ChatRequest, ImageContext

logging.basicConfig(level=os.environ.get("AI_LOG_LEVEL", "INFO"), format="%(asctime)s %(levelname)s %(name)s %(message)s")
log = logging.getLogger("ai")


def create_app(manager: ModelManager | None = None) -> FastAPI:
    settings = get_settings()

    @asynccontextmanager
    async def lifespan(app: FastAPI):
        if not settings.internal_token:
            log.warning("AI_INTERNAL_TOKEN is empty: internal endpoints will reject all requests.")
        mgr = manager or ModelManager(settings)
        app.state.models = mgr
        if manager is None and settings.load_on_startup:
            # Load in a background thread so /internal/health answers while weights load.
            app.state.loader = asyncio.create_task(run_in_threadpool(mgr.load_all))
        yield
        log.info("AI service shutting down")

    app = FastAPI(title="Medisync internal AI service", version="0.1.0", lifespan=lifespan,
                  docs_url=None, redoc_url=None, openapi_url=None)

    # ------------------------------------------------------------ middleware
    @app.middleware("http")
    async def request_id(request: Request, call_next):
        rid = request.headers.get("x-request-id") or uuid.uuid4().hex
        request.state.rid = rid[:64]
        response = await call_next(request)
        response.headers["x-request-id"] = request.state.rid
        return response

    def err(status: int, code: str, message: str, request: Request) -> JSONResponse:
        return JSONResponse(status_code=status, content={"error": {"code": code, "message": message,
                                                                   "request_id": getattr(request.state, "rid", None)}})

    @app.exception_handler(ServiceError)
    async def _service_error(request: Request, exc: ServiceError):
        return err(exc.status, exc.code, exc.message, request)

    @app.exception_handler(RequestValidationError)
    async def _validation(request: Request, exc: RequestValidationError):
        return err(422, "INVALID_REQUEST", "The request did not match the expected schema.", request)

    @app.exception_handler(Exception)
    async def _unhandled(request: Request, exc: Exception):
        log.error("Unhandled error rid=%s type=%s", getattr(request.state, "rid", None), type(exc).__name__)
        return err(500, "INTERNAL_ERROR", "Inference failed unexpectedly.", request)

    # ------------------------------------------------------------------ auth
    async def require_token(x_internal_token: Annotated[str | None, Header()] = None):
        expected = settings.internal_token
        if not expected or not x_internal_token or not hmac.compare_digest(expected, x_internal_token):
            raise ServiceError(401, "UNAUTHORIZED", "Missing or invalid internal token.")

    auth = [Depends(require_token)]

    def models(request: Request) -> ModelManager:
        return request.app.state.models

    # ------------------------------------------------------------- endpoints
    @app.get("/internal/health")
    async def health(request: Request):
        # Liveness only; unauthenticated and contains no model details.
        return {"status": "ok"}

    @app.get("/internal/ready", dependencies=auth)
    async def readiness(request: Request):
        slots = models(request).slots
        enabled = {name: slot for name, slot in slots.items() if slot.enabled}
        unavailable = {name: slot.state for name, slot in enabled.items() if slot.state != "ready"}
        if not enabled or unavailable:
            return JSONResponse(
                status_code=503,
                content={"status": "not_ready", "models": unavailable},
            )
        return {"status": "ready"}

    @app.get("/internal/models/status", dependencies=auth)
    async def model_status(request: Request):
        return models(request).status()

    @app.post("/internal/medical/chat", dependencies=auth)
    async def medical_chat(request: Request, body: ChatRequest):
        svc = await run_in_threadpool(models(request).get, "medgemma")
        return await run_in_threadpool(svc.chat, body)

    @app.post("/internal/medical/analyze-image", dependencies=auth)
    async def analyze_image(request: Request, image: UploadFile = File(...), context: str = Form("{}")):
        try:
            ctx = ImageContext.model_validate(json.loads(context or "{}"))
        except (json.JSONDecodeError, ValidationError):
            raise bad_input("INVALID_CONTEXT", "The image context is invalid.")
        data = await _read_limited(image, settings.max_image_bytes)
        img = await run_in_threadpool(decode_image, data, settings.max_image_bytes, settings.max_image_pixels)
        svc = await run_in_threadpool(models(request).get, "medgemma")
        return await run_in_threadpool(svc.analyze_image, img, ctx)

    @app.post("/internal/audio/transcribe", dependencies=auth)
    async def transcribe(request: Request, audio: UploadFile = File(...), language: str = Form("auto")):
        if language not in ("auto", "en", "fil"):
            raise bad_input("INVALID_LANGUAGE", "language must be one of auto, en, fil.")
        svc = await run_in_threadpool(models(request).get, "whisper")
        samples, duration = await _audio(audio)
        return await run_in_threadpool(svc.transcribe, samples, duration, language)

    @app.post("/internal/audio/analyze", dependencies=auth)
    async def analyze_audio(request: Request, audio: UploadFile = File(...)):
        svc = await run_in_threadpool(models(request).get, "meralion")
        samples, duration = await _audio(audio)
        return await run_in_threadpool(svc.analyze, samples, duration)

    async def _audio(upload: UploadFile):
        data = await _read_limited(upload, settings.max_audio_bytes)
        samples, duration = await run_in_threadpool(
            decode_audio,
            data,
            settings.max_audio_bytes,
            settings.max_audio_seconds,
            settings.min_audio_seconds,
        )
        samples, _ = await run_in_threadpool(
            preprocess_audio,
            samples,
            settings.audio_silence_threshold,
            settings.audio_frame_ms,
            settings.audio_max_gain,
        )
        duration = samples.size / TARGET_SR
        if duration < settings.min_audio_seconds:
            raise bad_input("AUDIO_TOO_SHORT", "The recording contains too little speech after silence trimming.")
        return samples, duration

    return app


async def _read_limited(upload: UploadFile, limit: int) -> bytes:
    data = await upload.read(limit + 1)
    if len(data) > limit:
        raise bad_input("FILE_TOO_LARGE", "The uploaded file is too large.")
    return data


app = create_app()

if __name__ == "__main__":
    import uvicorn

    s = get_settings()
    uvicorn.run("app.main:app", host=s.host, port=s.port, workers=1, log_level="info")
