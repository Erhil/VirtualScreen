from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


def make_client(world: Path, access_token: str | None = None) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(
        world_root=world,
        access_token=access_token,
    )
    return TestClient(app)


def make_world(tmp_path: Path) -> Path:
    world = tmp_path / "world"
    (world / "Media").mkdir(parents=True)
    (world / ".music" / "effects").mkdir(parents=True)
    (world / "README.md").write_text("# Home\n", encoding="utf-8")
    (world / "Handout.md").write_text("# Letter\n", encoding="utf-8")
    (world / "Media" / "map.svg").write_text("<svg></svg>", encoding="utf-8")
    (world / "Media" / "other.svg").write_text("<svg></svg>", encoding="utf-8")
    (world / ".music" / "effects" / "bell.mp3").write_bytes(b"mp3")
    return world


def tab(path: str, name: str, media_kind: str, title: str | None = None) -> dict[str, object]:
    return {"path": path, "name": name, "title": title, "mediaKind": media_kind}


def split_layout() -> dict[str, object]:
    return {
        "mode": "vertical_split",
        "activePaneId": "secondary",
        "panes": [
            {"id": "main", "activePath": "README.md"},
            {"id": "secondary", "activePath": "Handout.md"},
        ],
        "splitRatio": 0.6,
    }


def seed_table_state(client: TestClient) -> None:
    assert (
        client.put(
            "/api/workspace/tabs",
            json={
                "tabs": [
                    tab("README.md", "README.md", "markdown", "Home"),
                    tab("Handout.md", "Handout.md", "markdown", "Letter"),
                ],
                "activePath": "Handout.md",
            },
        ).status_code
        == 200
    )
    assert client.put("/api/workspace/layout", json={"layout": split_layout()}).status_code == 200
    assert client.put("/api/display/fullscreen", json={"path": "README.md"}).status_code == 200
    assert client.post("/api/display/popup", json={"path": "Handout.md"}).status_code == 200
    assert client.put("/api/map/source", json={"path": "Media/map.svg"}).status_code == 200
    assert client.put("/api/map/fog", json={"enabled": True}).status_code == 200
    assert client.post("/api/map/present").status_code == 200


def snapshot_state(
    client: TestClient,
    audio: dict[str, object] | None = None,
) -> dict[str, object]:
    workspace = client.get("/api/workspace").json()
    return {
        "display": client.get("/api/display/state").json(),
        "map": client.get("/api/map/state").json(),
        "workspace": {
            "workspace_id": workspace["workspaceId"],
            "workspace_name": workspace["workspaceName"],
            "tabs": workspace["tabs"],
            "activePath": workspace["activePath"],
            "layout": workspace["layout"],
        },
        "audio": audio
        or {
            "ambient": {"track": None, "volume": 0.8, "loop": False, "playing": False},
            "music": {"track": None, "volume": 0.8, "loop": False, "playing": False},
            "effect": {"track": None, "volume": 0.8, "loop": False, "playing": False},
        },
    }


