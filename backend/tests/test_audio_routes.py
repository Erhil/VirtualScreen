from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_cached_settings() -> None:
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def make_client(world: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(world_root=world)
    return TestClient(app)


def write_audio_fixture(world: Path) -> None:
    (world / ".music" / "ambient" / "Tavern").mkdir(parents=True)
    (world / ".music" / "music").mkdir(parents=True)
    (world / ".music" / "effects").mkdir(parents=True)
    (world / ".music" / "ambient" / "Tavern" / "crowd.mp3").write_bytes(b"ID3crowd")
    (world / ".music" / "music" / "bard.ogg").write_bytes(b"OggSbard")
    (world / ".music" / "effects" / "glass.wav").write_bytes(b"RIFFglass")
    (world / ".music" / "effects" / "notes.txt").write_text("not audio", encoding="utf-8")


def test_audio_library_returns_tracks_from_music_folder(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_audio_fixture(world)
    client = make_client(world)

    response = client.get("/api/audio/library")

    assert response.status_code == 200
    tracks = response.json()
    assert [track["path"] for track in tracks] == [
        ".music/ambient/Tavern/crowd.mp3",
        ".music/effects/glass.wav",
        ".music/music/bard.ogg",
    ]
    crowd = tracks[0]
    assert crowd["title"] == "crowd"
    assert crowd["bus"] == "ambient"
    assert crowd["playlist"] == "Tavern"
    assert crowd["extension"] == "mp3"
    assert crowd["content_type"] == "audio/mpeg"


def test_audio_library_filters_by_query_and_bus(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_audio_fixture(world)
    client = make_client(world)

    response = client.get("/api/audio/library", params={"q": "bard", "bus": "music"})

    assert response.status_code == 200
    tracks = response.json()
    assert [track["path"] for track in tracks] == [".music/music/bard.ogg"]
    assert tracks[0]["bus"] == "music"


def test_audio_library_rejects_invalid_bus(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_audio_fixture(world)
    client = make_client(world)

    response = client.get("/api/audio/library", params={"bus": "../music"})

    assert response.status_code == 400


def test_audio_playlists_fresh_world_returns_empty_list(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.get("/api/audio/playlists")

    assert response.status_code == 200
    assert response.json() == {"playlists": []}


def test_audio_playlists_round_trip_and_persist_hidden_state(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / ".music" / "ambient").mkdir(parents=True)
    (world / ".music" / "ambient" / "rain.mp3").write_bytes(b"ID3rain")
    client = make_client(world)
    payload = {
        "playlists": [
            {
                "id": "rain-bed",
                "name": "Rain Bed",
                "bus": "ambient",
                "track_paths": [
                    ".music/ambient/rain.mp3",
                    ".music/ambient/missing-but-planned.ogg",
                ],
                "loop": True,
                "created_at": "2026-05-18T12:00:00Z",
                "updated_at": "2026-05-18T12:05:00Z",
            },
            {
                "id": "ending-cue",
                "name": "Ending Cue",
                "bus": "music",
                "track_paths": [],
                "loop": False,
                "created_at": "2026-05-18T13:00:00Z",
                "updated_at": "2026-05-18T13:00:00Z",
            },
        ]
    }

    put_response = client.put("/api/audio/playlists", json=payload)
    get_response = client.get("/api/audio/playlists")

    assert put_response.status_code == 200
    assert put_response.json() == payload
    assert get_response.status_code == 200
    assert get_response.json() == payload
    assert (world / ".virtualscreen" / "audio-playlists.json").is_file()


@pytest.mark.parametrize(
    "payload",
    [
        {"playlists": "not a list"},
        {
            "playlists": [
                {
                    "id": "",
                    "name": "Rain",
                    "bus": "ambient",
                    "track_paths": [],
                    "loop": False,
                    "created_at": "2026-05-18T12:00:00Z",
                    "updated_at": "2026-05-18T12:00:00Z",
                }
            ]
        },
        {
            "playlists": [
                {
                    "id": "bad/id",
                    "name": "Rain",
                    "bus": "ambient",
                    "track_paths": [],
                    "loop": False,
                    "created_at": "2026-05-18T12:00:00Z",
                    "updated_at": "2026-05-18T12:00:00Z",
                }
            ]
        },
        {
            "playlists": [
                {
                    "id": "rain",
                    "name": "",
                    "bus": "ambient",
                    "track_paths": [],
                    "loop": False,
                    "created_at": "2026-05-18T12:00:00Z",
                    "updated_at": "2026-05-18T12:00:00Z",
                }
            ]
        },
        {
            "playlists": [
                {
                    "id": "rain",
                    "name": "Rain",
                    "bus": "voice",
                    "track_paths": [],
                    "loop": False,
                    "created_at": "2026-05-18T12:00:00Z",
                    "updated_at": "2026-05-18T12:00:00Z",
                }
            ]
        },
        {
            "playlists": [
                {
                    "id": "rain",
                    "name": "Rain",
                    "bus": "ambient",
                    "track_paths": [],
                    "loop": "yes",
                    "created_at": "2026-05-18T12:00:00Z",
                    "updated_at": "2026-05-18T12:00:00Z",
                }
            ]
        },
        {
            "playlists": [
                {
                    "id": "rain",
                    "name": "Rain",
                    "bus": "ambient",
                    "track_paths": [],
                    "loop": False,
                    "created_at": "2026-05-18T12:00:00Z",
                    "updated_at": "2026-05-18T12:00:00Z",
                },
                {
                    "id": "rain",
                    "name": "Rain Copy",
                    "bus": "ambient",
                    "track_paths": [],
                    "loop": False,
                    "created_at": "2026-05-18T12:01:00Z",
                    "updated_at": "2026-05-18T12:01:00Z",
                },
            ]
        },
    ],
)
def test_audio_playlists_reject_invalid_bus_name_id_and_payload(
    tmp_path: Path,
    payload: dict[str, object],
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.put("/api/audio/playlists", json=payload)

    assert response.status_code == 400


@pytest.mark.parametrize(
    "track_path",
    [
        "../outside.mp3",
        ".virtualscreen/private.mp3",
        "Audio/not-hidden.mp3",
        ".music/ambient/notes.txt",
    ],
)
def test_audio_playlists_reject_unsafe_internal_and_non_audio_track_paths(
    tmp_path: Path,
    track_path: str,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.put(
        "/api/audio/playlists",
        json={
            "playlists": [
                {
                    "id": "rain",
                    "name": "Rain",
                    "bus": "ambient",
                    "track_paths": [track_path],
                    "loop": False,
                    "created_at": "2026-05-18T12:00:00Z",
                    "updated_at": "2026-05-18T12:00:00Z",
                }
            ]
        },
    )

    assert response.status_code == 400


def test_audio_playlists_allow_missing_audio_files(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)
    payload = {
        "playlists": [
            {
                "id": "planned",
                "name": "Planned",
                "bus": "effect",
                "track_paths": [".music/effects/future.wav"],
                "loop": False,
                "created_at": "2026-05-18T12:00:00Z",
                "updated_at": "2026-05-18T12:00:00Z",
            }
        ]
    }

    response = client.put("/api/audio/playlists", json=payload)

    assert response.status_code == 200
    assert client.get("/api/audio/playlists").json() == payload


def test_audio_playlists_routes_require_auth_when_token_is_set(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", "secret")
    monkeypatch.setenv("VIRTUALSCREEN_WORLD_ROOT", str(world))
    get_settings.cache_clear()
    client = TestClient(create_app())

    locked_get = client.get("/api/audio/playlists")
    locked_put = client.put("/api/audio/playlists", json={"playlists": []})
    unlocked = client.get(
        "/api/audio/playlists",
        headers={"X-VirtualScreen-Token": "secret"},
    )

    assert locked_get.status_code == 401
    assert locked_put.status_code == 401
    assert unlocked.status_code == 200
    get_settings.cache_clear()


def test_music_folder_is_hidden_from_tree_and_normal_search(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "README.md").write_text("# Home\n", encoding="utf-8")
    write_audio_fixture(world)
    client = make_client(world)

    tree_response = client.get("/api/world/tree")
    search_response = client.get("/api/search", params={"q": "crowd"})

    assert tree_response.status_code == 200
    assert ".music" not in [child["name"] for child in tree_response.json()["children"]]
    assert search_response.status_code == 200
    assert search_response.json() == []


def test_world_media_serves_supported_audio(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_audio_fixture(world)
    client = make_client(world)

    response = client.get("/api/world/media", params={"path": ".music/ambient/Tavern/crowd.mp3"})

    assert response.status_code == 200
    assert response.headers["content-type"].startswith("audio/mpeg")
    assert response.content == b"ID3crowd"


def test_world_media_rejects_non_audio_in_music_folder(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_audio_fixture(world)
    client = make_client(world)

    response = client.get("/api/world/media", params={"path": ".music/effects/notes.txt"})

    assert response.status_code == 415
