from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import Settings, get_settings
from app.core.llm import LlmError, LlmTimeoutError, generate_llm_text

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]


class LlmConfigResponse(BaseModel):
    enabled: bool
    configured: bool
    provider: str | None
    base_url: str
    model: str | None
    max_input_chars: int
    max_output_tokens: int
    temperature: float
    timeout_seconds: float


class LlmGeneratePayload(BaseModel):
    prompt: str
    max_tokens: int | None = None
    temperature: float | None = None


class LlmGenerateResponse(BaseModel):
    text: str
    provider: str
    model: str
    created_at: str
    usage: dict[str, Any] | None = None


@router.get("/llm/config", response_model=LlmConfigResponse)
def llm_config(settings: SettingsDep) -> LlmConfigResponse:
    enabled = settings.llm_enabled
    return LlmConfigResponse(
        enabled=enabled,
        configured=enabled,
        provider="openai-compatible" if enabled else None,
        base_url=settings.llm_base_url.strip(),
        model=settings.llm_model.strip() if enabled else None,
        max_input_chars=settings.llm_max_input_chars,
        max_output_tokens=settings.llm_max_output_tokens,
        temperature=settings.llm_temperature,
        timeout_seconds=settings.llm_timeout_seconds,
    )


@router.post("/llm/generate", response_model=LlmGenerateResponse)
def llm_generate(payload: LlmGeneratePayload, settings: SettingsDep) -> LlmGenerateResponse:
    if not settings.llm_enabled:
        raise HTTPException(status_code=400, detail="LLM provider is not configured.")

    try:
        result = generate_llm_text(
            payload.prompt,
            settings,
            max_tokens=payload.max_tokens,
            temperature=payload.temperature,
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    except LlmTimeoutError as exc:
        raise HTTPException(status_code=504, detail=str(exc)) from exc
    except LlmError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return LlmGenerateResponse(
        text=result.text,
        provider=result.provider,
        model=result.model,
        created_at=result.created_at,
        usage=result.usage,
    )
