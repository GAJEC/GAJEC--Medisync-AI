from pathlib import Path

import pytest

from eval.evaluate_speech import load_manifest, word_errors
from eval.evaluate_triage import is_under_triaged, load_vignettes, validate_loopback_url


def test_under_triage_is_strictly_lower_urgency():
    assert is_under_triaged("urgent", "routine")
    assert is_under_triaged("urgent", "undetermined")
    assert not is_under_triaged("routine", "urgent")
    assert not is_under_triaged("urgent", "urgent")


def test_loopback_url_rejects_remote_hosts():
    assert validate_loopback_url("http://127.0.0.1:8001/") == "http://127.0.0.1:8001"
    with pytest.raises(ValueError):
        validate_loopback_url("https://example.invalid")
    with pytest.raises(ValueError):
        validate_loopback_url("http://example.invalid")


def test_vignettes_include_required_categories_and_languages():
    cases = load_vignettes()
    assert {"emergency", "urgent", "routine", "ambiguous"} <= {case["category"] for case in cases}
    assert {"en", "fil", "taglish"} <= {case["language"] for case in cases}


def test_word_error_rate_counts_substitution_deletion_and_insertion():
    assert word_errors("One two three", "One too three extra") == (2, 3)


def test_empty_reference_is_rejected():
    with pytest.raises(ValueError):
        word_errors("  ", "transcript")


def test_speech_manifest_rejects_paths_outside_recordings(tmp_path: Path):
    recordings = tmp_path / "recordings"
    recordings.mkdir()
    outside = tmp_path / "private.wav"
    outside.write_bytes(b"placeholder")
    manifest = tmp_path / "manifest.tsv"
    manifest.write_text("file\treference\n../private.wav\thello\n", encoding="utf-8")
    with pytest.raises(ValueError, match="inside eval/recordings"):
        load_manifest(manifest, recordings)
