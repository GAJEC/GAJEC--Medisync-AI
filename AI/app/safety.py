"""Deterministic emergency phrase checks; rules require clinical review."""
from __future__ import annotations

import json
import re
from functools import lru_cache
from pathlib import Path
from typing import Any

RULES_PATH = Path(__file__).resolve().parent / "resources" / "red-flags.json"

_NEGATED = re.compile(
    r"(?:\bno\b|\bnot\b|\bnever\b|\bwithout\b|\bden(?:y|ies|ied)\b|"
    r"\bdon't\b|\bdo not\b|\bdoesn't\b|\bdoes not\b|\bdidn't\b|\bdid not\b|"
    r"\bhaven't\b|\bhasn't\b|\bisn't\b|\baren't\b|\bwasn't\b|\bweren't\b|"
    r"\bwala\b|\bwalang\b|\bhindi\b|\bdi\b)"
    r"(?:\s+[\w'-]+){0,5}\s*$",
    re.IGNORECASE,
)
_PAST = re.compile(
    r"(?:\bused to\b|\bpreviously\b|\bhistory of\b|\bhad\b|\bwas\b|\bwere\b|"
    r"\blast (?:week|month|year|night|time)\b|\byesterday\b|\bago\b|"
    r"\bdati\b|\bnoong nakaraan\b|\bnakaraan\b)"
    r"(?:\s+[\w'-]+){0,5}\s*$",
    re.IGNORECASE,
)
_CURRENT = re.compile(r"\b(?:now|currently|right now|today|ngayon|sa ngayon)\b", re.IGNORECASE)
_NEGATED_CURRENT = re.compile(
    r"\b(?:not|no longer|without|don't|do not|doesn't|does not|never|hindi|di|wala)\b"
    r".{0,32}\b(?:now|currently|today|ngayon|sa ngayon)\b",
    re.IGNORECASE,
)
_CLAUSE_BOUNDARY = re.compile(r"[.!?;,\n]")


@lru_cache(maxsize=1)
def _load_rules() -> tuple[dict[str, Any], ...]:
    data = json.loads(RULES_PATH.read_text(encoding="utf-8"))
    if not isinstance(data, dict) or data.get("version") != 1 or not isinstance(data.get("rules"), list):
        raise ValueError("Red-flag rules file has an unsupported format.")
    rules = []
    for item in data["rules"]:
        if not isinstance(item, dict) or not item.get("id") or not isinstance(item.get("patterns"), dict):
            raise ValueError("Red-flag rule is missing its id or language patterns.")
        compiled = {}
        for language, patterns in item["patterns"].items():
            if language not in ("en", "fil") or not isinstance(patterns, list):
                raise ValueError("Red-flag rule contains an unsupported language pattern set.")
            compiled[language] = tuple(re.compile(pattern, re.IGNORECASE) for pattern in patterns)
        rules.append({**item, "_compiled": compiled})
    return tuple(rules)


def _is_currently_reported(text: str, start: int, end: int) -> bool:
    clause_start_match = list(_CLAUSE_BOUNDARY.finditer(text, 0, start))
    clause_start = clause_start_match[-1].end() if clause_start_match else 0
    before = text[clause_start:start]
    after = text[end : min(len(text), end + 64)]

    if _NEGATED.search(before):
        return False
    if _PAST.search(before):
        if not _CURRENT.search(after) or _NEGATED_CURRENT.search(after):
            return False
    return True


def detect_red_flags(
    message: str,
    history: list[Any] | None = None,
) -> list[dict[str, str]]:
    """Return active red-flag rule IDs and localized labels, never matched text."""
    texts = [message]
    for item in history or []:
        role = item.role if hasattr(item, "role") else item.get("role") if isinstance(item, dict) else None
        content = item.content if hasattr(item, "content") else item.get("content") if isinstance(item, dict) else None
        if role == "user" and isinstance(content, str):
            texts.append(content)

    findings: dict[str, dict[str, str]] = {}
    for text in texts:
        for rule in _load_rules():
            if rule["id"] in findings:
                continue
            for language, patterns in rule["_compiled"].items():
                if any(
                    _is_currently_reported(text, match.start(), match.end())
                    for pattern in patterns
                    for match in pattern.finditer(text)
                ):
                    findings[rule["id"]] = {
                        "id": rule["id"],
                        "label_en": rule["label_en"],
                        "label_fil": rule["label_fil"],
                        "language": language,
                    }
                    break
    return list(findings.values())


def emergency_response(
    findings: list[dict[str, str]],
    language: str = "auto",
    output_model: type | None = None,
) -> dict[str, Any]:
    """Build a validated conservative emergency response without invoking a model."""
    from .schemas import ChatOutput

    output_model = output_model or ChatOutput

    use_filipino = language == "fil" or (language == "auto" and any(x["language"] == "fil" for x in findings))
    labels = [finding["label_fil" if use_filipino else "label_en"] for finding in findings]
    if use_filipino:
        reply = (
            "Maaaring may emergency na sintomas na kailangan ng agarang tulong. "
            "Tumawag sa lokal na serbisyong pang-emergency o pumunta agad sa pinakamalapit na emergency department; "
            "huwag magmaneho mag-isa kung hindi ligtas."
        )
        uncertainty = "Paunang gabay lamang ito; hindi ito diagnosis."
        advice = ["Humingi agad ng emergency medical care ngayon."]
    else:
        reply = (
            "You described a symptom that may need emergency care. Contact your local emergency services "
            "or go to the nearest emergency department now; do not drive yourself if it is unsafe."
        )
        uncertainty = "This is preliminary guidance and is not a diagnosis."
        advice = ["Seek emergency medical care now."]
    result = output_model(
        reply=reply,
        suggested_urgency="emergency",
        red_flags_identified=labels,
        care_advice=advice,
        follow_up_questions=[],
        possible_explanations=[],
        uncertainty_note=uncertainty,
        needs_more_information=False,
    )
    return {
        "result": result.model_dump(),
        "output_valid": True,
        "meta": {"model": "red-flag-rules-v1", "rule_ids": [x["id"] for x in findings]},
    }
