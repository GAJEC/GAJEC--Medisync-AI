from app.safety import detect_red_flags, emergency_response
from app.schemas import ChatRequest, ImageContext
from app.services.medgemma_service import MedGemmaService


def test_detects_active_english_emergency():
    findings = detect_red_flags("I have severe chest pain and pressure right now.")
    assert [item["id"] for item in findings] == ["chest_pain"]


def test_detects_active_filipino_and_taglish_emergencies():
    breathing = detect_red_flags("Hindi ako makahinga ngayon.")
    suicidal = detect_red_flags("Gusto kong magpakamatay.")
    assert [item["id"] for item in breathing] == ["breathing_difficulty"]
    assert [item["id"] for item in suicidal] == ["suicidal_thoughts_or_self_harm"]


def test_ignores_clearly_negated_and_past_mention():
    assert detect_red_flags("I do not have chest pain.") == []
    assert detect_red_flags("I had chest pain last year, but not now.") == []
    assert detect_red_flags("Wala akong sakit sa dibdib.") == []


def test_history_only_checks_user_messages():
    findings = detect_red_flags(
        "I have a mild headache.",
        [
            {"role": "assistant", "content": "You mentioned chest pain."},
            {"role": "user", "content": "Hindi ako makahinga."},
        ],
    )
    assert {item["id"] for item in findings} == {"breathing_difficulty"}


def test_current_symptom_after_past_mention_triggers():
    findings = detect_red_flags("I had chest pain last year, but I have it again now.")
    assert [item["id"] for item in findings] == ["chest_pain"]


def test_emergency_response_is_structured_and_localized():
    findings = detect_red_flags("Masakit ang dibdib ko.")
    response = emergency_response(findings, "auto")
    assert response["output_valid"] is True
    assert response["result"]["suggested_urgency"] == "emergency"
    assert response["result"]["red_flags_identified"] == ["Pananakit o paninikip ng dibdib"]
    assert response["meta"]["rule_ids"] == ["chest_pain"]


def test_medgemma_chat_red_flag_overrides_model(monkeypatch):
    service = object.__new__(MedGemmaService)
    monkeypatch.setattr(service, "_generate", lambda *_: (_ for _ in ()).throw(AssertionError("model called")))
    response = service.chat(ChatRequest(message="I can't breathe."))
    assert response["result"]["suggested_urgency"] == "emergency"
    assert response["meta"]["model"] == "red-flag-rules-v1"


def test_medgemma_image_description_red_flag_overrides_model(monkeypatch):
    service = object.__new__(MedGemmaService)
    monkeypatch.setattr(service, "_generate", lambda *_: (_ for _ in ()).throw(AssertionError("model called")))
    response = service.analyze_image(None, ImageContext(description="Matinding pagdurugo."))
    assert response["result"]["suggested_urgency"] == "emergency"
    assert response["result"]["image_quality"] == "limited"