import json
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.core.database import initialize_database
from app.core.map import map_state_from_payload, save_map_preset
from app.main import create_app


def make_world(tmp_path: Path) -> Path:
    world = tmp_path / "world"
    (world / "NPCs").mkdir(parents=True)
    (world / "README.md").write_text("# Home", encoding="utf-8")
    (world / "NPCs" / "Captain.md").write_text("# Captain", encoding="utf-8")
    (world / "Media").mkdir()
    (world / "Media" / "map.svg").write_text("<svg></svg>", encoding="utf-8")
    (world / "Scripts").mkdir()
    (world / "Scripts" / "hello.dms").write_text("render_md('# Hi')", encoding="utf-8")
    (world / ".music" / "effects").mkdir(parents=True)
    (world / ".music" / "effects" / "glass.mp3").write_bytes(b"mp3")
    (world / ".virtualscreen" / "scenarios" / "create-npc").mkdir(parents=True)
    (world / ".virtualscreen" / "scenarios" / "create-npc" / "scenario.json").write_text(
        '{"id":"create-npc","name":"Create NPC","script":"main.py","inputs":[]}',
        encoding="utf-8",
    )
    (world / ".virtualscreen" / "scenarios" / "create-npc" / "main.py").write_text(
        "print('ok')",
        encoding="utf-8",
    )
    return world


def make_client(world: Path, *, enable_legacy_scenarios: bool = True) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(
        world_root=world,
        enable_legacy_scenarios=enable_legacy_scenarios,
    )
    return TestClient(app)


def slot(position: int, action: dict[str, object]) -> dict[str, object]:
    return {
        "id": f"slot-{position}",
        "position": position,
        "label": f"Slot {position}",
        "icon": None,
        "action": action,
    }


def test_empty_fast_slots_returns_empty_list(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.get("/api/fast-slots")

    assert response.status_code == 200
    assert response.json() == []


def test_fast_slots_round_trip_ordered_actions(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))
    payload = {
        "slots": [
            slot(2, {"kind": "screen_fullscreen"}),
            slot(1, {"kind": "open_file", "path": "README.md"}),
            slot(
                3,
                {
                    "kind": "audio_track",
                    "path": ".music/effects/glass.mp3",
                },
            ),
            slot(
                4,
                {
                    "kind": "script_run",
                    "path": "Scripts/hello.dms",
                },
            ),
        ]
    }

    response = client.put("/api/fast-slots", json=payload)

    assert response.status_code == 200
    assert [item["position"] for item in response.json()] == [1, 2, 3, 4]
    assert response.json()[1]["action"] == {"kind": "screen_fullscreen"}
    assert response.json()[2]["action"] == {
        "kind": "audio_track",
        "path": ".music/effects/glass.mp3",
        "bus": "effect",
        "play": True,
    }
    assert response.json()[3]["action"] == {
        "kind": "script_run",
        "path": "Scripts/hello.dms",
    }
    assert client.get("/api/fast-slots").json() == response.json()


