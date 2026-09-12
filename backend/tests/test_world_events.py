import asyncio
from pathlib import Path

import pytest
from fastapi import WebSocketDisconnect
from helpers import make_client
from watchfiles import Change

from app.core import watcher as watcher_module
from app.core.hub import EventHub
from app.core.watcher import (
    WatcherManager,
    event_reason,
    is_ignored_world_path,
    summarize_watch_changes,
)


class _FakeWebSocket:
    """A stand-in for a client that may or may not still be listening."""

    def __init__(self, *, disconnected: bool = False) -> None:
        self.disconnected = disconnected
        self.received: list[dict[str, object]] = []

    async def accept(self) -> None:
        return None

    async def send_json(self, data: dict[str, object]) -> None:
        if self.disconnected:
            raise WebSocketDisconnect(code=1006)
        self.received.append(data)


@pytest.fixture
def temp_world(tmp_path: Path) -> Path:
    world = tmp_path / "world"
    (world / "NPCs").mkdir(parents=True)
    (world / "README.md").write_text(
        "---\n"
        "title: Sample World Guide\n"
        "type: index\n"
        "---\n\n"
        "# Sample World Guide\n",
        encoding="utf-8",
    )
    return world


def test_watch_ignore_predicate_excludes_internal_and_temp_paths() -> None:
    ignored_paths = [
        ".virtualscreen/virtualscreen.sqlite3",
        ".virtualscreen/backups/20260101-120000/README.md",
        ".virtualscreen/trash/20260101-120000/README.md",
        ".git/index",
        "__pycache__/module.pyc",
        "NPCs/.#Captain.md",
        "NPCs/Captain.md.tmp",
        "NPCs/Captain.md~",
        "NPCs/~$Captain.md",
    ]

    for relative_path in ignored_paths:
        assert is_ignored_world_path(relative_path)

    assert not is_ignored_world_path("NPCs/Captain Ilyra.md")


