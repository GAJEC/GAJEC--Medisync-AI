"""API tests with fake models (no weights loaded)."""
import io
import math
import os
import struct
import wave

os.environ["AI_INTERNAL_TOKEN"] = "test-token"
os.environ["AI_LOAD_ON_STARTUP"] = "false"

import pytest
from fastapi.testclient import TestClient

from app.config import get_settings

get_settings.cache_clear()

from app.errors import ServiceError  # noqa: E402
from app.main import create_app  # noqa: E402
from app.model_manager import ModelSlot  # noqa: E402

H = {"X-Internal-Token": "test-token"}


class FakeMedGemma:
    device_name = "cpu"

    def chat(self, req):
        return {"result": {"reply": f"echo:{req.message}"}, "output_valid": True, "meta": {}}

    def analyze_image(self, img, ctx):
        return {"result": {"reply": f"{img.width}x{img.height}"}, "output_valid": True, "meta": {}}


class FakeWhisper:
    device_name = "cpu"

    def transcribe(self, samples, duration, language):
        return {"text": "hello", "duration_seconds": round(duration, 1), "requested_language": language}


class OomMedGemma(FakeMedGemma):
    def chat(self, req):
        raise ServiceError(503, "GPU_OUT_OF_MEMORY", "The GPU ran out of memory for this request.")


class FakeManager:
    lazy = False

    def __init__(self, medgemma=None, meralion_enabled=False):
        self.slots = {
            "medgemma": ModelSlot("medgemma", True, lambda: medgemma or FakeMedGemma()),
            "whisper": ModelSlot("whisper", True, FakeWhisper),
            "meralion": ModelSlot("meralion", meralion_enabled, lambda: None),
        }
        for s in self.slots.values():
            s.load()

    def get(self, key):
        return self.slots[key].get(False)

    def status(self):
        return {"gpu": {"available": False}, "models": {k: s.status() for k, s in self.slots.items()}}


@pytest.fixture
def client():
    with TestClient(create_app(FakeManager())) as c:
        yield c


def wav_bytes(seconds=1.0, sr=16000, freq=440.0):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(sr)
        n = int(seconds * sr)
        w.writeframes(b"".join(struct.pack("<h", int(8000 * math.sin(2 * math.pi * freq * i / sr))) for i in range(n)))
    return buf.getvalue()


def png_bytes(size=(64, 48)):
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", size, (200, 100, 100)).save(buf, format="PNG")
    return buf.getvalue()


def test_health_is_public(client):
    assert client.get("/internal/health").json() == {"status": "ok"}


def test_readiness_requires_token(client):
    r = client.get("/internal/ready")
    assert r.status_code == 401 and r.json()["error"]["code"] == "UNAUTHORIZED"


def test_readiness_ignores_disabled_optional_model(client):
    r = client.get("/internal/ready", headers=H)
    assert r.status_code == 200 and r.json() == {"status": "ready"}


def test_readiness_reports_enabled_model_not_ready(client):
    client.app.state.models.slots["medgemma"].state = "failed"
    r = client.get("/internal/ready", headers=H)
    assert r.status_code == 503
    assert r.json() == {"status": "not_ready", "models": {"medgemma": "failed"}}


def test_token_required(client):
    r = client.post("/internal/medical/chat", json={"message": "hi"})
    assert r.status_code == 401 and r.json()["error"]["code"] == "UNAUTHORIZED"
    r = client.post("/internal/medical/chat", json={"message": "hi"}, headers={"X-Internal-Token": "wrong"})
    assert r.status_code == 401


def test_status_reports_models(client):
    body = client.get("/internal/models/status", headers=H).json()
    assert body["models"]["medgemma"]["state"] == "ready"
    assert body["models"]["meralion"]["state"] == "disabled"


def test_chat(client):
    r = client.post("/internal/medical/chat", json={"message": "headache"}, headers=H)
    assert r.status_code == 200 and r.json()["result"]["reply"] == "echo:headache"


def test_chat_schema_validation(client):
    r = client.post("/internal/medical/chat", json={"message": ""}, headers=H)
    assert r.status_code == 422 and r.json()["error"]["code"] == "INVALID_REQUEST"


