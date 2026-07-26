from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from starlette.websockets import WebSocketDisconnect

from app.core.config import get_settings
from app.main import create_app

INDEX_MARKER = '<div id="root">SPA</div>'


@pytest.fixture(autouse=True)
def clear_cached_settings():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def make_fake_dist(tmp_path: Path) -> Path:
    dist = tmp_path / "dist"
    dist.mkdir()
    (dist / "index.html").write_text(f"<!doctype html><html><body>{INDEX_MARKER}</body></html>")
    assets = dist / "assets"
    assets.mkdir()
    (assets / "app.js").write_text('console.log("app")')
    return dist


def test_unset_static_dir_returns_404(monkeypatch) -> None:
    monkeypatch.delenv("VIRTUALSCREEN_STATIC_DIR", raising=False)
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.get("/")

    assert response.status_code == 404


def test_configured_static_dir_serves_index(tmp_path: Path, monkeypatch) -> None:
    fake_dist = make_fake_dist(tmp_path)
    monkeypatch.setenv("VIRTUALSCREEN_STATIC_DIR", str(fake_dist))
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.get("/")

    assert response.status_code == 200
    assert INDEX_MARKER in response.text


def test_spa_fallback_serves_index_for_client_routes(tmp_path: Path, monkeypatch) -> None:
    fake_dist = make_fake_dist(tmp_path)
    monkeypatch.setenv("VIRTUALSCREEN_STATIC_DIR", str(fake_dist))
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.get("/screen")

    assert response.status_code == 200
    assert INDEX_MARKER in response.text


def test_static_asset_is_served(tmp_path: Path, monkeypatch) -> None:
    fake_dist = make_fake_dist(tmp_path)
    monkeypatch.setenv("VIRTUALSCREEN_STATIC_DIR", str(fake_dist))
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.get("/assets/app.js")

    assert response.status_code == 200
    assert 'console.log("app")' in response.text


def test_api_404_is_not_swallowed_by_spa_fallback(tmp_path: Path, monkeypatch) -> None:
    fake_dist = make_fake_dist(tmp_path)
    monkeypatch.setenv("VIRTUALSCREEN_STATIC_DIR", str(fake_dist))
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.get("/api/definitely-not-a-route")

    assert response.status_code == 404
    assert INDEX_MARKER not in response.text


def test_missing_static_dir_does_not_raise(tmp_path: Path, monkeypatch) -> None:
    monkeypatch.setenv("VIRTUALSCREEN_STATIC_DIR", str(tmp_path / "nope"))
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.get("/")

    assert response.status_code == 404


def test_unknown_websocket_path_closes_cleanly(tmp_path: Path, monkeypatch) -> None:
    # Runs with auth disabled (token = " "), i.e. the unprotected default the
    # reviewer flagged: any stray websocket client can hit the mount.
    fake_dist = make_fake_dist(tmp_path)
    monkeypatch.setenv("VIRTUALSCREEN_STATIC_DIR", str(fake_dist))
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")
    get_settings.cache_clear()

    client = TestClient(create_app())

    # Before the fix, the catch-all mount let the websocket scope reach
    # StaticFiles.__call__, whose `assert scope["type"] == "http"` blew up
    # with an unhandled AssertionError instead of a clean close.
    with pytest.raises(WebSocketDisconnect):
        with client.websocket_connect("/ws/nope"):
            pass


@pytest.mark.parametrize("path", ["/api", "/api/", "/ws"])
def test_api_ws_prefix_paths_are_not_swallowed_by_spa_fallback(
    path: str, tmp_path: Path, monkeypatch
) -> None:
    fake_dist = make_fake_dist(tmp_path)
    monkeypatch.setenv("VIRTUALSCREEN_STATIC_DIR", str(fake_dist))
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.get(path)

    assert response.status_code == 404
    assert INDEX_MARKER not in response.text


def test_api_prefix_check_is_case_insensitive(tmp_path: Path, monkeypatch) -> None:
    fake_dist = make_fake_dist(tmp_path)
    monkeypatch.setenv("VIRTUALSCREEN_STATIC_DIR", str(fake_dist))
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.get("/API/nope")

    assert response.status_code == 404
    assert INDEX_MARKER not in response.text


def test_unmatched_post_to_api_returns_404_not_405(tmp_path: Path, monkeypatch) -> None:
    fake_dist = make_fake_dist(tmp_path)
    monkeypatch.setenv("VIRTUALSCREEN_STATIC_DIR", str(fake_dist))
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.post("/api/nope")

    assert response.status_code == 404


def test_registered_api_route_still_works_with_mount_in_place(tmp_path: Path, monkeypatch) -> None:
    fake_dist = make_fake_dist(tmp_path)
    monkeypatch.setenv("VIRTUALSCREEN_STATIC_DIR", str(fake_dist))
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", " ")
    get_settings.cache_clear()

    client = TestClient(create_app())
    response = client.get("/api/health")

    assert response.status_code == 200
