from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import get_settings
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_cached_settings():
    yield
    get_settings.cache_clear()


def make_client(tmp_path: Path, monkeypatch, token: str | None = None) -> TestClient:
    if token is None:
        monkeypatch.delenv("VIRTUALSCREEN_ACCESS_TOKEN", raising=False)
    else:
        monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", token)
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(tmp_path / "world"))
    get_settings.cache_clear()
    (tmp_path / "world").mkdir()
    (tmp_path / "world" / "README.md").write_text("# Home", encoding="utf-8")
    return TestClient(create_app())


def test_auth_disabled_without_token(tmp_path: Path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch)

    response = client.get("/api/auth/status")

    assert response.status_code == 200
    assert response.json() == {"enabled": False, "authenticated": True}
    assert client.get("/api/world/tree").status_code == 200


def test_protected_api_requires_login_when_token_is_set(tmp_path: Path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch, token="secret")

    assert client.get("/api/auth/status").json() == {
        "enabled": True,
        "authenticated": False,
    }
    assert client.get("/api/world/tree").status_code == 401

    bad_login = client.post("/api/auth/login", json={"token": "wrong"})
    assert bad_login.status_code == 401

    login = client.post("/api/auth/login", json={"token": "secret"})
    assert login.status_code == 200
    assert login.json() == {"enabled": True, "authenticated": True}
    assert client.get("/api/world/tree").status_code == 200


def test_auth_header_unlocks_protected_api(tmp_path: Path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch, token="secret")

    response = client.get("/api/world/tree", headers={"X-VirtualScreen-Token": "secret"})

    assert response.status_code == 200


def test_logout_clears_cookie_access(tmp_path: Path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch, token="secret")

    client.post("/api/auth/login", json={"token": "secret"})
    assert client.get("/api/world/tree").status_code == 200

    logout = client.post("/api/auth/logout")

    assert logout.status_code == 200
    assert client.get("/api/world/tree").status_code == 401


def test_websocket_requires_auth_when_token_is_set(tmp_path: Path, monkeypatch) -> None:
    client = make_client(tmp_path, monkeypatch, token="secret")

    try:
        with client.websocket_connect("/ws/events"):
            connected = True
    except Exception:
        connected = False

    assert connected is False

    with client.websocket_connect("/ws/events?token=secret") as websocket:
        websocket.send_text("ping")


def test_player_screen_read_endpoints_are_public_when_token_is_set(
    tmp_path: Path,
    monkeypatch,
) -> None:
    world = tmp_path / "world"
    client = make_client(tmp_path, monkeypatch, token="secret")
    (world / "Media").mkdir()
    (world / "Media" / "map.svg").write_text("<svg></svg>", encoding="utf-8")

    assert client.get("/api/screen/display/state").status_code == 200
    assert client.get("/api/screen/world/file?path=README.md").status_code == 403

    show_response = client.put(
        "/api/display/fullscreen",
        json={"path": "README.md"},
        headers={"X-VirtualScreen-Token": "secret"},
    )
    assert show_response.status_code == 200

    assert client.get("/api/screen/world/file?path=README.md").status_code == 200
    assert client.get("/api/screen/page/links?path=README.md").status_code == 200

    assert client.get("/api/display/state").status_code == 401
    assert client.put("/api/display/fullscreen", json={"path": "README.md"}).status_code == 401

    with client.websocket_connect("/ws/screen/display") as websocket:
        websocket.send_text("ping")
