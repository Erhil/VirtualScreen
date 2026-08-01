import json
import shutil
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.core import world_library
from app.core.config import Settings, get_settings
from app.core.world_library import _ACTIVE_WORLDS, app_state_path, default_worlds_root
from app.main import create_app


def make_app(world: Path, worlds_root: Path) -> FastAPI:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(
        world_root=world,
        worlds_root=worlds_root,
        watch_world=False,
    )
    return app


def make_client(world: Path, worlds_root: Path) -> TestClient:
    return TestClient(make_app(world, worlds_root))


def restart_server(world: Path, worlds_root: Path) -> TestClient:
    """A fresh client with the in-process world cache dropped, as after a restart."""
    _ACTIVE_WORLDS.clear()
    return make_client(world, worlds_root)


def test_world_isolation_fixture_lives_where_every_test_root_can_see_it() -> None:
    # pyproject collects two roots, `tests` and `app/plugins`, so a conftest inside either
    # one does not reach the other. This fixture spent a while in tests/conftest.py, where
    # it protected everything except plugin tests - and the first plugin test that wrote to
    # a world put a file into a real campaign. Moving it back would leave the sandbox test
    # below passing while plugin tests silently lost cover, so pin the location itself.
    backend_root = Path(__file__).resolve().parents[1]

    assert "isolated_world_library" in (backend_root / "conftest.py").read_text(encoding="utf-8")
    assert "isolated_world_library" not in (backend_root / "tests" / "conftest.py").read_text(
        encoding="utf-8"
    )


def test_settings_without_a_worlds_root_stay_inside_the_test_sandbox(tmp_path: Path) -> None:
    # Twenty test modules build Settings with only world_root overridden. The
    # active world is now restored from a state file under worlds_root, so if the
    # real default ever leaks back in, this suite reads from - and the
    # file-management tests delete inside - the developer's own campaign library.
    settings = Settings(world_root=tmp_path / "fallback", watch_world=False)

    assert settings.resolved_worlds_root == (tmp_path / "worlds").resolve()
    assert settings.resolved_worlds_root != default_worlds_root().resolve()


def test_default_worlds_root_uses_user_storage_folder() -> None:
    root = default_worlds_root()

    assert root.name == "worlds"
    assert "VirtualScreen" in str(root) or ".vscreen" in str(root)