def test_fast_slots_accept_screen_popup_preset(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.put(
        "/api/fast-slots",
        json={
            "slots": [
                slot(1, {"kind": "screen_popup", "path": "README.md", "preset": "letter"}),
                slot(2, {"kind": "screen_popup"}),
            ]
        },
    )
    invalid_response = client.put(
        "/api/fast-slots",
        json={"slots": [slot(1, {"kind": "screen_popup", "preset": "giant-scroll"})]},
    )

    assert response.status_code == 200
    assert response.json()[0]["action"] == {
        "kind": "screen_popup",
        "path": "README.md",
        "preset": "letter",
    }
    assert response.json()[1]["action"] == {"kind": "screen_popup"}
    assert invalid_response.status_code == 400


def test_fast_slots_accept_map_preset_when_preset_exists(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    preset = save_map_preset(
        world,
        "Encounter",
        map_state_from_payload({"image_path": "Media/map.svg"}),
    )
    client = make_client(world)

    response = client.put(
        "/api/fast-slots",
        json={
            "slots": [
                slot(1, {"kind": "map_preset", "preset_id": preset.id, "present": True})
            ]
        },
    )

    assert response.status_code == 200
    assert response.json()[0]["action"] == {
        "kind": "map_preset",
        "preset_id": preset.id,
        "present": True,
    }


def test_fast_slots_reject_missing_and_unknown_map_preset(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    missing_id = client.put(
        "/api/fast-slots",
        json={"slots": [slot(1, {"kind": "map_preset", "present": True})]},
    )
    unknown_id = client.put(
        "/api/fast-slots",
        json={
            "slots": [
                slot(1, {"kind": "map_preset", "preset_id": "missing", "present": True})
            ]
        },
    )

    assert missing_id.status_code == 400
    assert unknown_id.status_code == 404


def test_fast_slots_reject_duplicate_positions(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.put(
        "/api/fast-slots",
        json={
            "slots": [
                slot(1, {"kind": "open_file", "path": "README.md"}),
                slot(1, {"kind": "screen_popup"}),
            ]
        },
    )

    assert response.status_code == 400


def test_fast_slots_reject_search_query_and_open_file_without_path(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    search_response = client.put(
        "/api/fast-slots",
        json={"slots": [slot(1, {"kind": "search_query", "query": "Home"})]},
    )
    open_file_response = client.put(
        "/api/fast-slots",
        json={"slots": [slot(1, {"kind": "open_file"})]},
    )

    assert search_response.status_code == 400
    assert open_file_response.status_code == 400


def test_fast_slots_skip_legacy_invalid_saved_slots(tmp_path: Path) -> None:
    world = make_world(tmp_path)
    conn = initialize_database(world)
    with conn:
        conn.execute(
            "insert into fast_slots(position, slot_json) values (?, ?)",
            (
                1,
                json.dumps(
                    slot(1, {"kind": "search_query", "query": "Home"}),
                    sort_keys=True,
                ),
            ),
        )
        conn.execute(
            "insert into fast_slots(position, slot_json) values (?, ?)",
            (
                2,
                json.dumps(
                    slot(2, {"kind": "screen_popup"}),
                    sort_keys=True,
                ),
            ),
        )
    conn.close()
    client = make_client(world)

    response = client.get("/api/fast-slots")

    assert response.status_code == 200
    assert [item["position"] for item in response.json()] == [2]


def test_fast_slots_reject_unsafe_file_path(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    response = client.put(
        "/api/fast-slots",
        json={"slots": [slot(1, {"kind": "open_file", "path": "../README.md"})]},
    )

    assert response.status_code == 400


def test_fast_slots_reject_missing_file_audio_and_scenario(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path))

    missing_file = client.put(
        "/api/fast-slots",
        json={"slots": [slot(1, {"kind": "open_file", "path": "missing.md"})]},
    )
    missing_audio = client.put(
        "/api/fast-slots",
        json={
            "slots": [
                slot(
                    1,
                    {
                        "kind": "audio_track",
                        "path": ".music/effects/missing.mp3",
                        "bus": "effect",
                        "play": True,
                    },
                )
            ]
        },
    )
    missing_scenario = client.put(
        "/api/fast-slots",
        json={
            "slots": [
                slot(1, {"kind": "scenario", "scenario_id": "missing", "inputs": {}})
            ]
        },
    )
    missing_script = client.put(
        "/api/fast-slots",
        json={"slots": [slot(1, {"kind": "script_run", "path": "Scripts/missing.dms"})]},
    )

    assert missing_file.status_code == 404
    assert missing_audio.status_code == 404
    assert missing_scenario.status_code == 404
    assert missing_script.status_code == 404


def test_fast_slots_reject_legacy_scenario_actions_by_default(tmp_path: Path) -> None:
    client = make_client(make_world(tmp_path), enable_legacy_scenarios=False)

    response = client.put(
        "/api/fast-slots",
        json={"slots": [slot(1, {"kind": "scenario", "scenario_id": "create-npc", "inputs": {}})]},
    )

    assert Settings(world_root=tmp_path / "world").enable_legacy_scenarios is False
    assert response.status_code == 400
