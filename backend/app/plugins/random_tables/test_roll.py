from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from pytest import MonkeyPatch

from app.core.config import get_settings
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_cached_settings():
    yield
    get_settings.cache_clear()


def make_client(world: Path, monkeypatch: MonkeyPatch, *, token: str | None = None) -> TestClient:
    if token is None:
        monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")
    else:
        monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", token)
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(world))
    get_settings.cache_clear()
    world.mkdir(parents=True, exist_ok=True)
    (world / "README.md").write_text("# Home", encoding="utf-8")
    return TestClient(create_app())


def test_roll_random_table_returns_one_of_the_entries(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    client = make_client(tmp_path / "world", monkeypatch)
    entries = ["Goblin ambush", "Collapsed bridge", "Friendly merchant"]

    response = client.post("/api/plugins/random-tables/roll", json={"entries": entries})

    assert response.status_code == 200
    assert response.json()["result"] in entries


def test_roll_random_table_ignores_blank_entries(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    client = make_client(tmp_path / "world", monkeypatch)

    response = client.post(
        "/api/plugins/random-tables/roll",
        json={"entries": ["", "  ", "Only real entry"]},
    )

    assert response.status_code == 200
    assert response.json()["result"] == "Only real entry"


def test_roll_random_table_rejects_empty_entries(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    client = make_client(tmp_path / "world", monkeypatch)

    response = client.post("/api/plugins/random-tables/roll", json={"entries": []})

    assert response.status_code == 400
    assert response.json()["detail"]


def test_roll_random_table_rejects_all_blank_entries(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    client = make_client(tmp_path / "world", monkeypatch)

    response = client.post(
        "/api/plugins/random-tables/roll",
        json={"entries": ["", "   ", "\t"]},
    )

    assert response.status_code == 400
    assert response.json()["detail"]
