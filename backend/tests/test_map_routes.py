import json
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.database import initialize_database
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_cached_settings(monkeypatch):
    monkeypatch.delenv("VIRTUALSCREEN_ACCESS_TOKEN", raising=False)
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def make_client(world: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(
        world_root=world,
    )
    return TestClient(app)


def make_auth_client(monkeypatch) -> TestClient:
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", "secret")
    get_settings.cache_clear()
    return TestClient(create_app())


def make_world(tmp_path: Path) -> Path:
    world = tmp_path / "world"
    media = world / "Media"
    media.mkdir(parents=True)
    (world / "README.md").write_text("# Home\n", encoding="utf-8")
    (media / "map.svg").write_text("<svg></svg>", encoding="utf-8")
    (media / "secret.png").write_bytes(b"secret")
    (media / "clip.mp4").write_bytes(b"\x00\x00\x00\x18ftypmp42")
    (media / "handout.pdf").write_bytes(b"%PDF-1.4\n")
    (world / ".music" / "effects").mkdir(parents=True)
    (world / ".music" / "effects" / "glass.mp3").write_bytes(b"mp3")
    (world / ".virtualscreen").mkdir()
    (world / ".virtualscreen" / "hidden.svg").write_text("<svg></svg>", encoding="utf-8")
    return world


def test_map_state_starts_blank(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.get("/api/map/state")

    assert response.status_code == 200
    assert response.json()["image_path"] is None
    assert response.json()["viewport"] == {"center_x": 0.5, "center_y": 0.5, "zoom": 1.0}
    assert response.json()["fog_enabled"] is False
    assert response.json()["grid"] == {
        "enabled": False,
        "columns": 10,
        "rows": 10,
        "visible_to_players": True,
    }
    assert response.json()["reveals"] == []
    assert response.json()["pins"] == []
    assert response.json()["presenting"] is False


def test_map_source_accepts_existing_world_image(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.put("/api/map/source", json={"path": "Media/map.svg"})

    assert response.status_code == 200
    body = response.json()
    assert body["image_path"] == "Media/map.svg"
    assert body["title"] == "map"
    assert body["presenting"] is False


def test_map_source_rejects_unsafe_and_non_image_paths(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    cases = [
        ("../map.svg", 400),
        ("Media", 400),
        (".virtualscreen/hidden.svg", 400),
        (".music/effects/glass.mp3", 400),
        ("Media/missing.svg", 404),
        ("Media/clip.mp4", 415),
        ("Media/handout.pdf", 415),
        ("README.md", 415),
    ]

    for path, status in cases:
        response = client.put("/api/map/source", json={"path": path})
        assert response.status_code == status, path


def test_map_viewport_fog_reveals_and_pins_persist(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    assert client.put("/api/map/source", json={"path": "Media/map.svg"}).status_code == 200

    viewport = client.put(
        "/api/map/viewport",
        json={"center_x": -1, "center_y": 2, "zoom": 99},
    )
    fog = client.put("/api/map/fog", json={"enabled": True})
    reveal = client.post(
        "/api/map/reveals",
        json={"x": 0.7, "y": 0.8, "width": -0.2, "height": -0.3},
    )
    pin = client.post("/api/map/pins", json={"x": 2, "y": -1, "label": "  Gate  "})

    assert viewport.status_code == 200
    assert viewport.json()["viewport"] == {"center_x": 0.0, "center_y": 1.0, "zoom": 6.0}
    assert fog.status_code == 200
    assert fog.json()["fog_enabled"] is True
    assert reveal.status_code == 200
    assert reveal.json()["reveals"][0]["x"] == 0.5
    assert reveal.json()["reveals"][0]["y"] == 0.5
    assert reveal.json()["reveals"][0]["width"] == 0.2
    assert reveal.json()["reveals"][0]["height"] == 0.3
    assert pin.status_code == 200
    assert pin.json()["pins"][0]["x"] == 1.0
    assert pin.json()["pins"][0]["y"] == 0.0
    assert pin.json()["pins"][0]["label"] == "Gate"
    assert pin.json()["pins"][0]["visibility"] == "player"

    state = client.get("/api/map/state").json()
    assert state["fog_enabled"] is True
    assert len(state["reveals"]) == 1
    assert len(state["pins"]) == 1

    assert client.delete(f"/api/map/pins/{state['pins'][0]['id']}").status_code == 200
    assert client.delete(f"/api/map/reveals/{state['reveals'][0]['id']}").status_code == 200
    cleared = client.delete("/api/map/reveals")
    assert cleared.status_code == 200
    assert cleared.json()["reveals"] == []


def test_map_reveals_accept_legacy_rect_reveal_and_rect_hide(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    legacy_reveal = client.post(
        "/api/map/reveals",
        json={"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.4},
    )
    rect_hide = client.post(
        "/api/map/reveals",
        json={"action": "hide", "shape": "rect", "x": 0.5, "y": 0.6, "width": 0.2, "height": 0.1},
    )

    assert legacy_reveal.status_code == 200
    assert rect_hide.status_code == 200
    reveals = rect_hide.json()["reveals"]
    assert reveals[0]["action"] == "reveal"
    assert reveals[0]["shape"] == "rect"
    assert reveals[0]["x"] == 0.1
    assert reveals[0]["y"] == 0.2
    assert reveals[0]["width"] == 0.3
    assert reveals[0]["height"] == 0.4
    assert reveals[1]["action"] == "hide"
    assert reveals[1]["shape"] == "rect"
    assert reveals[1]["x"] == 0.5
    assert reveals[1]["y"] == 0.6
    assert reveals[1]["width"] == 0.2
    assert reveals[1]["height"] == 0.1


def test_map_polygon_reveal_and_hide_persist(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    points = [{"x": 0.1, "y": 0.2}, {"x": 0.4, "y": 0.25}, {"x": 0.2, "y": 0.6}]

    reveal = client.post(
        "/api/map/reveals",
        json={"action": "reveal", "shape": "polygon", "points": points},
    )
    hide = client.post(
        "/api/map/reveals",
        json={"action": "hide", "shape": "polygon", "points": points},
    )

    assert reveal.status_code == 200
    assert hide.status_code == 200
    persisted = client.get("/api/map/state").json()["reveals"]
    assert [operation["action"] for operation in persisted] == ["reveal", "hide"]
    assert [operation["shape"] for operation in persisted] == ["polygon", "polygon"]
    assert persisted[0]["points"] == points
    assert persisted[1]["points"] == points


@pytest.mark.parametrize(
    ("payload", "detail"),
    [
        (
            {"action": "erase", "shape": "rect", "x": 0.1, "y": 0.2, "width": 0.3, "height": 0.4},
            "Map reveal action must be 'reveal' or 'hide'.",
        ),
        (
            {"shape": "polygon", "points": [{"x": 0.1, "y": 0.2}, {"x": 0.3, "y": 0.4}]},
            "Map polygon reveal must have at least three points.",
        ),
        (
            {
                "shape": "polygon",
                "points": [{"x": 0.1, "y": 0.2}] * 33,
            },
            "Map polygon reveal cannot have more than 32 points.",
        ),
        (
            {
                "shape": "polygon",
                "points": [{"x": 0.1, "y": 0.2}] * 3,
            },
            "Map polygon reveal must have at least three distinct points.",
        ),
        (
            {
                "shape": "polygon",
                "points": [{"x": 0.1, "y": 0.2}, {"x": 0.3}, {"x": 0.4, "y": 0.5}],
            },
            "Map polygon reveal points require x and y.",
        ),
        (
            {"shape": "rect", "x": 0.1, "y": 0.2, "width": 0.0, "height": 0.4},
            "Map reveal must have positive width and height.",
        ),
    ],
)
def test_map_reveal_operations_validate_inputs(
    tmp_path: Path,
    payload: dict[str, object],
    detail: str,
) -> None:
    client = make_client(make_world(tmp_path))

    response = client.post("/api/map/reveals", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == detail


def test_map_grid_clamps_and_persists(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.put(
        "/api/map/grid",
        json={"enabled": True, "columns": -10, "rows": 999, "visible_to_players": False},
    )

    assert response.status_code == 200
    assert response.json()["grid"] == {
        "enabled": True,
        "columns": 1,
        "rows": 200,
        "visible_to_players": False,
    }
    assert client.get("/api/map/state").json()["grid"] == response.json()["grid"]


def test_map_pin_visibility_is_validated_and_public_state_is_filtered(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    assert client.put("/api/map/source", json={"path": "Media/map.svg"}).status_code == 200

    player_pin = client.post("/api/map/pins", json={"x": 0.2, "y": 0.3, "label": "Gate"})
    dm_pin = client.post(
        "/api/map/pins",
        json={"x": 0.7, "y": 0.8, "label": "Trap", "visibility": "dm"},
    )
    invalid_pin = client.post(
        "/api/map/pins",
        json={"x": 0.1, "y": 0.1, "label": "Bad", "visibility": "party"},
    )
    hidden_grid = client.put(
        "/api/map/grid",
        json={"enabled": True, "columns": 25, "rows": 30, "visible_to_players": False},
    )
    assert client.post("/api/map/present").status_code == 200

    assert player_pin.status_code == 200
    assert player_pin.json()["pins"][0]["visibility"] == "player"
    assert dm_pin.status_code == 200
    assert dm_pin.json()["pins"][1]["visibility"] == "dm"
    assert invalid_pin.status_code == 400
    assert hidden_grid.status_code == 200

    dm_state = client.get("/api/map/state").json()
    public_state = client.get("/api/screen/map/state").json()

    assert [pin["label"] for pin in dm_state["pins"]] == ["Gate", "Trap"]
    assert [pin["label"] for pin in public_state["pins"]] == ["Gate"]
    assert dm_state["grid"]["enabled"] is True
    assert public_state["grid"] == {
        "enabled": False,
        "columns": 25,
        "rows": 30,
        "visible_to_players": False,
    }


def test_map_present_stop_and_public_media_restrictions(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    assert client.get("/api/screen/map/state").json()["image_path"] is None
    assert client.get("/api/screen/map/media", params={"path": "Media/map.svg"}).status_code == 403

    assert client.put("/api/map/source", json={"path": "Media/map.svg"}).status_code == 200
    present = client.post("/api/map/present")

    assert present.status_code == 200
    assert present.json()["presenting"] is True
    assert client.get("/api/screen/map/state").json()["image_path"] == "Media/map.svg"
    assert client.get("/api/screen/map/media", params={"path": "Media/map.svg"}).status_code == 200
    secret_response = client.get("/api/screen/map/media", params={"path": "Media/secret.png"})
    assert secret_response.status_code == 403

    stopped = client.post("/api/map/stop")
    assert stopped.status_code == 200
    assert stopped.json()["presenting"] is False
    assert client.get("/api/screen/map/state").json()["image_path"] is None


def test_map_websocket_receives_mutation_events(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    with client.websocket_connect("/ws/map") as websocket:
        grid_response = client.put(
            "/api/map/grid",
            json={"enabled": True, "columns": 12, "rows": 8},
        )
        assert grid_response.status_code == 200
        grid_event = websocket.receive_json()

        pin_response = client.post(
            "/api/map/pins",
            json={"x": 0.4, "y": 0.6, "label": "Gate", "visibility": "dm"},
        )
        assert pin_response.status_code == 200
        pin_event = websocket.receive_json()

    assert grid_event["grid"]["enabled"] is True
    assert grid_event["grid"]["columns"] == 12
    assert pin_event["pins"][0]["visibility"] == "dm"


def test_map_presets_public_state_and_websocket_preserve_extended_reveals(
    tmp_path: Path,
) -> None:
    client = make_client(make_world(tmp_path))
    points = [{"x": 0.1, "y": 0.2}, {"x": 0.4, "y": 0.25}, {"x": 0.2, "y": 0.6}]
    assert client.put("/api/map/source", json={"path": "Media/map.svg"}).status_code == 200
    assert client.post("/api/map/present").status_code == 200

    with client.websocket_connect("/ws/screen/map") as websocket:
        hide = client.post(
            "/api/map/reveals",
            json={"action": "hide", "shape": "polygon", "points": points},
        )
        assert hide.status_code == 200
        event = websocket.receive_json()

    assert event["reveals"][0]["action"] == "hide"
    assert event["reveals"][0]["shape"] == "polygon"
    assert event["reveals"][0]["points"] == points
    assert client.get("/api/screen/map/state").json()["reveals"][0]["points"] == points

    saved = client.post("/api/map/presets", json={"name": "Fog Ops"})
    assert saved.status_code == 200
    assert saved.json()["state"]["reveals"][0]["action"] == "hide"
    assert saved.json()["state"]["reveals"][0]["shape"] == "polygon"
    assert saved.json()["state"]["reveals"][0]["points"] == points

    assert client.delete("/api/map/reveals").status_code == 200
    loaded = client.post(f"/api/map/presets/{saved.json()['id']}/load")

    assert loaded.status_code == 200
    assert loaded.json()["reveals"][0]["action"] == "hide"
    assert loaded.json()["reveals"][0]["shape"] == "polygon"
    assert loaded.json()["reveals"][0]["points"] == points


def test_map_presets_save_list_load_and_delete_state(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    assert client.put("/api/map/source", json={"path": "Media/map.svg"}).status_code == 200
    assert client.put("/api/map/fog", json={"enabled": True}).status_code == 200
    assert client.put(
        "/api/map/grid",
        json={"enabled": True, "columns": 12, "rows": 8, "visible_to_players": False},
    ).status_code == 200
    assert client.post(
        "/api/map/reveals",
        json={"x": 0.1, "y": 0.2, "width": 0.3, "height": 0.4},
    ).status_code == 200
    assert client.post(
        "/api/map/pins",
        json={"x": 0.4, "y": 0.6, "label": "Secret", "visibility": "dm"},
    ).status_code == 200

    saved = client.post("/api/map/presets", json={"name": "Dungeon Level 1"})

    assert saved.status_code == 200
    preset = saved.json()
    assert preset["name"] == "Dungeon Level 1"
    assert preset["state"]["image_path"] == "Media/map.svg"
    assert preset["state"]["fog_enabled"] is True
    assert preset["state"]["grid"]["columns"] == 12
    assert preset["state"]["pins"][0]["visibility"] == "dm"

    listed = client.get("/api/map/presets")
    assert listed.status_code == 200
    assert listed.json()["presets"][0]["id"] == preset["id"]

    assert client.put("/api/map/source", json={"path": "Media/secret.png"}).status_code == 200
    loaded = client.post(f"/api/map/presets/{preset['id']}/load")

    assert loaded.status_code == 200
    assert loaded.json()["image_path"] == "Media/map.svg"
    assert loaded.json()["fog_enabled"] is True
    assert loaded.json()["grid"]["visible_to_players"] is False
    assert loaded.json()["pins"][0]["label"] == "Secret"

    deleted = client.delete(f"/api/map/presets/{preset['id']}")
    assert deleted.status_code == 200
    assert client.get("/api/map/presets").json()["presets"] == []
    assert client.post(f"/api/map/presets/{preset['id']}/load").status_code == 404


def test_map_preset_can_save_visible_client_state(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    assert client.put("/api/map/source", json={"path": "Media/map.svg"}).status_code == 200

    visible_state = client.get("/api/map/state").json()
    visible_state["grid"] = {
        "enabled": True,
        "columns": 9,
        "rows": 7,
        "visible_to_players": True,
    }
    visible_state["fog_enabled"] = True

    saved = client.post(
        "/api/map/presets",
        json={"name": "Visible State", "state": visible_state},
    )

    assert saved.status_code == 200
    assert saved.json()["state"]["grid"] == {
        "enabled": True,
        "columns": 9,
        "rows": 7,
        "visible_to_players": True,
    }
    assert saved.json()["state"]["fog_enabled"] is True


def test_map_presets_validate_names_and_sources(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    assert client.post("/api/map/presets", json={"name": "No source"}).status_code == 400
    assert client.put("/api/map/source", json={"path": "Media/map.svg"}).status_code == 200
    assert client.post("/api/map/presets", json={"name": "   "}).status_code == 400

    saved = client.post("/api/map/presets", json={"name": "To Break"})
    assert saved.status_code == 200
    (tmp_path / "world" / "Media" / "map.svg").unlink()

    assert client.post(f"/api/map/presets/{saved.json()['id']}/load").status_code == 404


def test_screen_map_websocket_receives_filtered_mutation_events(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    assert client.put("/api/map/source", json={"path": "Media/map.svg"}).status_code == 200
    assert client.post("/api/map/present").status_code == 200

    with client.websocket_connect("/ws/screen/map") as websocket:
        grid_response = client.put(
            "/api/map/grid",
            json={"enabled": True, "columns": 12, "rows": 8, "visible_to_players": False},
        )
        assert grid_response.status_code == 200
        grid_event = websocket.receive_json()

        pin_response = client.post(
            "/api/map/pins",
            json={"x": 0.4, "y": 0.6, "label": "Trap", "visibility": "dm"},
        )
        assert pin_response.status_code == 200
        pin_event = websocket.receive_json()

    assert grid_event["grid"]["enabled"] is False
    assert grid_event["grid"]["visible_to_players"] is False
    assert pin_event["pins"] == []


def test_legacy_map_json_loads_without_grid_or_pin_visibility(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    conn = initialize_database(world)
    with conn:
        conn.execute(
            """
            insert into map_state(id, state_json, updated_at)
            values (1, ?, ?)
            """,
            (
                json.dumps(
                    {
                        "image_path": "Media/map.svg",
                        "title": "map",
                        "viewport": {"center_x": 0.5, "center_y": 0.5, "zoom": 1.0},
                        "fog_enabled": False,
                        "reveals": [],
                        "pins": [{"id": "pin-1", "x": 0.2, "y": 0.3, "label": "Gate"}],
                        "presenting": True,
                    }
                ),
                "2026-05-11T12:00:00Z",
            ),
        )
    conn.close()
    client = make_client(world)

    response = client.get("/api/map/state")

    assert response.status_code == 200
    assert response.json()["grid"] == {
        "enabled": False,
        "columns": 10,
        "rows": 10,
        "visible_to_players": True,
    }
    assert response.json()["pins"] == [
        {"id": "pin-1", "x": 0.2, "y": 0.3, "label": "Gate", "visibility": "player"}
    ]


def test_screen_map_routes_are_public_but_dm_map_routes_are_protected(
    tmp_path: Path,
    monkeypatch,
) -> None:
    world = make_world(tmp_path)
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(world))
    client = make_auth_client(monkeypatch)

    assert client.get("/api/screen/map/state").status_code == 200
    assert client.get("/api/map/state").status_code == 401
    assert client.put("/api/map/source", json={"path": "Media/map.svg"}).status_code == 401
    assert client.put("/api/map/grid", json={"enabled": True}).status_code == 401

    unlocked = client.put(
        "/api/map/source",
        json={"path": "Media/map.svg"},
        headers={"X-VirtualScreen-Token": "secret"},
    )
    assert unlocked.status_code == 200
    unlocked_grid = client.put(
        "/api/map/grid",
        json={"enabled": True},
        headers={"X-VirtualScreen-Token": "secret"},
    )
    assert unlocked_grid.status_code == 200

    with client.websocket_connect("/ws/screen/map") as websocket:
        websocket.send_text("ping")
