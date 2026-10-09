"""Load versioned local-only prompt templates."""
from __future__ import annotations

from functools import lru_cache
from pathlib import Path

PROMPT_DIR = Path(__file__).resolve().parent / "resources" / "prompts"

_LANGUAGE_INSTRUCTIONS = {
    "en": "Write all patient-facing text in English.",
    "fil": "Write all patient-facing text in Filipino (Tagalog); common English medical terms are acceptable.",
    "auto": "Write patient-facing text in the same language the patient used (English, Filipino, or Taglish).",
}


@lru_cache(maxsize=8)
def _read_prompt(filename: str) -> str:
    if Path(filename).name != filename:
        raise ValueError("Prompt names must be local filenames.")
    path = PROMPT_DIR / filename
    text = path.read_text(encoding="utf-8").strip()
    if not text:
        raise ValueError(f"Prompt file is empty: {filename}")
    return text


def load_prompt(filename: str, language: str = "auto") -> str:
    try:
        instruction = _LANGUAGE_INSTRUCTIONS[language]
    except KeyError as exc:
        raise ValueError(f"Unsupported prompt language: {language}") from exc
    return _read_prompt(filename).replace("{{LANGUAGE_INSTRUCTION}}", instruction)


def retry_instruction() -> str:
    return (
        "Your previous output did not satisfy the required JSON schema. "
        "Return one complete, valid JSON object with every required key. "
        "Do not add prose or markdown. Do not lower urgency to avoid uncertainty."
    )