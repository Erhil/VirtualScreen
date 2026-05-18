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
        monkeypatch.delenv("VIRTUALSCREEN_ACCESS_TOKEN", raising=False)
    else:
        monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", token)
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(world))
    get_settings.cache_clear()
    world.mkdir(parents=True, exist_ok=True)
    (world / "README.md").write_text("# Home", encoding="utf-8")
    return TestClient(create_app())


def test_roll_dice_returns_breakdown(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    client = make_client(tmp_path / "world", monkeypatch)

    response = client.post("/api/dice/roll", json={"expression": "2d1+3"})

    assert response.status_code == 200
    body = response.json()
    assert body["expression"] == "2d1+3"
    assert body["dice"] == {"count": 2, "sides": 1, "results": [1, 1]}
    assert body["modifier"] == 3
    assert body["total"] == 5
    assert body["detail"] == "2d1: 1 + 1 + 3 = 5"
    assert body["rolled_at"].endswith("Z")


def test_roll_dice_supports_negative_modifier(tmp_path: Path, monkeypatch: MonkeyPatch) -> None:
    client = make_client(tmp_path / "world", monkeypatch)

    response = client.post("/api/dice/roll", json={"expression": "1d1-2"})

    assert response.status_code == 200
    body = response.json()
    assert body["modifier"] == -2
    assert body["total"] == -1
    assert body["detail"] == "1d1: 1 - 2 = -1"


@pytest.mark.parametrize("expression", ["", "bad", "1d0", "0d6", "101d6", "1d10001"])
def test_roll_dice_rejects_invalid_expressions(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
    expression: str,
) -> None:
    client = make_client(tmp_path / "world", monkeypatch)

    response = client.post("/api/dice/roll", json={"expression": expression})

    assert response.status_code == 400
    assert response.json()["detail"]


def test_roll_dice_route_requires_auth_when_token_is_set(
    tmp_path: Path,
    monkeypatch: MonkeyPatch,
) -> None:
    client = make_client(tmp_path / "world", monkeypatch, token="secret")

    locked = client.post("/api/dice/roll", json={"expression": "1d1"})
    unlocked = client.post(
        "/api/dice/roll",
        json={"expression": "1d1"},
        headers={"X-VirtualScreen-Token": "secret"},
    )

    assert locked.status_code == 401
    assert unlocked.status_code == 200
    assert unlocked.json()["total"] == 1
