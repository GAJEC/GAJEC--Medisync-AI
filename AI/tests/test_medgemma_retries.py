from app.schemas import ChatOutput
from app.services.medgemma_service import MedGemmaService


def test_structured_generation_retries_once_then_validates(monkeypatch):
    service = object.__new__(MedGemmaService)
    outputs = iter([
        ("not json", {"inference_seconds": 0.1}),
        ('{"reply":"A cautious reply","suggested_urgency":"soon"}', {"inference_seconds": 0.2}),
    ])
    calls = []

    def generate(messages):
        calls.append(messages[0]["content"][0]["text"])
        return next(outputs)

    monkeypatch.setattr(service, "_generate", generate)
    messages = [{"role": "system", "content": [{"type": "text", "text": "system"}]},
                {"role": "user", "content": [{"type": "text", "text": "message"}]}]
    result, valid, meta = service._generate_validated(messages, ChatOutput, "en")
    assert valid
    assert len(calls) == 2
    assert "valid JSON" in calls[1]
    assert messages[0]["content"][0]["text"] == "system"
    assert meta["retry_count"] == 1
    assert result.reply == "A cautious reply"


def test_structured_generation_returns_conservative_fallback_after_retry(monkeypatch):
    service = object.__new__(MedGemmaService)
    calls = []

    def generate(messages):
        calls.append(messages)
        return "not json", {"inference_seconds": 0.1}

    monkeypatch.setattr(service, "_generate", generate)
    messages = [{"role": "system", "content": [{"type": "text", "text": "system"}]},
                {"role": "user", "content": [{"type": "text", "text": "message"}]}]
    result, valid, meta = service._generate_validated(messages, ChatOutput, "en")
    assert not valid
    assert len(calls) == 2
    assert result.suggested_urgency == "urgent"
    assert result.care_advice
    assert meta["retry_count"] == 1