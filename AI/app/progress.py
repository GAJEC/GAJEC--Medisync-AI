"""Live progress of in-flight inference requests, keyed by request id.

The backend polls GET /internal/progress/{request_id} while a chat or image request runs, so the
patient sees what the model is actually doing instead of a timer-based guess.

Stages (in order; some are skipped):
  preparing  building the prompt; for photos also resizing / normalising the image
  queued     waiting for the GPU because another request holds the inference lock
  reading    prompt prefill (for photos this includes the vision encoder); ends at the first token
  writing    generating tokens; `section` is the JSON field the model is writing right now
  checking   parsing and validating the structured output
  done       the response is ready
`attempt` becomes 2 when the first output failed validation and the model is asked again.

Thread model: the tracker for the current request is bound to the worker thread that runs the
inference (see `bound`), so service code calls `current()` without needing extra parameters.
"""
from __future__ import annotations

import re
import threading
import time
from contextlib import contextmanager
from typing import Any

_TTL_SECONDS = 120  # keep finished entries briefly so the last poll still sees "done"
_MAX_ENTRIES = 256

_lock = threading.Lock()
_entries: dict[str, "Tracker"] = {}
_local = threading.local()

# JSON keys of ChatOutput / ImageOutput (app/schemas.py) that mark what the model is writing.
SECTION_KEYS = (
    "reply",
    "symptom_summary",
    "follow_up_questions",
    "possible_explanations",
    "suggested_urgency",
    "red_flags_identified",
    "recommended_specialties",
    "care_advice",
    "needs_more_information",
    "uncertainty_note",
    "image_quality",
    "visual_observations",
    "limitations",
)
_SECTION_RE = re.compile(r'"(' + "|".join(SECTION_KEYS) + r')"\s*:')


def current_section(generated_text: str) -> str | None:
    """Return the JSON field the model opened most recently in its output so far."""
    last = None
    for m in _SECTION_RE.finditer(generated_text):
        last = m.group(1)
    return last


class Tracker:
    def __init__(self, request_id: str, kind: str):
        self.request_id = request_id
        self.kind = kind
        self.stage = "preparing"
        self.attempt = 1
        self.tokens = 0
        self.max_tokens: int | None = None
        self.section: str | None = None
        self.started = time.monotonic()
        self.finished: float | None = None

    def set(self, stage: str | None = None, **fields: Any) -> None:
        with _lock:
            if stage is not None:
                self.stage = stage
            for key, value in fields.items():
                setattr(self, key, value)

    def snapshot(self) -> dict[str, Any]:
        with _lock:
            return {
                "stage": self.stage,
                "kind": self.kind,
                "attempt": self.attempt,
                "tokens": self.tokens,
                "max_tokens": self.max_tokens,
                "section": self.section,
                "elapsed_seconds": round((self.finished or time.monotonic()) - self.started, 1),
            }


class _NoopTracker(Tracker):
    """Used when no request is being tracked (tests, scripts); records nothing."""

    def __init__(self):
        super().__init__("", "")

    def set(self, stage: str | None = None, **fields: Any) -> None:  # noqa: D401
        return None


NOOP = _NoopTracker()


def _prune(now: float) -> None:
    expired = [k for k, t in _entries.items() if t.finished is not None and now - t.finished > _TTL_SECONDS]
    for key in expired:
        del _entries[key]
    if len(_entries) > _MAX_ENTRIES:
        for key in sorted(_entries, key=lambda k: _entries[k].started)[: len(_entries) - _MAX_ENTRIES]:
            del _entries[key]


def start(request_id: str, kind: str) -> Tracker:
    tracker = Tracker(request_id, kind)
    with _lock:
        _prune(time.monotonic())
        _entries[request_id] = tracker
    return tracker


def get(request_id: str) -> dict[str, Any] | None:
    with _lock:
        tracker = _entries.get(request_id)
    return tracker.snapshot() if tracker else None


def current() -> Tracker:
    return getattr(_local, "tracker", None) or NOOP


@contextmanager
def bound(tracker: Tracker):
    """Bind `tracker` to this thread for the duration of one inference call."""
    _local.tracker = tracker
    try:
        yield tracker
    finally:
        _local.tracker = None


def finish(tracker: Tracker, stage: str = "done") -> None:
    with _lock:
        tracker.stage = stage
        tracker.finished = time.monotonic()
