from dataclasses import dataclass
from datetime import UTC, datetime
from typing import Any

import httpx

from app.core.config import Settings

LLM_PROVIDER = "openai-compatible"
OLLAMA_REASONING_ONLY_ERROR = (
    "The model produced reasoning but no final answer. Try again or increase max output tokens."
)
SYSTEM_PROMPT = (
    "You are a careful tabletop RPG assistant. Respond with useful, concise draft material for "
    "the DM. Do not claim you read files or private context unless it was provided in the prompt."
)


@dataclass(frozen=True)
class LlmGeneration:
    text: str
    provider: str
    model: str
    created_at: str
    usage: dict[str, Any] | None = None


class LlmError(RuntimeError):
    pass


class LlmTimeoutError(LlmError):
    pass


def _utc_now() -> str:
    return datetime.now(UTC).isoformat().replace("+00:00", "Z")


def validate_llm_prompt(prompt: str, settings: Settings) -> str:
    clean_prompt = prompt.strip()
    if not clean_prompt:
        raise ValueError("Prompt is required.")
    if len(clean_prompt) > settings.llm_max_input_chars:
        raise ValueError("Prompt is too long.")
    return clean_prompt


def _validate_max_tokens(max_tokens: int | None, settings: Settings) -> int:
    output_tokens = settings.llm_max_output_tokens if max_tokens is None else max_tokens
    if output_tokens < 1 or output_tokens > settings.llm_max_output_tokens:
        raise ValueError(f"max_tokens must be between 1 and {settings.llm_max_output_tokens}.")
    return output_tokens


def _validate_temperature(temperature: float | None, settings: Settings) -> float:
    output_temperature = settings.llm_temperature if temperature is None else temperature
    if output_temperature < 0 or output_temperature > 2:
        raise ValueError("temperature must be between 0 and 2.")
    return output_temperature


def _post_json(
    client: httpx.Client,
    url: str,
    payload: dict[str, Any],
    headers: dict[str, str],
) -> dict[str, Any]:
    try:
        response = client.post(url, json=payload, headers=headers)
        response.raise_for_status()
        data = response.json()
    except httpx.TimeoutException as exc:
        raise LlmTimeoutError("LLM request timed out.") from exc
    except httpx.HTTPStatusError as exc:
        raise LlmError("LLM provider returned an error.") from exc
    except httpx.RequestError as exc:
        raise LlmError("LLM provider unavailable.") from exc
    except ValueError as exc:
        raise LlmError("LLM provider returned an invalid response.") from exc
    except Exception as exc:
        raise LlmError("LLM provider request failed.") from exc

    if not isinstance(data, dict):
        raise LlmError("LLM provider returned an invalid response.")
    return data


def _openai_content(data: dict[str, Any]) -> str | None:
    try:
        text = data["choices"][0]["message"]["content"]
    except (KeyError, IndexError, TypeError) as exc:
        raise LlmError("LLM provider returned an invalid response.") from exc
    if isinstance(text, str) and text.strip():
        return text.strip()
    return None


def _is_ollama_reasoning_only(data: dict[str, Any]) -> bool:
    if data.get("system_fingerprint") != "fp_ollama":
        return False
    try:
        choice = data["choices"][0]
        message = choice["message"]
        content = message.get("content")
        reasoning = message.get("reasoning")
    except (KeyError, IndexError, TypeError, AttributeError):
        return False
    return (
        isinstance(content, str)
        and not content.strip()
        and isinstance(reasoning, str)
        and bool(reasoning.strip())
    )


def _ollama_native_chat_url(base_url: str) -> str:
    root = base_url.rstrip("/")
    if root.endswith("/v1"):
        root = root[:-3]
    return f"{root.rstrip('/')}/api/chat"


def _ollama_native_content(data: dict[str, Any]) -> str | None:
    try:
        text = data["message"]["content"]
    except (KeyError, TypeError) as exc:
        raise LlmError("LLM provider returned an invalid response.") from exc
    if isinstance(text, str) and text.strip():
        return text.strip()
    return None


def _ollama_native_usage(data: dict[str, Any]) -> dict[str, Any] | None:
    prompt_tokens = data.get("prompt_eval_count")
    completion_tokens = data.get("eval_count")
    if not isinstance(prompt_tokens, int) or not isinstance(completion_tokens, int):
        return None
    return {
        "prompt_tokens": prompt_tokens,
        "completion_tokens": completion_tokens,
        "total_tokens": prompt_tokens + completion_tokens,
    }


def generate_llm_text(
    prompt: str,
    settings: Settings,
    *,
    max_tokens: int | None = None,
    temperature: float | None = None,
) -> LlmGeneration:
    if not settings.llm_enabled:
        raise ValueError("LLM provider is not configured.")

    clean_prompt = validate_llm_prompt(prompt, settings)
    output_tokens = _validate_max_tokens(max_tokens, settings)
    output_temperature = _validate_temperature(temperature, settings)
    url = f"{settings.llm_base_url.rstrip('/')}/chat/completions"
    headers = {"Content-Type": "application/json"}
    api_key = settings.llm_api_key.strip()
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"

    payload = {
        "model": settings.llm_model.strip(),
        "messages": [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": clean_prompt},
        ],
        "temperature": output_temperature,
        "max_tokens": output_tokens,
        "n": 1,
        "stream": False,
    }

    with httpx.Client(timeout=settings.llm_timeout_seconds) as client:
        data = _post_json(client, url, payload, headers)
        text = _openai_content(data)
        usage = data.get("usage") if isinstance(data.get("usage"), dict) else None
        if text is None and _is_ollama_reasoning_only(data):
            native_data = _post_json(
                client,
                _ollama_native_chat_url(settings.llm_base_url),
                {
                    "model": settings.llm_model.strip(),
                    "messages": payload["messages"],
                    "stream": False,
                    "think": False,
                    "options": {
                        "num_predict": output_tokens,
                        "temperature": output_temperature,
                    },
                },
                headers,
            )
            text = _ollama_native_content(native_data)
            usage = _ollama_native_usage(native_data)
            if text is None:
                raise LlmError(OLLAMA_REASONING_ONLY_ERROR)
        elif text is None:
            raise LlmError("LLM provider returned an empty response.")

    return LlmGeneration(
        text=text,
        provider=LLM_PROVIDER,
        model=settings.llm_model.strip(),
        created_at=_utc_now(),
        usage=usage,
    )
