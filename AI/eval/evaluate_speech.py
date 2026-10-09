"""Measure aggregate Whisper word error rate on local approved recordings."""
from __future__ import annotations

import argparse
import csv
import json
import os
import re
import unicodedata
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request, urlopen

EVAL_DIR = Path(__file__).resolve().parent
MANIFEST = EVAL_DIR / "speech-manifest.tsv"
RECORDINGS = EVAL_DIR / "recordings"


def normalize_words(text: str) -> list[str]:
    normalized = unicodedata.normalize("NFKD", text.casefold())
    normalized = "".join(char for char in normalized if not unicodedata.combining(char))
    return re.findall(r"[a-z0-9]+", normalized)


def word_errors(reference: str, hypothesis: str) -> tuple[int, int]:
    ref, hyp = normalize_words(reference), normalize_words(hypothesis)
    if not ref:
        raise ValueError("Speech references must contain at least one word.")
    previous = list(range(len(hyp) + 1))
    for ref_index, ref_word in enumerate(ref, start=1):
        current = [ref_index]
        for hyp_index, hyp_word in enumerate(hyp, start=1):
            current.append(
                min(
                    current[-1] + 1,
                    previous[hyp_index] + 1,
                    previous[hyp_index - 1] + (ref_word != hyp_word),
                )
            )
        previous = current
    return previous[-1], len(ref)


def validate_loopback_url(url: str) -> str:
    parsed = urlparse(url)
    if parsed.scheme != "http" or parsed.hostname not in ("127.0.0.1", "localhost", "::1"):
        raise ValueError("Evaluation is restricted to an HTTP loopback service.")
    if parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("The AI service URL must not contain credentials, query, or fragment.")
    return url.rstrip("/")


def load_manifest(path: Path, recordings_dir: Path) -> list[tuple[Path, str]]:
    items = []
    root = recordings_dir.resolve()
    with path.open(encoding="utf-8", newline="") as manifest:
        reader = csv.DictReader(manifest, delimiter="\t")
        if reader.fieldnames != ["file", "reference"]:
            raise ValueError("Manifest must have exactly the columns: file, reference.")
        for row in reader:
            relative = Path(row["file"])
            audio_path = (root / relative).resolve()
            if relative.is_absolute() or not audio_path.is_relative_to(root):
                raise ValueError("Manifest audio files must remain inside eval/recordings.")
            if not audio_path.is_file():
                raise ValueError(f"Recording file not found: {relative.name}")
            if not normalize_words(row["reference"]):
                raise ValueError("Speech references must contain at least one word.")
            items.append((audio_path, row["reference"]))
    if not items:
        raise ValueError("The speech manifest has no recordings.")
    return items


def transcribe(base_url: str, token: str, path: Path) -> str:
    boundary = "----MedisyncLocalEvaluationBoundary"
    content_type = "application/octet-stream"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="audio"; filename="{path.name}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8") + path.read_bytes() + f"\r\n--{boundary}--\r\n".encode("utf-8")
    request = Request(
        f"{base_url}/internal/audio/transcribe",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "X-Internal-Token": token,
        },
        method="POST",
    )
    try:
        with urlopen(request, timeout=180) as response:
            payload = json.loads(response.read())
    except HTTPError as exc:
        raise RuntimeError(f"AI service returned HTTP {exc.code}.") from None
    except (URLError, TimeoutError, ValueError) as exc:
        raise RuntimeError(f"AI service request failed ({type(exc).__name__}).") from None
    text = payload.get("text") if isinstance(payload, dict) else None
    if not isinstance(text, str):
        raise RuntimeError("AI service response did not contain a transcript.")
    return text


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.environ.get("AI_EVAL_BASE_URL", "http://127.0.0.1:8001"))
    parser.add_argument("--manifest", type=Path, default=MANIFEST)
    args = parser.parse_args()
    try:
        base_url = validate_loopback_url(args.base_url)
        token = os.environ.get("AI_INTERNAL_TOKEN", "")
        if not token:
            raise ValueError("Set AI_INTERNAL_TOKEN to the local AI service token.")
        items = load_manifest(args.manifest, RECORDINGS)
        total_errors = total_words = 0
        for path, reference in items:
            hypothesis = transcribe(base_url, token, path)
            errors, words = word_errors(reference, hypothesis)
            total_errors += errors
            total_words += words
    except (OSError, ValueError, RuntimeError) as exc:
        parser.error(str(exc))
    print(f"Aggregate WER: {total_errors}/{total_words} ({total_errors / total_words:.1%})")
    print(f"Recordings evaluated: {len(items)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