def test_watch_summary_normalizes_paths_and_reason(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    created = world / "NPCs" / "New.md"
    changed = world / "Tables" / "random-events.csv"
    deleted = world / "Old.md"

    changes = {
        (Change.added, str(created)),
        (Change.modified, str(changed)),
        (Change.deleted, str(deleted)),
        (Change.modified, str(world / ".virtualscreen" / "virtualscreen.sqlite3")),
    }

    summary = summarize_watch_changes(world, changes)

    assert summary.paths == ["NPCs/New.md", "Tables/random-events.csv"]
    assert summary.deleted_paths == ["Old.md"]
    assert summary.reason == "mixed"


def test_watch_summary_treats_delete_add_same_path_as_modified(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    changed = world / "README.md"

    summary = summarize_watch_changes(
        world,
        {
            (Change.deleted, str(changed)),
            (Change.added, str(changed)),
        },
    )

    assert summary.paths == ["README.md"]
    assert summary.deleted_paths == []
    assert summary.reason == "modified"


def test_event_reason_handles_single_kind_batches() -> None:
    assert event_reason({Change.added}) == "created"
    assert event_reason({Change.modified}) == "modified"
    assert event_reason({Change.deleted}) == "deleted"
    assert event_reason({Change.added, Change.deleted}) == "mixed"


def test_websocket_clients_receive_api_create_event(temp_world: Path) -> None:
    client = make_client(temp_world)

    with client.websocket_connect("/ws/events") as first:
        with client.websocket_connect("/ws/events") as second:
            response = client.post(
                "/api/world/file",
                json={"path": "NPCs/Live Sync.md", "file_type": "markdown"},
            )
            assert response.status_code == 200

            first_event = first.receive_json()
            second_event = second.receive_json()

    for event in [first_event, second_event]:
        assert event["type"] == "world_changed"
        assert event["paths"] == ["NPCs/Live Sync.md"]
        assert event["deleted_paths"] == []
        assert event["reason"] == "created"
        assert event["source"] == "api"
        assert event["rebuilt_at"]


def test_api_writes_publish_modified_mixed_and_deleted_events(temp_world: Path) -> None:
    client = make_client(temp_world)

    file_response = client.get("/api/world/file", params={"path": "README.md"})
    file_response.raise_for_status()
    readme = file_response.json()

    with client.websocket_connect("/ws/events") as websocket:
        save_response = client.put(
            "/api/world/file",
            params={"path": "README.md"},
            json={
                "content": readme["content"] + "\nLive sync note.\n",
                "expected_hash": readme["hash"],
            },
        )
        assert save_response.status_code == 200
        modified_event = websocket.receive_json()

        move_response = client.post(
            "/api/world/path/move",
            json={"path": "README.md", "new_path": "Renamed README.md"},
        )
        assert move_response.status_code == 200
        moved_event = websocket.receive_json()

        trash_response = client.post(
            "/api/world/path/trash",
            json={"path": "Renamed README.md"},
        )
        assert trash_response.status_code == 200
        deleted_event = websocket.receive_json()

    assert modified_event["paths"] == ["README.md"]
    assert modified_event["deleted_paths"] == []
    assert modified_event["reason"] == "modified"
    assert modified_event["source"] == "api"

    assert moved_event["paths"] == ["Renamed README.md"]
    assert moved_event["deleted_paths"] == ["README.md"]
    assert moved_event["reason"] == "mixed"
    assert moved_event["source"] == "api"

    assert deleted_event["paths"] == []
    assert deleted_event["deleted_paths"] == ["Renamed README.md"]
    assert deleted_event["reason"] == "deleted"
    assert deleted_event["source"] == "api"


def test_metadata_save_publishes_modified_event(temp_world: Path) -> None:
    client = make_client(temp_world)

    file_response = client.get("/api/world/file", params={"path": "README.md"})
    file_response.raise_for_status()
    readme = file_response.json()

    with client.websocket_connect("/ws/events") as websocket:
        response = client.put(
            "/api/page/metadata",
            params={"path": "README.md"},
            json={
                "metadata": {
                    "title": "Live Sync Home",
                    "type": "home",
                    "tags": ["live"],
                    "aliases": ["Live Home"],
                    "fields": {},
                },
                "expected_hash": readme["hash"],
            },
        )
        assert response.status_code == 200
        event = websocket.receive_json()

    assert event["paths"] == ["README.md"]
    assert event["deleted_paths"] == []
    assert event["reason"] == "modified"
    assert event["source"] == "api"


@pytest.mark.anyio
async def test_hub_publish_drops_a_dead_subscriber_and_still_reaches_the_rest() -> None:
    # A reloaded page or a closed player screen leaves a websocket that raises
    # WebSocketDisconnect on send. publish() must treat it as gone rather than let it
    # take down the publish (or, upstream, the watcher task doing the publishing).
    hub = EventHub()
    alive = _FakeWebSocket()
    dead = _FakeWebSocket(disconnected=True)
    await hub.connect(alive)
    await hub.connect(dead)

    await hub.publish({"type": "world_changed"})

    assert alive.received == [{"type": "world_changed"}]
    assert alive in hub._clients
    assert dead not in hub._clients


@pytest.mark.anyio
async def test_watcher_manager_start_recovers_from_a_previously_dead_watch_task(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    # Regression for: switching worlds called start() on a new root while the old
    # world's watch task had already died (a publish to a dead subscriber killed it).
    # start() -> stop() used to re-raise that old exception, turning "open a world"
    # into a 500 and leaving no watcher running afterwards.
    call_count = 0

    async def fake_watch_world(_root: Path, _hub: EventHub) -> None:
        nonlocal call_count
        call_count += 1
        if call_count == 1:
            raise RuntimeError("watch loop died publishing to a dead subscriber")
        await asyncio.Event().wait()

    monkeypatch.setattr(watcher_module, "watch_world", fake_watch_world)

    manager = WatcherManager(enabled=True, hub=EventHub())
    first_root = tmp_path / "world-one"
    second_root = tmp_path / "world-two"

    await manager.start(first_root)
    await asyncio.sleep(0)  # let the fake watch task die before we switch worlds
    assert manager._task is not None
    assert manager._task.done()

    await manager.start(second_root)

    assert manager._root == second_root
    assert manager._task is not None
    assert not manager._task.done()

    await manager.stop()
