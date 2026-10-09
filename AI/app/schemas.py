"""Pydantic request/response schemas for the internal AI API.

Model-generated JSON is parsed into the *Output models below. Validation is
lenient on shape (lists are truncated, unknown enum values are coerced to
"undetermined") but strict on types, so the backend always receives a stable
structure.
"""
from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field, field_validator

Urgency = Literal["emergency", "urgent", "soon", "routine", "self_care", "undetermined"]
URGENCY_VALUES = ("emergency", "urgent", "soon", "routine", "self_care", "undetermined")
Likelihood = Literal["more_likely", "possible", "less_likely"]

MAX_STR = 600
MAX_LIST = 6


def _clip(s: Any, n: int = MAX_STR) -> str:
    s = "" if s is None else str(s)
    s = " ".join(s.split())
    return s[:n]


def _clip_list(v: Any, n_items: int = MAX_LIST, n_chars: int = MAX_STR) -> list[str]:
    if v is None:
        return []
    if isinstance(v, str):
        v = [v]
    if not isinstance(v, list):
        return []
    out = [_clip(x, n_chars) for x in v if x not in (None, "") and not isinstance(x, (dict, list))]
    return [x for x in out if x][:n_items]


# ---------------------------------------------------------------- requests
class HistoryMessage(BaseModel):
    role: Literal["user", "assistant"]
    content: str = Field(..., max_length=8000)


class PatientContext(BaseModel):
    age_years: int | None = Field(None, ge=0, le=120)
    sex: Literal["female", "male", "other", "unspecified"] | None = None
    known_conditions: list[str] = Field(default_factory=list, max_length=20)


class ChatRequest(BaseModel):
    message: str = Field(..., min_length=1, max_length=8000)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=60)
    patient_context: PatientContext | None = None
    reply_language: Literal["en", "fil", "auto"] = "auto"


class ImageContext(BaseModel):
    description: str = Field("", max_length=4000)
    body_location: str = Field("", max_length=200)
    history: list[HistoryMessage] = Field(default_factory=list, max_length=60)
    patient_context: PatientContext | None = None
    reply_language: Literal["en", "fil", "auto"] = "auto"


# ---------------------------------------------------------- model outputs
class PossibleExplanation(BaseModel):
    condition: str
    likelihood: Likelihood = "possible"
    rationale: str = ""

    @field_validator("condition", "rationale", mode="before")
    @classmethod
    def _s(cls, v):
        return _clip(v, 300)

    @field_validator("likelihood", mode="before")
    @classmethod
    def _l(cls, v):
        v = str(v or "").strip().lower().replace(" ", "_").replace("-", "_")
        mapping = {"high": "more_likely", "likely": "more_likely", "more_likely": "more_likely",
                   "moderate": "possible", "medium": "possible", "possible": "possible",
                   "low": "less_likely", "unlikely": "less_likely", "less_likely": "less_likely"}
        return mapping.get(v, "possible")


def _urgency(v: Any) -> str:
    v = str(v or "").strip().lower().replace(" ", "_").replace("-", "_")
    aliases = {"self": "self_care", "selfcare": "self_care", "home_care": "self_care", "non_urgent": "routine",
               "emergent": "emergency", "er": "emergency", "unknown": "undetermined"}
    v = aliases.get(v, v)
    return v if v in URGENCY_VALUES else "undetermined"


class SymptomSummary(BaseModel):
    reported_symptoms: list[str] = Field(default_factory=list)
    duration: str | None = None
    relevant_history: list[str] = Field(default_factory=list)

    @field_validator("reported_symptoms", "relevant_history", mode="before")
    @classmethod
    def _l(cls, v):
        return _clip_list(v, 12, 200)

    @field_validator("duration", mode="before")
    @classmethod
    def _d(cls, v):
        return _clip(v, 120) or None


class _CommonOutput(BaseModel):
    reply: str = ""
    follow_up_questions: list[str] = Field(default_factory=list)
    possible_explanations: list[PossibleExplanation] = Field(default_factory=list)
    suggested_urgency: Urgency = "undetermined"
    red_flags_identified: list[str] = Field(default_factory=list)
    recommended_specialties: list[str] = Field(default_factory=list)
    care_advice: list[str] = Field(default_factory=list)
    uncertainty_note: str = ""

    @field_validator("reply", mode="before")
    @classmethod
    def _r(cls, v):
        return _clip(v, 2000)

    @field_validator("uncertainty_note", mode="before")
    @classmethod
    def _u(cls, v):
        return _clip(v, 600)

    @field_validator("follow_up_questions", mode="before")
    @classmethod
    def _q(cls, v):
        return _clip_list(v, 3, 300)

    @field_validator("red_flags_identified", "recommended_specialties", "care_advice", mode="before")
    @classmethod
    def _lists(cls, v):
        return _clip_list(v, MAX_LIST, 300)

    @field_validator("possible_explanations", mode="before")
    @classmethod
    def _pe(cls, v):
        if not isinstance(v, list):
            return []
        out = []
        for item in v[:5]:
            if isinstance(item, str):
                item = {"condition": item}
            if isinstance(item, dict) and item.get("condition"):
                out.append(item)
        return out

    @field_validator("suggested_urgency", mode="before")
    @classmethod
    def _urg(cls, v):
        return _urgency(v)


class ChatOutput(_CommonOutput):
    symptom_summary: SymptomSummary = Field(default_factory=SymptomSummary)
    needs_more_information: bool = True


class ImageOutput(_CommonOutput):
    image_quality: Literal["adequate", "limited", "unusable"] = "limited"
    visual_observations: list[str] = Field(default_factory=list)
    limitations: str = ""

    @field_validator("image_quality", mode="before")
    @classmethod
    def _q(cls, v):
        v = str(v or "").strip().lower()
        return v if v in ("adequate", "limited", "unusable") else "limited"

    @field_validator("visual_observations", mode="before")
    @classmethod
    def _vo(cls, v):
        return _clip_list(v, 8, 300)

    @field_validator("limitations", mode="before")
    @classmethod
    def _lim(cls, v):
        return _clip(v, 600)


class TranscriptionOutput(BaseModel):
    text: str
    language: str | None
    language_probability: float | None
    requested_language: str
    duration_seconds: float
    chunks: int
    warnings: list[str] = Field(default_factory=list)


class EmotionScore(BaseModel):
    label: str
    score: float


class VoiceAnalysisOutput(BaseModel):
    top_label: str
    top_score: float
    low_confidence: bool
    scores: list[EmotionScore]
    dimensions: dict[str, float]
    analyzed_seconds: float
    duration_seconds: float
    warnings: list[str] = Field(default_factory=list)
    experimental: bool = True
