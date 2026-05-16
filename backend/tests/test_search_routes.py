from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


def make_client(world: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(world_root=world)
    return TestClient(app)


def sample_client(world: Path) -> TestClient:
    return make_client(world)


def test_search_title_returns_captain_first(sample_world: Path) -> None:
    response = sample_client(sample_world).get("/api/search", params={"q": "Ilyra"})

    assert response.status_code == 200
    results = response.json()
    assert results[0]["title"] == "Captain Ilyra"
    assert results[0]["match_reason"] in {"title", "alias"}


def test_search_alias_returns_home_page(sample_world: Path) -> None:
    response = sample_client(sample_world).get("/api/search", params={"q": "Home"})

    assert response.status_code == 200
    assert response.json()[0]["title"] == "Sample World Guide"


def test_search_tag_returns_matching_page(sample_world: Path) -> None:
    response = sample_client(sample_world).get("/api/search", params={"q": "city-watch"})

    assert response.status_code == 200
    titles = [result["title"] for result in response.json()]
    assert "Captain Ilyra" in titles


def test_search_body_text_returns_matching_page(sample_world: Path) -> None:
    response = sample_client(sample_world).get("/api/search", params={"q": "river gate"})

    assert response.status_code == 200
    assert response.json()[0]["title"] == "Captain Ilyra"
    assert response.json()[0]["snippet"]


def test_search_folder_filter_limits_results(sample_world: Path) -> None:
    response = sample_client(sample_world).get(
        "/api/search",
        params={"q": "Ilyra", "folder": "NPCs"},
    )

    assert response.status_code == 200
    paths = {result["path"] for result in response.json()}
    assert "NPCs/Captain Ilyra.md" in paths
    assert "README.md" not in paths


def test_search_empty_query_returns_400(sample_world: Path) -> None:
    response = sample_client(sample_world).get("/api/search", params={"q": "  "})

    assert response.status_code == 400


def test_search_unsafe_folder_returns_400(sample_world: Path) -> None:
    response = sample_client(sample_world).get(
        "/api/search",
        params={"q": "Ilyra", "folder": "../NPCs"},
    )

    assert response.status_code == 400


def test_search_returns_video_media_kind(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Media").mkdir(parents=True)
    (world / "Media" / "animated-map.mp4").write_bytes(b"\x00\x00\x00\x18ftypmp42")
    client = make_client(world)

    response = client.get("/api/search", params={"q": "animated-map"})

    assert response.status_code == 200
    assert response.json()[0]["media_kind"] == "video"


def test_search_returns_pdf_media_kind(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Docs").mkdir(parents=True)
    (world / "Docs" / "session-handout.pdf").write_bytes(b"%PDF-1.4\n%tiny\n")
    client = make_client(world)

    response = client.get("/api/search", params={"q": "session-handout"})

    assert response.status_code == 200
    assert response.json()[0]["media_kind"] == "pdf"


def test_search_returns_script_body_matches(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Scripts").mkdir(parents=True)
    (world / "Scripts" / "hello_world.dms").write_text(
        "response = '# Hello Session Script'\nrender_md(response)\n",
        encoding="utf-8",
    )
    client = make_client(world)

    response = client.get("/api/search", params={"q": "Session Script"})

    assert response.status_code == 200
    assert response.json()[0]["path"] == "Scripts/hello_world.dms"
    assert response.json()[0]["media_kind"] == "script"
