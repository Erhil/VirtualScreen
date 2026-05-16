from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


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
