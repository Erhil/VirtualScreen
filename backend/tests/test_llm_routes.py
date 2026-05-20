from pathlib import Path
from typing import Any

import pytest
from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from app.core.config import get_settings
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_cached_settings() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def make_client(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
    *,
    base_url: str | None = None,
    model: str | None = None,
    api_key: str | None = None,
    token: str | None = None,
) -> TestClient:
    world = tmp_path / "world"
    world.mkdir(parents=True, exist_ok=True)
    (world / "README.md").write_text("# Home", encoding="utf-8")
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(world))
    for key in (
        "VIRTUALSCREEN_LLM_BASE_URL",
        "VIRTUALSCREEN_LLM_MODEL",
        "VIRTUALSCREEN_LLM_API_KEY",
        "VIRTUALSCREEN_LLM_TIMEOUT_SECONDS",
        "VIRTUALSCREEN_LLM_MAX_INPUT_CHARS",
        "VIRTUALSCREEN_LLM_MAX_OUTPUT_TOKENS",
        "VIRTUALSCREEN_LLM_TEMPERATURE",
    ):
        monkeypatch.delenv(key, raising=False)
    if base_url is not None:
        monkeypatch.setenv("VIRTUALSCREEN_LLM_BASE_URL", base_url)
    if model is not None:
        monkeypatch.setenv("VIRTUALSCREEN_LLM_MODEL", model)
    if api_key is not None:
        monkeypatch.setenv("VIRTUALSCREEN_LLM_API_KEY", api_key)
    if token is None:
        monkeypatch.delenv("VIRTUALSCREEN_ACCESS_TOKEN", raising=False)
    else:
        monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", token)
    get_settings.cache_clear()
    return TestClient(create_app())


