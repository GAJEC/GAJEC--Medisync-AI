"""Service errors with stable codes. Messages must never contain paths or tracebacks."""
from __future__ import annotations


class ServiceError(Exception):
    def __init__(self, status: int, code: str, message: str):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message


def bad_input(code: str, message: str) -> ServiceError:
    return ServiceError(422, code, message)


def not_ready(model: str, state: str) -> ServiceError:
    return ServiceError(503, "MODEL_NOT_READY", f"Model '{model}' is not available (state: {state}).")


def disabled(model: str) -> ServiceError:
    return ServiceError(503, "MODEL_DISABLED", f"Model '{model}' is disabled by configuration.")