def test_worlds_list_only_direct_visible_directories(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    (worlds_root / "Campaign A").mkdir(parents=True)
    (worlds_root / "Campaign B").mkdir()
    (worlds_root / ".hidden").mkdir()
    (worlds_root / "__pycache__").mkdir()
    (worlds_root / "loose.md").write_text("# Loose\n", encoding="utf-8")
    client = make_client(fallback_world, worlds_root)

    response = client.get("/api/worlds")

    assert response.status_code == 200
    body = response.json()
    assert body["worlds_root"] == str(worlds_root.resolve())
    assert [world["id"] for world in body["worlds"]] == ["Campaign A", "Campaign B"]
    assert body["current"]["path"] == str(fallback_world.resolve())


def test_opening_listed_world_changes_current_world(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    campaign = worlds_root / "Campaign A"
    campaign.mkdir(parents=True)
    (campaign / "README.md").write_text("# Campaign A\n", encoding="utf-8")
    client = make_client(fallback_world, worlds_root)

    response = client.post("/api/worlds/open", json={"id": "Campaign A"})

    assert response.status_code == 200
    body = response.json()
    assert body["current"]["id"] == "Campaign A"
    tree = client.get("/api/world/tree").json()
    assert tree["name"] == "Campaign A"
    assert tree["children"][0]["path"] == "README.md"


def test_creating_world_adds_library_folder_and_opens_it(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    worlds_root.mkdir()
    client = make_client(fallback_world, worlds_root)

    response = client.post("/api/worlds", json={"name": "New Campaign"})

    assert response.status_code == 200
    body = response.json()
    assert body["current"]["id"] == "New Campaign"
    assert [world["id"] for world in body["worlds"]] == ["New Campaign"]
    assert [world["id"] for world in body["recent"]] == ["New Campaign"]
    assert (worlds_root / "New Campaign").is_dir()
    assert client.get("/api/world/tree").json()["name"] == "New Campaign"


def test_create_world_rejects_existing_and_unsafe_names(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    (worlds_root / "Existing").mkdir(parents=True)
    client = make_client(fallback_world, worlds_root)

    assert client.post("/api/worlds", json={"name": "Existing"}).status_code == 409
    assert client.post("/api/worlds", json={"name": "../escape"}).status_code == 400
    assert client.post("/api/worlds", json={"name": ".hidden"}).status_code == 400


def test_open_rejects_traversal_and_unknown_world(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    worlds_root.mkdir()
    client = make_client(fallback_world, worlds_root)

    assert client.post("/api/worlds/open", json={"id": "../escape"}).status_code == 400
    assert client.post("/api/worlds/open", json={"id": "Missing"}).status_code == 404


def test_recent_worlds_preserve_order_and_deduplicate(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    (worlds_root / "A").mkdir(parents=True)
    (worlds_root / "B").mkdir()
    client = make_client(fallback_world, worlds_root)

    response = client.put("/api/worlds/recent", json={"recent": ["A", "B", "A", "Missing"]})

    assert response.status_code == 200
    assert [world["id"] for world in response.json()["recent"]] == ["A", "B"]
    assert [world["id"] for world in client.get("/api/worlds").json()["recent"]] == ["A", "B"]


def test_open_world_is_restored_after_a_restart(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    campaign = worlds_root / "Campaign A"
    campaign.mkdir(parents=True)
    (campaign / "README.md").write_text("# Campaign A\n", encoding="utf-8")
    client = make_client(fallback_world, worlds_root)
    assert client.post("/api/worlds/open", json={"id": "Campaign A"}).status_code == 200

    restarted = restart_server(fallback_world, worlds_root)

    # The appliance watchdog restarts the server on a crash or a hung health
    # probe, and Windows Update reboots it. Coming back on the fallback world
    # would silently change what the table is looking at.
    assert restarted.get("/api/worlds/current").json()["current"]["id"] == "Campaign A"
    assert restarted.get("/api/world/tree").json()["name"] == "Campaign A"


def test_restart_falls_back_when_the_remembered_world_is_gone(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    campaign = worlds_root / "Campaign A"
    campaign.mkdir(parents=True)
    client = make_client(fallback_world, worlds_root)
    assert client.post("/api/worlds/open", json={"id": "Campaign A"}).status_code == 200
    shutil.rmtree(campaign)

    restarted = restart_server(fallback_world, worlds_root)

    assert restarted.get("/api/worlds/current").json()["current"]["path"] == str(
        fallback_world.resolve()
    )


def test_restart_ignores_a_remembered_world_outside_the_library(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    outsider = tmp_path / "outsider"
    outsider.mkdir()
    worlds_root = tmp_path / "worlds"
    (worlds_root / "Campaign A").mkdir(parents=True)

    # The state file is plain JSON next to the library, so it can be stale,
    # hand-edited, or carried over from another machine. "C:" is here because it
    # is drive-relative rather than traversing: it joins to the library root
    # itself, which passes a naive containment check.
    for smuggled in ("../outsider", str(outsider), "..", "/etc", "C:", "."):
        app_state_path(worlds_root).write_text(
            json.dumps({"active_world": smuggled}), encoding="utf-8"
        )
        restarted = restart_server(fallback_world, worlds_root)

        current = restarted.get("/api/worlds/current").json()["current"]
        assert current["path"] == str(fallback_world.resolve()), smuggled


def test_open_rejects_a_drive_relative_world_id(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    (worlds_root / "Campaign A").mkdir(parents=True)
    client = make_client(fallback_world, worlds_root)

    assert client.post("/api/worlds/open", json={"id": "C:"}).status_code == 400


def test_restart_ignores_a_state_file_it_cannot_read(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    campaign = worlds_root / "Campaign A"
    campaign.mkdir(parents=True)
    client = make_client(fallback_world, worlds_root)
    assert client.post("/api/worlds/open", json={"id": "Campaign A"}).status_code == 200

    # Saved as UTF-16 by a text editor, or an ANSI hand edit with a non-ASCII
    # world name. This is read during startup, so raising here would put the
    # appliance into a restart loop rather than merely losing the choice.
    app_state_path(worlds_root).write_bytes(
        json.dumps({"active_world": "Campaign A"}).encode("utf-16")
    )
    _ACTIVE_WORLDS.clear()

    with TestClient(make_app(fallback_world, worlds_root)) as restarted:
        current = restarted.get("/api/worlds/current").json()["current"]
        assert current["path"] == str(fallback_world.resolve())


def test_restart_ignores_a_non_string_remembered_world(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    (worlds_root / "Campaign A").mkdir(parents=True)
    app_state_path(worlds_root).write_text(
        json.dumps({"active_world": ["Campaign A"]}), encoding="utf-8"
    )

    restarted = restart_server(fallback_world, worlds_root)

    assert restarted.get("/api/worlds/current").json()["current"]["path"] == str(
        fallback_world.resolve()
    )


def test_remembering_the_open_world_keeps_the_recent_list(tmp_path: Path) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    (worlds_root / "A").mkdir(parents=True)
    (worlds_root / "B").mkdir()
    client = make_client(fallback_world, worlds_root)
    client.put("/api/worlds/recent", json={"recent": ["A", "B"]})

    assert client.post("/api/worlds/open", json={"id": "B"}).status_code == 200

    # Both live in one state file, written by two separate read-modify-writes.
    state = json.loads(app_state_path(worlds_root).read_text(encoding="utf-8"))
    assert state["active_world"] == "B"
    assert state["recent_worlds"] == ["B", "A"]


def test_active_world_is_read_from_disk_only_once(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    fallback_world = tmp_path / "fallback"
    fallback_world.mkdir()
    worlds_root = tmp_path / "worlds"
    worlds_root.mkdir()
    _ACTIVE_WORLDS.clear()
    reads = 0
    original = world_library._read_state

    def counting_read(root: Path) -> dict[str, object]:
        nonlocal reads
        reads += 1
        return original(root)

    monkeypatch.setattr(world_library, "_read_state", counting_read)

    # resolved_world_root is evaluated on essentially every request, so a library
    # with nothing stored must not go back to the disk each time.
    for _ in range(3):
        world_library.get_active_world_root(worlds_root, fallback_world)

    assert reads == 1
