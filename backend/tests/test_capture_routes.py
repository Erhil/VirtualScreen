from datetime import date
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_cached_settings():
    yield
    get_settings.cache_clear()


def make_client(world: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(world_root=world)
    return TestClient(app)


def today_path() -> str:
    return f"Session Logs/{date.today().isoformat()}.md"


def test_capture_today_reports_daily_log_path_and_existence(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    missing = client.get("/api/capture/today")

    assert missing.status_code == 200
    assert missing.json() == {"path": today_path(), "exists": False}

    (world / "Session Logs").mkdir()
    (world / today_path()).write_text("# Existing\n", encoding="utf-8")

    existing = client.get("/api/capture/today")

    assert existing.status_code == 200
    assert existing.json() == {"path": today_path(), "exists": True}


def test_capture_creates_daily_log_without_backup(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.post(
        "/api/capture",
        json={"category": "idea", "text": "Secret passage behind the mural"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["path"] == today_path()
    assert body["category"] == "idea"
    assert body["heading"] == "Ideas"
    assert body["created"] is True
    assert body["entry"][0:2] == "- "
    assert " - Secret passage behind the mural" in body["entry"]
    assert body["modified_at"].endswith("Z")
    assert len(body["hash"]) == 64

    content = (world / today_path()).read_text(encoding="utf-8")
    assert content.startswith(f"# Session Log {date.today().isoformat()}\n\n## Ideas\n\n")
    assert body["entry"] in content
    assert not (world / ".virtualscreen" / "backups").exists()


def test_capture_appends_multiline_entry_to_existing_section(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Session Logs").mkdir(parents=True)
    log = world / today_path()
    log.write_text(
        f"# Session Log {date.today().isoformat()}\n\n"
        "## Ideas\n\n"
        "- 09:00 - First idea\n\n"
        "## Loot\n\n"
        "- 09:05 - Copper ring\n",
        encoding="utf-8",
    )
    client = make_client(world)

    response = client.post(
        "/api/capture",
        json={"category": "idea", "text": "First line\nSecond line\n\nThird line"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["created"] is False
    assert body["entry"].endswith("First line\n  Second line\n  Third line")

    content = log.read_text(encoding="utf-8")
    assert "## Ideas\n\n- 09:00 - First idea\n\n- " in content
    assert "\n  Second line\n  Third line\n\n## Loot" in content


def test_capture_adds_missing_category_section(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Session Logs").mkdir(parents=True)
    log = world / today_path()
    log.write_text(f"# Session Log {date.today().isoformat()}\n", encoding="utf-8")
    client = make_client(world)

    response = client.post(
        "/api/capture",
        json={"category": "player_wish", "text": "Wants more faction fallout"},
    )

    assert response.status_code == 200
    assert response.json()["heading"] == "Player Wishes"
    assert "\n\n## Player Wishes\n\n- " in log.read_text(encoding="utf-8")


def test_capture_rejects_empty_text_and_invalid_category(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    empty = client.post("/api/capture", json={"category": "todo", "text": " \n "})
    invalid = client.post("/api/capture", json={"category": "bad", "text": "Do it"})

    assert empty.status_code == 400
    assert invalid.status_code == 422


def test_capture_is_searchable_after_post(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    capture = client.post(
        "/api/capture",
        json={"category": "question", "text": "Ask Varlo about moon-silver"},
    )
    search = client.get("/api/search", params={"q": "moon-silver"})

    assert capture.status_code == 200
    assert search.status_code == 200
    assert search.json()[0]["path"] == today_path()


def test_capture_requires_auth_when_token_is_set(tmp_path: Path, monkeypatch) -> None:
    world = tmp_path / "world"
    world.mkdir()
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(world))
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", "secret")
    get_settings.cache_clear()
    client = TestClient(create_app())

    locked = client.post("/api/capture", json={"category": "other", "text": "Hidden"})
    unlocked = client.post(
        "/api/capture",
        json={"category": "other", "text": "Visible"},
        headers={"X-VirtualScreen-Token": "secret"},
    )

    assert locked.status_code == 401
    assert unlocked.status_code == 200
