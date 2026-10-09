"""Run synthetic triage vignettes against the local AI service."""
from __future__ import annotations

import argparse
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

VIGNETTES = Path(__file__).with_name("vignettes.jsonl")
URGENCY_RANK = {
    "undetermined": 0,
    "self_care": 1,
    "routine": 2,
    "soon": 3,
    "urgent": 4,
    "emergency": 5,
}


def validate_loopback_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "http" or parsed.hostname not in ("127.0.0.1", "localhost", "::1"):
        raise ValueError("Evaluation is restricted to an HTTP loopback service.")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("The AI service URL must not contain credentials, query, or fragment.")
    return url.rstrip("/")


def is_under_triaged(expected: str, predicted: str) -> bool:
    if expected not in URGENCY_RANK or predicted not in URGENCY_RANK:
        raise ValueError("Vignette or model output contains an unknown urgency.")
    return URGENCY_RANK[predicted] < URGENCY_RANK[expected]


def load_vignettes(path: Path = VIGNETTES) -> list[dict]:
    cases = [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]
    if not cases:
        raise ValueError("The vignette dataset is empty.")
    for case in cases:
        if case.get("expected_urgency") not in URGENCY_RANK or not case.get("message"):
            raise ValueError("A vignette is missing a message or has an unknown target urgency.")
    return cases


def request_assessment(base_url: str, token: str, message: str) -> str:
    request = Request(
        f"{base_url}/internal/medical/chat",
        data=json.dumps({"message": message, "reply_language": "auto"}).encode("utf-8"),
        headers={"Content-Type": "application/json", "X-Internal-Token": token},
        method="POST",
    )
    try:
        with urlopen(request, timeout=240) as response:
            payload = json.loads(response.read())
    except HTTPError as exc:
        raise RuntimeError(f"AI service returned HTTP {exc.code}.") from None
    except (URLError, TimeoutError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"AI service request failed ({type(exc).__name__}).") from None
    try:
        return payload["result"]["suggested_urgency"]
    except (TypeError, KeyError) as exc:
        raise RuntimeError("AI service response did not contain a valid urgency.") from exc


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.environ.get("AI_EVAL_BASE_URL", "http://127.0.0.1:8001"))
    parser.add_argument("--dataset", type=Path, default=VIGNETTES)
    args = parser.parse_args()
    try:
        base_url = validate_loopback_url(args.base_url)
        token = os.environ.get("AI_INTERNAL_TOKEN", "")
        if not token:
            raise ValueError("Set AI_INTERNAL_TOKEN to the local AI service token.")
        cases = load_vignettes(args.dataset)
        results = [
            (case, request_assessment(base_url, token, case["message"]))
            for case in cases
        ]
    except (OSError, ValueError, RuntimeError) as exc:
        parser.error(str(exc))

    under_triaged = sum(is_under_triaged(case["expected_urgency"], predicted) for case, predicted in results)
    print(f"UNDER-TRIAGE RATE: {under_triaged}/{len(results)} ({under_triaged / len(results):.1%})")
    for level in sorted({case["expected_urgency"] for case, _ in results}, key=URGENCY_RANK.get, reverse=True):
        group = [(case, predicted) for case, predicted in results if case["expected_urgency"] == level]
        correct = sum(predicted == level for _, predicted in group)
        print(f"{level} exact-match accuracy: {correct}/{len(group)} ({correct / len(group):.1%})")
    correct = sum(case["expected_urgency"] == predicted for case, predicted in results)
    print(f"Overall exact-match accuracy: {correct}/{len(results)} ({correct / len(results):.1%})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
