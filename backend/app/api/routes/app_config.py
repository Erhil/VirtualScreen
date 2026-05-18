from typing import Annotated, Literal

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.core.config import Settings, get_settings

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]

UiLanguage = Literal["en", "ru"]


class UiLanguageOption(BaseModel):
    code: UiLanguage
    label: str
    native_label: str


class AppConfigResponse(BaseModel):
    language: UiLanguage
    available_languages: list[UiLanguageOption]


AVAILABLE_LANGUAGES = [
    UiLanguageOption(code="en", label="English", native_label="English"),
    UiLanguageOption(code="ru", label="Russian", native_label="Русский"),
]


@router.get("/app/config", response_model=AppConfigResponse)
def app_config(settings: SettingsDep) -> AppConfigResponse:
    language: UiLanguage = "ru" if settings.ui_language == "ru" else "en"
    return AppConfigResponse(
        language=language,
        available_languages=AVAILABLE_LANGUAGES,
    )