def test_image_ok(client):
    r = client.post("/internal/medical/analyze-image", headers=H,
                    files={"image": ("a.png", png_bytes(), "image/png")}, data={"context": '{"description": "rash"}'})
    assert r.status_code == 200, r.text
    assert r.json()["result"]["reply"] == "64x48"


def test_image_corrupt(client):
    r = client.post("/internal/medical/analyze-image", headers=H,
                    files={"image": ("a.png", b"\x89PNG\r\n\x1a\nnot really", "image/png")})
    assert r.status_code == 422 and r.json()["error"]["code"] == "CORRUPT_IMAGE"


def test_image_wrong_format(client):
    from PIL import Image

    buf = io.BytesIO()
    Image.new("RGB", (64, 64)).save(buf, format="BMP")
    r = client.post("/internal/medical/analyze-image", headers=H, files={"image": ("a.bmp", buf.getvalue(), "image/bmp")})
    assert r.status_code == 422 and r.json()["error"]["code"] == "UNSUPPORTED_IMAGE"


def test_image_bad_context(client):
    r = client.post("/internal/medical/analyze-image", headers=H,
                    files={"image": ("a.png", png_bytes(), "image/png")}, data={"context": "{not json"})
    assert r.status_code == 422 and r.json()["error"]["code"] == "INVALID_CONTEXT"


def test_transcribe_ok(client):
    r = client.post("/internal/audio/transcribe", headers=H, files={"audio": ("a.wav", wav_bytes(2.0), "audio/wav")},
                    data={"language": "fil"})
    assert r.status_code == 200, r.text
    assert r.json() == {"text": "hello", "duration_seconds": 2.0, "requested_language": "fil"}


def test_transcribe_empty_and_corrupt(client):
    r = client.post("/internal/audio/transcribe", headers=H, files={"audio": ("a.wav", b"", "audio/wav")})
    assert r.json()["error"]["code"] == "EMPTY_FILE"
    r = client.post("/internal/audio/transcribe", headers=H, files={"audio": ("a.wav", b"RIFF1234garbage" * 20, "audio/wav")})
    assert r.status_code == 422 and r.json()["error"]["code"] == "CORRUPT_AUDIO"


def test_transcribe_too_short_and_too_long(client, monkeypatch):
    r = client.post("/internal/audio/transcribe", headers=H, files={"audio": ("a.wav", wav_bytes(0.2), "audio/wav")})
    assert r.json()["error"]["code"] == "AUDIO_TOO_SHORT"
    monkeypatch.setattr(get_settings(), "max_audio_seconds", 1.0)
    r = client.post("/internal/audio/transcribe", headers=H, files={"audio": ("a.wav", wav_bytes(3.0), "audio/wav")})
    assert r.json()["error"]["code"] == "AUDIO_TOO_LONG"


def test_transcribe_invalid_language(client):
    r = client.post("/internal/audio/transcribe", headers=H, files={"audio": ("a.wav", wav_bytes(1.0), "audio/wav")},
                    data={"language": "de"})
    assert r.json()["error"]["code"] == "INVALID_LANGUAGE"


def test_meralion_disabled_returns_503(client):
    r = client.post("/internal/audio/analyze", headers=H, files={"audio": ("a.wav", wav_bytes(1.0), "audio/wav")})
    assert r.status_code == 503 and r.json()["error"]["code"] == "MODEL_DISABLED"


def test_oom_is_reported_not_crashing():
    with TestClient(create_app(FakeManager(medgemma=OomMedGemma()))) as c:
        r = c.post("/internal/medical/chat", json={"message": "x"}, headers=H)
        assert r.status_code == 503 and r.json()["error"]["code"] == "GPU_OUT_OF_MEMORY"
        assert c.get("/internal/health").status_code == 200


def test_failed_model_load_reported():
    slot = ModelSlot("medgemma", True, lambda: (_ for _ in ()).throw(FileNotFoundError("weights missing")))
    slot.load()
    assert slot.state == "failed" and "weights missing" in slot.error
    with pytest.raises(ServiceError) as e:
        slot.get(False)
    assert e.value.code == "MODEL_NOT_READY"
