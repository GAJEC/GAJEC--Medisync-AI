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
    assert [q.question for q in out.follow_up_questions] == ["a", "b", "c"]
    assert all(q.options == [] for q in out.follow_up_questions)
    assert out.symptom_summary.reported_symptoms == ["headache"]


def test_parse_output_follow_up_options():
    raw = """{"reply": "ok", "follow_up_questions": [
        {"question": "How long have you had it?", "options": ["Today", "1-3 days", "1-3 days", "Over a week", ""]},
        {"question": "Describe the pain.", "options": []},
        {"question": "Any fever?", "options": ["Yes"]},
        {"text": "Severity?", "choices": ["Mild", "Moderate", "Severe", "a", "b", "c", "d"]},
        {"options": ["x", "y"]}
    ]}"""
    out, valid = parse_output(raw, ChatOutput)
    assert valid
    qs = out.follow_up_questions
    assert [q.question for q in qs] == ["How long have you had it?", "Describe the pain.", "Any fever?"]
    assert qs[0].options == ["Today", "1-3 days", "Over a week"]  # deduplicated, blanks dropped
    assert qs[1].options == []  # open-ended
    assert qs[2].options == []  # a single option is not a choice


def test_parse_output_follow_up_option_aliases_and_cap():
    raw = '{"reply": "ok", "follow_up_questions": [{"text": "Severity?", "choices": [1,2,3,4,5,6,7,8,9,10,11,12]}]}'
    out, _ = parse_output(raw, ChatOutput)
    assert out.follow_up_questions[0].question == "Severity?"
    # Numbers become strings; a 1-10 scale fits, anything beyond 10 options is dropped.
    assert out.follow_up_questions[0].options == [str(n) for n in range(1, 11)]


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
