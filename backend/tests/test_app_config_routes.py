from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_settings_cache():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def make_client(
    tmp_path: Path,
    monkeypatch,
    language: str | None = None,
    token: str | None = None,
) -> TestClient:
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(tmp_path / "world"))
    if language is None:
        monkeypatch.delenv("VIRTUALSCREEN_LANGUAGE", raising=False)
    else:
        monkeypatch.setenv("VIRTUALSCREEN_LANGUAGE", language)
    if token is None:
        monkeypatch.delenv("VIRTUALSCREEN_ACCESS_TOKEN", raising=False)
    else:
        monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", token)
    get_settings.cache_clear()
    (tmp_path / "world").mkdir()
    return TestClient(create_app())


def test_app_config_defaults_to_english(tmp_path: Path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch)

    response = client.get("/api/app/config")

    assert response.status_code == 200
    assert response.json() == {
        "language": "en",
        "available_languages": [
            {"code": "en", "label": "English", "native_label": "English"},
            {"code": "ru", "label": "Russian", "native_label": "Русский"},
        ],
    }


def test_app_config_reads_russian_language(tmp_path: Path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch, language="ru")

    response = client.get("/api/app/config")

    assert response.status_code == 200
    assert response.json()["language"] == "ru"


def test_app_config_rejects_unknown_language_to_english(tmp_path: Path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch, language="de")

    response = client.get("/api/app/config")

    assert response.status_code == 200
    assert response.json()["language"] == "en"


def test_app_config_is_public_but_does_not_expose_secret(tmp_path: Path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch, language="ru", token="secret")

    response = client.get("/api/app/config")

    assert response.status_code == 200
    assert "secret" not in response.text
    assert client.get("/api/world/tree").status_code == 401
