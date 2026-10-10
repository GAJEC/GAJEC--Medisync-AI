from app.prompts import load_prompt, retry_instruction


def test_prompt_files_are_local_versioned_content():
    chat = load_prompt("chat-v1.txt", "en")
    image = load_prompt("image-v1.txt", "fil")
    assert "preliminary guidance, not a diagnosis" in chat
    assert "English" in chat
    assert "preliminary guidance, not a diagnosis" in image
    assert "Filipino (Tagalog)" in image
    assert "{{LANGUAGE_INSTRUCTION}}" not in chat + image
    assert "You are Syncia" in chat and "MediSync AI" in chat
    assert "You are Syncia" in image and "MediSync AI" in image
    assert '"options"' in chat and '"options"' in image


def test_prompt_loader_rejects_path_traversal():
    try:
        load_prompt("../red-flags.json")
    except ValueError as error:
        assert "local filenames" in str(error)
    else:
        raise AssertionError("Prompt loader must reject paths outside the prompt directory.")


def test_retry_instruction_requires_valid_json_without_lowering_urgency():
    instruction = retry_instruction()
    assert "valid JSON" in instruction
    assert "Do not lower urgency" in instruction