"""Unit tests for model-output parsing and history normalization (no models loaded)."""
from app.schemas import ChatOutput, HistoryMessage, ImageOutput
from app.services.medgemma_service import extract_json, normalize_history, parse_output


def test_extract_json_from_fenced_block():
    raw = 'Sure!\n```json\n{"reply": "hi", "suggested_urgency": "routine"}\n```'
    assert extract_json(raw) == {"reply": "hi", "suggested_urgency": "routine"}


def test_extract_json_tolerates_trailing_commas():
    assert extract_json('{"a": [1, 2,],}') == {"a": [1, 2]}


def test_extract_json_returns_none_for_prose():
    assert extract_json("I think you have a cold.") is None


def test_parse_output_valid_and_coerces_values():
    raw = """{"reply": "ok", "suggested_urgency": "Emergent",
      "possible_explanations": [{"condition": "Migraine", "likelihood": "high"}, "Tension headache", {"x": 1}],
      "follow_up_questions": ["a", "b", "c", "d", "e"],
      "symptom_summary": {"reported_symptoms": "headache"}}"""
    out, valid = parse_output(raw, ChatOutput)
    assert valid
    assert out.suggested_urgency == "emergency"
    assert [p.condition for p in out.possible_explanations] == ["Migraine", "Tension headache"]
    assert out.possible_explanations[0].likelihood == "more_likely"
    assert len(out.follow_up_questions) == 3
    assert out.symptom_summary.reported_symptoms == ["headache"]


def test_parse_output_unknown_urgency_becomes_undetermined():
    out, valid = parse_output('{"reply": "x", "suggested_urgency": "whenever"}', ChatOutput)
    assert valid and out.suggested_urgency == "undetermined"


def test_parse_output_fallback_has_no_explanations():
    out, valid = parse_output("free text diagnosis: cancer", ImageOutput)
    assert not valid
    assert out.possible_explanations == []
    assert out.suggested_urgency == "urgent"
    assert out.care_advice


def test_normalize_history_alternates_and_starts_with_user():
    h = [HistoryMessage(role="assistant", content="hello"),
         HistoryMessage(role="user", content="a"), HistoryMessage(role="user", content="b"),
         HistoryMessage(role="assistant", content="c"), HistoryMessage(role="user", content="d")]
    turns = normalize_history(h, 10, 10_000)
    roles = [t["role"] for t in turns]
    assert roles[0] == "user"
    assert all(roles[i] != roles[i + 1] for i in range(len(roles) - 1))
    assert roles[-1] == "assistant"  # so the new user message keeps alternation
    assert turns[0]["text"] == "a\nb"


def test_normalize_history_respects_char_budget():
    h = [HistoryMessage(role="user" if i % 2 == 0 else "assistant", content="x" * 500) for i in range(10)]
    turns = normalize_history(h, 10, 1200)
    assert sum(len(t["text"]) for t in turns) <= 1200 + len("(acknowledged)")
