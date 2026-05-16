from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


def make_client(world: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(world_root=world)
    return TestClient(app)


def test_pages_endpoint_returns_sample_world_pages(sample_world: Path) -> None:
    client = make_client(sample_world)

    response = client.get("/api/pages")

    assert response.status_code == 200
    pages = response.json()
    titles = {page["title"] for page in pages}
    assert "Sample World Guide" in titles
    assert "Captain Ilyra" in titles


def test_page_endpoint_returns_markdown_metadata(sample_world: Path) -> None:
    client = make_client(sample_world)

    response = client.get("/api/page", params={"path": "NPCs/Captain Ilyra.md"})

    assert response.status_code == 200
    body = response.json()
    assert body["title"] == "Captain Ilyra"
    assert body["page_type"] == "npc"
    assert body["tags"] == ["city-watch", "ally"]
    assert body["aliases"] == ["Ilyra", "Watch Captain"]
    assert body["fields"]["voice"] == "calm and formal"
    assert body["fields"]["danger"] == "medium"
    assert body["metadata"]["title"] == "Captain Ilyra"


def test_page_endpoint_missing_file_returns_404(tmp_path: Path) -> None:
    tmp_path.joinpath("world").mkdir()
    client = make_client(tmp_path / "world")

    response = client.get("/api/page", params={"path": "missing.md"})

    assert response.status_code == 404


def test_page_endpoint_directory_returns_400(tmp_path: Path) -> None:
    tmp_path.joinpath("world").mkdir()
    client = make_client(tmp_path / "world")

    response = client.get("/api/page", params={"path": "."})

    assert response.status_code == 400


def test_page_endpoint_traversal_returns_400(tmp_path: Path) -> None:
    tmp_path.joinpath("world").mkdir()
    client = make_client(tmp_path / "world")

    response = client.get("/api/page", params={"path": "../secrets.md"})

    assert response.status_code == 400