def test_table_snapshot_create_list_and_detail(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    seed_table_state(client)
    audio = {
        "ambient": {"track": None, "volume": 0.8, "loop": False, "playing": False},
        "music": {"track": None, "volume": 0.8, "loop": False, "playing": False},
        "effect": {
            "track": {"path": ".music/effects/bell.mp3"},
            "volume": 0.4,
            "loop": True,
            "playing": True,
        },
    }

    created = client.post(
        "/api/table-snapshots",
        json={"name": "  Opening Table  ", "state": snapshot_state(client, audio)},
    )

    assert created.status_code == 200
    snapshot = created.json()
    state = snapshot["state"]
    assert snapshot["name"] == "Opening Table"
    assert state["workspace"]["activePath"] == "Handout.md"
    assert state["workspace"]["layout"] == split_layout()
    assert state["display"]["fullscreen"] is None
    assert state["display"]["popups"][0]["path"] == "Handout.md"
    assert state["map"]["image_path"] == "Media/map.svg"
    assert state["map"]["presenting"] is True
    assert state["audio"]["effect"]["track"]["path"] == ".music/effects/bell.mp3"
    assert state["audio"]["effect"]["playing"] is True
    assert snapshot["updated_at"]

    listed = client.get("/api/table-snapshots")
    assert listed.status_code == 200
    assert listed.json() == [
        {"id": snapshot["id"], "name": "Opening Table", "updated_at": snapshot["updated_at"]}
    ]

    detail = client.get(f"/api/table-snapshots/{snapshot['id']}")
    assert detail.status_code == 200
    assert detail.json() == snapshot


def test_table_snapshot_validates_names_and_unique_names(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    state = snapshot_state(client)

    assert (
        client.post("/api/table-snapshots", json={"name": "   ", "state": state}).status_code
        == 400
    )
    assert (
        client.post("/api/table-snapshots", json={"name": "x" * 81, "state": state}).status_code
        == 400
    )
    assert (
        client.post("/api/table-snapshots", json={"name": "Session", "state": state}).status_code
        == 200
    )
    assert (
        client.post("/api/table-snapshots", json={"name": "Session", "state": state}).status_code
        == 400
    )


def test_table_snapshot_save_validates_requested_paths(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    state = snapshot_state(client)
    state["display"]["fullscreen"] = {
        "path": "Missing.md",
        "title": None,
        "name": "Missing.md",
        "media_kind": "markdown",
    }
    bad_audio = snapshot_state(
        client,
        {
            "ambient": {"track": None, "volume": 0.8, "loop": False, "playing": False},
            "music": {"track": None, "volume": 0.8, "loop": False, "playing": False},
            "effect": {
                "track": {"path": ".music/effects/missing.mp3"},
                "volume": 0.8,
                "loop": False,
                "playing": True,
            },
        },
    )

    assert (
        client.post(
            "/api/table-snapshots",
            json={"name": "Broken display", "state": state},
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/table-snapshots",
            json={"name": "Broken audio", "state": bad_audio},
        ).status_code
        == 409
    )


def test_table_snapshot_restore_replaces_backend_state_and_publishes_events(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    seed_table_state(client)
    snapshot = client.post(
        "/api/table-snapshots",
        json={"name": "Opening", "state": snapshot_state(client)},
    ).json()

    assert (
        client.put("/api/workspace/tabs", json={"tabs": [], "activePath": None}).status_code
        == 200
    )
    assert client.post("/api/display/blank").status_code == 200
    assert client.put("/api/map/source", json={"path": "Media/other.svg"}).status_code == 200

    with client.websocket_connect("/ws/display") as display_socket:
        with client.websocket_connect("/ws/map") as map_socket:
            restored = client.post(f"/api/table-snapshots/{snapshot['id']}/restore")
            display_event = display_socket.receive_json()
            map_event = map_socket.receive_json()

    assert restored.status_code == 200
    body = restored.json()
    assert body["snapshot"]["id"] == snapshot["id"]
    assert body["workspace"]["activePath"] == "Handout.md"
    assert body["workspace"]["layout"] == split_layout()
    assert body["display"]["fullscreen"] is None
    assert body["map"]["image_path"] == "Media/map.svg"
    assert body["map"]["presenting"] is True
    assert display_event["fullscreen"] is None
    assert map_event["image_path"] == "Media/map.svg"
    assert map_event["presenting"] is True
    assert client.get("/api/workspace").json()["tabs"] == snapshot["state"]["workspace"]["tabs"]


def test_table_snapshot_restore_missing_refs_is_conflict_and_keeps_state(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    client = make_client(world)
    seed_table_state(client)
    snapshot = client.post(
        "/api/table-snapshots",
        json={"name": "Opening", "state": snapshot_state(client)},
    ).json()

    assert client.put("/api/display/fullscreen", json={"path": "Handout.md"}).status_code == 200
    assert client.put("/api/map/source", json={"path": "Media/other.svg"}).status_code == 200
    (world / "Media" / "map.svg").unlink()

    restored = client.post(f"/api/table-snapshots/{snapshot['id']}/restore")

    assert restored.status_code == 409
    assert client.get("/api/display/state").json()["fullscreen"]["path"] == "Handout.md"
    assert client.get("/api/map/state").json()["image_path"] == "Media/other.svg"


def test_table_snapshot_restore_missing_workspace_is_conflict(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    created_workspace = client.post("/api/workspaces", json={"name": "Combat"}).json()
    snapshot = client.post(
        "/api/table-snapshots",
        json={"name": "Combat state", "state": snapshot_state(client)},
    ).json()

    assert client.post("/api/workspaces/default/activate").status_code == 200
    assert client.delete(f"/api/workspaces/{created_workspace['workspaceId']}").status_code == 200

    restored = client.post(f"/api/table-snapshots/{snapshot['id']}/restore")

    assert restored.status_code == 409
    assert client.get("/api/workspace").json()["workspaceId"] == "default"


def test_table_snapshot_delete(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    snapshot = client.post(
        "/api/table-snapshots",
        json={"name": "To delete", "state": snapshot_state(client)},
    ).json()

    deleted = client.delete(f"/api/table-snapshots/{snapshot['id']}")

    assert deleted.status_code == 200
    assert deleted.json() == {"deleted": True}
    assert client.get(f"/api/table-snapshots/{snapshot['id']}").status_code == 404
    assert client.delete(f"/api/table-snapshots/{snapshot['id']}").status_code == 404


def test_table_snapshot_routes_are_lan_auth_protected(tmp_path: Path, monkeypatch) -> None:
    world = make_world(tmp_path)
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", "secret")
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(world))
    get_settings.cache_clear()
    client = TestClient(create_app())

    assert client.get("/api/table-snapshots").status_code == 401
    assert (
        client.get(
            "/api/table-snapshots",
            headers={"X-VirtualScreen-Token": "secret"},
        ).status_code
        == 200
    )
    get_settings.cache_clear()