def test_llm_config_is_disabled_without_env(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    client = make_client(tmp_path, monkeypatch)

    response = client.get("/api/llm/config")

    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is False
    assert body["configured"] is False
    assert body["provider"] is None
    assert body["base_url"] == ""
    assert body["model"] is None
    assert body["max_input_chars"] == 12000
    assert body["max_output_tokens"] == 800
    assert body["temperature"] == 0.7
    assert body["timeout_seconds"] == 90.0


def test_llm_config_reports_enabled_without_exposing_api_key(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    client = make_client(
        tmp_path,
        monkeypatch,
        base_url="http://127.0.0.1:11434/v1",
        model="huihui_ai/qwen3.5-abliterated:4b",
        api_key="secret-key",
    )

    response = client.get("/api/llm/config")

    assert response.status_code == 200
    body = response.json()
    assert body["enabled"] is True
    assert body["configured"] is True
    assert body["provider"] == "openai-compatible"
    assert body["base_url"] == "http://127.0.0.1:11434/v1"
    assert body["model"] == "huihui_ai/qwen3.5-abliterated:4b"
    assert "secret-key" not in response.text


def test_llm_generate_rejects_disabled_provider(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    client = make_client(tmp_path, monkeypatch)

    response = client.post("/api/llm/generate", json={"prompt": "Summarize this."})

    assert response.status_code == 400
    assert response.json() == {"detail": "LLM provider is not configured."}


def test_llm_generate_rejects_empty_or_oversized_prompt(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    client = make_client(
        tmp_path,
        monkeypatch,
        base_url="http://llm.local/v1",
        model="test-model",
    )
    monkeypatch.setenv("VIRTUALSCREEN_LLM_MAX_INPUT_CHARS", "10")
    get_settings.cache_clear()
    client = TestClient(create_app())

    assert client.post("/api/llm/generate", json={"prompt": "   "}).json() == {
        "detail": "Prompt is required."
    }
    assert client.post("/api/llm/generate", json={"prompt": "x" * 11}).json() == {
        "detail": "Prompt is too long."
    }


def test_llm_generate_posts_openai_compatible_payload(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    requests: list[dict[str, Any]] = []
    system_prompt = (
        "You are a careful tabletop RPG assistant. Respond with useful, concise draft material for "
        "the DM. Do not claim you read files or private context unless it was provided in the "
        "prompt."
    )

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, Any]:
            return {
                "choices": [{"message": {"content": "Draft answer."}}],
                "usage": {"prompt_tokens": 5, "completion_tokens": 2, "total_tokens": 7},
            }

    class FakeClient:
        def __init__(self, *, timeout: float) -> None:
            self.timeout = timeout

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(self, url: str, *, json: dict[str, Any], headers: dict[str, str]) -> FakeResponse:
            requests.append({"url": url, "json": json, "headers": headers, "timeout": self.timeout})
            return FakeResponse()

    monkeypatch.setattr("app.core.llm.httpx.Client", FakeClient)
    client = make_client(
        tmp_path,
        monkeypatch,
        base_url="http://llm.local/v1/",
        model="test-model",
        api_key="",
    )

    response = client.post("/api/llm/generate", json={"prompt": "Summarize this."})

    assert response.status_code == 200
    body = response.json()
    assert body["text"] == "Draft answer."
    assert body["model"] == "test-model"
    assert body["provider"] == "openai-compatible"
    assert body["usage"] == {"prompt_tokens": 5, "completion_tokens": 2, "total_tokens": 7}
    assert requests == [
        {
            "url": "http://llm.local/v1/chat/completions",
            "json": {
                "model": "test-model",
                "messages": [
                    {
                        "role": "system",
                        "content": system_prompt,
                    },
                    {"role": "user", "content": "Summarize this."},
                ],
                "temperature": 0.7,
                "max_tokens": 800,
                "n": 1,
                "stream": False,
            },
            "headers": {"Content-Type": "application/json"},
            "timeout": 90.0,
        }
    ]


def test_llm_generate_retries_ollama_reasoning_only_response(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    requests: list[dict[str, Any]] = []

    class FakeResponse:
        def __init__(self, payload: dict[str, Any]) -> None:
            self.payload = payload

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, Any]:
            return self.payload

    class FakeClient:
        def __init__(self, *, timeout: float) -> None:
            self.timeout = timeout

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(self, url: str, *, json: dict[str, Any], headers: dict[str, str]) -> FakeResponse:
            requests.append({"url": url, "json": json, "headers": headers, "timeout": self.timeout})
            if url.endswith("/v1/chat/completions"):
                return FakeResponse(
                    {
                        "system_fingerprint": "fp_ollama",
                        "choices": [
                            {
                                "finish_reason": "length",
                                "message": {
                                    "role": "assistant",
                                    "content": "",
                                    "reasoning": "private reasoning must not be returned",
                                },
                            }
                        ],
                    }
                )
            return FakeResponse(
                {
                    "message": {
                        "role": "assistant",
                        "content": "Final tavern rumor.",
                    },
                    "prompt_eval_count": 10,
                    "eval_count": 4,
                }
            )

    monkeypatch.setattr("app.core.llm.httpx.Client", FakeClient)
    client = make_client(
        tmp_path,
        monkeypatch,
        base_url="http://127.0.0.1:11434/v1",
        model="huihui_ai/qwen3.5-abliterated:4b",
    )

    response = client.post("/api/llm/generate", json={"prompt": "Write a rumor."})

    assert response.status_code == 200
    body = response.json()
    assert body["text"] == "Final tavern rumor."
    assert "private reasoning" not in response.text
    assert [request["url"] for request in requests] == [
        "http://127.0.0.1:11434/v1/chat/completions",
        "http://127.0.0.1:11434/api/chat",
    ]
    assert requests[1]["json"] == {
        "model": "huihui_ai/qwen3.5-abliterated:4b",
        "messages": requests[0]["json"]["messages"],
        "stream": False,
        "think": False,
        "options": {"num_predict": 800, "temperature": 0.7},
    }
    assert body["usage"] == {"prompt_tokens": 10, "completion_tokens": 4, "total_tokens": 14}


def test_llm_generate_retries_ollama_reasoning_only_stop_response(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    requests: list[str] = []

    class FakeResponse:
        def __init__(self, payload: dict[str, Any]) -> None:
            self.payload = payload

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, Any]:
            return self.payload

    class FakeClient:
        def __init__(self, *, timeout: float) -> None:
            pass

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(self, url: str, *, json: dict[str, Any], headers: dict[str, str]) -> FakeResponse:
            requests.append(url)
            if url.endswith("/v1/chat/completions"):
                return FakeResponse(
                    {
                        "system_fingerprint": "fp_ollama",
                        "choices": [
                            {
                                "finish_reason": "stop",
                                "message": {
                                    "role": "assistant",
                                    "content": "",
                                    "reasoning": "private reasoning must not be returned",
                                },
                            }
                        ],
                    }
                )
            return FakeResponse({"message": {"role": "assistant", "content": "Final answer."}})

    monkeypatch.setattr("app.core.llm.httpx.Client", FakeClient)
    client = make_client(
        tmp_path,
        monkeypatch,
        base_url="http://127.0.0.1:11434/v1",
        model="huihui_ai/qwen3.5-abliterated:4b",
    )

    response = client.post("/api/llm/generate", json={"prompt": "Write a rumor."})

    assert response.status_code == 200
    assert response.json()["text"] == "Final answer."
    assert "private reasoning" not in response.text
    assert requests == [
        "http://127.0.0.1:11434/v1/chat/completions",
        "http://127.0.0.1:11434/api/chat",
    ]


def test_llm_generate_reports_reasoning_only_when_ollama_retry_has_no_content(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    class FakeResponse:
        def __init__(self, payload: dict[str, Any]) -> None:
            self.payload = payload

        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, Any]:
            return self.payload

    class FakeClient:
        def __init__(self, *, timeout: float) -> None:
            pass

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(self, url: str, *, json: dict[str, Any], headers: dict[str, str]) -> FakeResponse:
            if url.endswith("/v1/chat/completions"):
                return FakeResponse(
                    {
                        "system_fingerprint": "fp_ollama",
                        "choices": [
                            {
                                "finish_reason": "length",
                                "message": {
                                    "content": "",
                                    "reasoning": "private reasoning must not be returned",
                                },
                            }
                        ],
                    }
                )
            return FakeResponse({"message": {"content": "   "}})

    monkeypatch.setattr("app.core.llm.httpx.Client", FakeClient)
    client = make_client(
        tmp_path,
        monkeypatch,
        base_url="http://127.0.0.1:11434/v1",
        model="huihui_ai/qwen3.5-abliterated:4b",
    )

    response = client.post("/api/llm/generate", json={"prompt": "Write a rumor."})

    assert response.status_code == 502
    expected_error = (
        "The model produced reasoning but no final answer. Try again or increase max output tokens."
    )
    assert response.json() == {
        "detail": expected_error
    }
    assert "private reasoning" not in response.text


def test_llm_generate_sends_authorization_only_when_api_key_is_set(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    headers_seen: list[dict[str, str]] = []

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, Any]:
            return {"choices": [{"message": {"content": "ok"}}]}

    class FakeClient:
        def __init__(self, *, timeout: float) -> None:
            pass

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(self, _url: str, *, json: dict[str, Any], headers: dict[str, str]) -> FakeResponse:
            headers_seen.append(headers)
            return FakeResponse()

    monkeypatch.setattr("app.core.llm.httpx.Client", FakeClient)
    client = make_client(
        tmp_path,
        monkeypatch,
        base_url="http://llm.local/v1",
        model="test-model",
        api_key="secret",
    )

    response = client.post("/api/llm/generate", json={"prompt": "Hello"})

    assert response.status_code == 200
    assert headers_seen == [
        {"Content-Type": "application/json", "Authorization": "Bearer secret"},
    ]


def test_llm_generate_enforces_request_token_and_temperature_limits(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    requests: list[dict[str, Any]] = []

    class FakeResponse:
        def raise_for_status(self) -> None:
            return None

        def json(self) -> dict[str, Any]:
            return {"choices": [{"message": {"content": "ok"}}]}

    class FakeClient:
        def __init__(self, *, timeout: float) -> None:
            pass

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(self, _url: str, *, json: dict[str, Any], headers: dict[str, str]) -> FakeResponse:
            requests.append(json)
            return FakeResponse()

    monkeypatch.setattr("app.core.llm.httpx.Client", FakeClient)
    client = make_client(
        tmp_path,
        monkeypatch,
        base_url="http://llm.local/v1",
        model="test-model",
    )

    valid = client.post(
        "/api/llm/generate",
        json={"prompt": "Hello", "max_tokens": 12, "temperature": 0.2},
    )
    too_many_tokens = client.post(
        "/api/llm/generate",
        json={"prompt": "Hello", "max_tokens": 801},
    )
    bad_temperature = client.post(
        "/api/llm/generate",
        json={"prompt": "Hello", "temperature": 2.1},
    )

    assert valid.status_code == 200
    assert requests[0]["max_tokens"] == 12
    assert requests[0]["temperature"] == 0.2
    assert too_many_tokens.status_code == 400
    assert too_many_tokens.json() == {"detail": "max_tokens must be between 1 and 800."}
    assert bad_temperature.status_code == 400
    assert bad_temperature.json() == {"detail": "temperature must be between 0 and 2."}


def test_llm_generate_returns_compact_upstream_error_without_secret(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    class FakeClient:
        def __init__(self, *, timeout: float) -> None:
            pass

        def __enter__(self) -> "FakeClient":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def post(self, _url: str, *, json: dict[str, Any], headers: dict[str, str]):
            raise RuntimeError("secret-key exploded")

    monkeypatch.setattr("app.core.llm.httpx.Client", FakeClient)
    client = make_client(
        tmp_path,
        monkeypatch,
        base_url="http://llm.local/v1",
        model="test-model",
        api_key="secret-key",
    )

    response = client.post("/api/llm/generate", json={"prompt": "Hello"})

    assert response.status_code == 502
    assert response.json() == {"detail": "LLM provider request failed."}
    assert "secret-key" not in response.text


def test_llm_routes_require_auth_when_token_is_set(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    client = make_client(
        tmp_path,
        monkeypatch,
        base_url="http://llm.local/v1",
        model="test-model",
        token="secret",
    )

    locked_config = client.get("/api/llm/config")
    unlocked_config = client.get("/api/llm/config", headers={"X-VirtualScreen-Token": "secret"})
    locked_generate = client.post("/api/llm/generate", json={"prompt": "Hello"})

    assert locked_config.status_code == 401
    assert unlocked_config.status_code == 200
    assert locked_generate.status_code == 401
