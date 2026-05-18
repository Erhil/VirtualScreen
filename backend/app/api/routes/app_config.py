import json
import re
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.core.config import Settings, get_settings

router = APIRouter()
SettingsDep = Annotated[Settings, Depends(get_settings)]

LANGUAGE_CODE_RE = re.compile(r"^[A-Za-z][A-Za-z0-9_-]{1,31}$")


class UiLanguageOption(BaseModel):
    code: str
    label: str
    native_label: str


class AppConfigResponse(BaseModel):
    language: str
    available_languages: list[UiLanguageOption]


DEFAULT_LANGUAGES = [
    UiLanguageOption(code="en", label="English", native_label="English"),
    UiLanguageOption(code="ru", label="Russian", native_label="Русский"),
]
ENGLISH_ONLY = [UiLanguageOption(code="en", label="English", native_label="English")]


def _safe_language_code(value: object) -> str | None:
    if not isinstance(value, str):
        return None
    code = value.strip()
    return code if LANGUAGE_CODE_RE.fullmatch(code) else None


def _read_manifest(settings: Settings) -> list[UiLanguageOption]:
    manifest_path = settings.resolved_language_dir / "languages.json"
    if not manifest_path.exists():
        return DEFAULT_LANGUAGES

    try:
        raw = json.loads(manifest_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeDecodeError):
        return ENGLISH_ONLY

    if not isinstance(raw, list):
        return ENGLISH_ONLY

    options: list[UiLanguageOption] = []
    seen: set[str] = set()
    for item in raw:
        if not isinstance(item, dict):
            continue
        code = _safe_language_code(item.get("code"))
        label = item.get("label")
        native_label = item.get("native_label")
        if (
            not code
            or code in seen
            or not isinstance(label, str)
            or not label.strip()
            or not isinstance(native_label, str)
            or not native_label.strip()
        ):
            continue
        if not (settings.resolved_language_dir / f"{code}.json").is_file():
            continue
        options.append(
            UiLanguageOption(code=code, label=label.strip(), native_label=native_label.strip())
        )
        seen.add(code)

    if "en" not in seen:
        options.insert(0, ENGLISH_ONLY[0])
    return options or ENGLISH_ONLY


def _read_catalog(settings: Settings, code: str) -> dict[str, str] | None:
    catalog_path = settings.resolved_language_dir / f"{code}.json"
    try:
        raw = json.loads(catalog_path.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError, UnicodeDecodeError):
        return None
    if not isinstance(raw, dict):
        return None
    catalog: dict[str, str] = {}
    for key, value in raw.items():
        if isinstance(key, str) and isinstance(value, str):
            catalog[key] = value
    return catalog


@router.get("/app/config", response_model=AppConfigResponse)
def app_config(settings: SettingsDep) -> AppConfigResponse:
    options = _read_manifest(settings)
    available = {option.code for option in options}
    language = settings.ui_language if settings.ui_language in available else "en"
    return AppConfigResponse(language=language, available_languages=options)


@router.get("/app/language/{code}", response_model=dict[str, str])
def app_language_catalog(code: str, settings: SettingsDep) -> dict[str, str]:
    safe_code = _safe_language_code(code)
    if not safe_code:
        raise HTTPException(status_code=404, detail="Language not found.")

    available = {option.code for option in _read_manifest(settings)}
    if safe_code not in available:
        raise HTTPException(status_code=404, detail="Language not found.")

    catalog = _read_catalog(settings, safe_code)
    if catalog is None:
        raise HTTPException(status_code=404, detail="Language catalog not found.")
    return catalog
