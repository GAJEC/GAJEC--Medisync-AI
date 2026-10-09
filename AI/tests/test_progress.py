"""Live progress reporting (app/progress.py) and GET /internal/progress/{request_id}."""
import os
import threading

os.environ["AI_INTERNAL_TOKEN"] = "test-token"
os.environ["AI_LOAD_ON_STARTUP"] = "false"

import torch  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app import progress  # noqa: E402
from app.config import get_settings  # noqa: E402

get_settings.cache_clear()

from app.main import create_app  # noqa: E402
from app.schemas import ChatOutput  # noqa: E402
from app.services.medgemma_service import MedGemmaService, _ProgressStreamer  # noqa: E402
from tests.test_api import H, FakeManager, FakeMedGemma  # noqa: E402


def test_current_section_tracks_last_opened_json_key():
    assert progress.current_section("") is None
    assert progress.current_section('{"reply": "Hello') == "reply"
    text = '{"reply": "Hi", "symptom_summary": {"reported_symptoms": ["x"]}, "follow_up_questions": ["When'
    assert progress.current_section(text) == "follow_up_questions"
    # Keys inside the patient's own words are not quoted JSON keys, so they do not count.
    assert progress.current_section('{"reply": "your care advice is') == "reply"


class FakeTokenizer:
    def __init__(self, pieces):
        self.pieces = pieces

    def decode(self, ids, skip_special_tokens=True):
        return "".join(self.pieces[i] for i in ids)


def test_streamer_skips_prompt_and_reports_tokens_and_section():
    pieces = ['{"reply"', ': "Rest', '", ', '"care_advice"', ': ["Drink', ' water"]', "}", "!"]
    tracker = progress.Tracker("r", "chat")
    streamer = _ProgressStreamer(FakeTokenizer(pieces), tracker)
    streamer.DECODE_EVERY = 1
    streamer.put(torch.tensor([[99, 98, 97]]))  # prompt
    assert tracker.stage == "preparing" and tracker.tokens == 0
    for i in range(len(pieces)):
        streamer.put(torch.tensor([i]))
    assert tracker.stage == "writing"
    assert tracker.tokens == len(pieces)
    assert tracker.section == "care_advice"


def test_generate_validated_reports_checking_and_retry_attempt(monkeypatch):
    service = object.__new__(MedGemmaService)
    outputs = iter([("not json", {"inference_seconds": 0.1}), ('{"reply": "ok"}', {"inference_seconds": 0.1})])
    stages = []

    def generate(messages):
        stages.append((progress.current().stage, progress.current().attempt))
        return next(outputs)

    monkeypatch.setattr(service, "_generate", generate)
    messages = [{"role": "system", "content": [{"type": "text", "text": "s"}]},
                {"role": "user", "content": [{"type": "text", "text": "m"}]}]
    tracker = progress.start("retry-req", "chat")
    with progress.bound(tracker):
        _, valid, _ = service._generate_validated(messages, ChatOutput, "en")
    assert valid
    # Second generation started after the first was checked and rejected.
    assert stages == [("preparing", 1), ("preparing", 2)]
    assert tracker.stage == "checking" and tracker.attempt == 2


def test_progress_is_not_recorded_without_a_bound_tracker():
    progress.current().set("writing", tokens=5)  # must not raise or leak
    assert progress.current() is progress.NOOP


class BlockingMedGemma(FakeMedGemma):
    """Pauses mid-request so the test can poll progress while it is in flight."""

    def __init__(self):
        self.started = threading.Event()
        self.release = threading.Event()

    def chat(self, req):
        progress.current().set("writing", tokens=42, max_tokens=700, section="reply")
        self.started.set()
        self.release.wait(5)
        return super().chat(req)


def test_progress_endpoint_reports_in_flight_and_done():
    fake = BlockingMedGemma()
    with TestClient(create_app(FakeManager(medgemma=fake))) as client:
        assert client.get("/internal/progress/nope", headers=H).status_code == 404
        assert client.get("/internal/progress/nope").status_code == 401

        result = {}
        t = threading.Thread(target=lambda: result.update(r=client.post(
            "/internal/medical/chat", headers={**H, "X-Request-ID": "req-123"}, json={"message": "headache"})))
        t.start()
        assert fake.started.wait(5)
        live = client.get("/internal/progress/req-123", headers=H).json()
        assert live["stage"] == "writing" and live["tokens"] == 42 and live["section"] == "reply"
        assert live["kind"] == "chat"
        fake.release.set()
        t.join(5)
        assert result["r"].status_code == 200
        assert client.get("/internal/progress/req-123", headers=H).json()["stage"] == "done"


def test_progress_marks_failed_requests():
    class Failing(FakeMedGemma):
        def chat(self, req):
            raise RuntimeError("boom")

    with TestClient(create_app(FakeManager(medgemma=Failing())), raise_server_exceptions=False) as client:
        r = client.post("/internal/medical/chat", headers={**H, "X-Request-ID": "req-fail"}, json={"message": "x"})
        assert r.status_code == 500
        assert client.get("/internal/progress/req-fail", headers=H).json()["stage"] == "failed"
