from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


def make_client(world: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(world_root=world)
    return TestClient(app)


def write_markdown(path: Path, title: str, body: str) -> None:
    path.write_text(f"---\ntitle: {title}\n---\n\n{body}", encoding="utf-8")


def test_page_links_endpoint_returns_readme_links(sample_world: Path) -> None:
    client = make_client(sample_world)

    response = client.get("/api/page/links", params={"path": "README.md"})

    assert response.status_code == 200
    links = response.json()
    target_paths = {link["target_path"] for link in links}
    assert "NPCs/Captain Ilyra.md" in target_paths
    assert "Tables/random-events.csv" in target_paths
    assert any(link["link_type"] == "embed" for link in links)


def test_page_backlinks_endpoint_returns_readme_backlink_to_captain(
    sample_world: Path,
) -> None:
    client = make_client(sample_world)

    response = client.get("/api/page/backlinks", params={"path": "NPCs/Captain Ilyra.md"})

    assert response.status_code == 200
    links = response.json()
    assert any(link["source_path"] == "README.md" for link in links)


def test_page_backlinks_endpoint_returns_captain_backlink_to_readme(
    sample_world: Path,
) -> None:
    client = make_client(sample_world)

    response = client.get("/api/page/backlinks", params={"path": "README.md"})

    assert response.status_code == 200
    links = response.json()
    assert any(link["source_path"] == "NPCs/Captain Ilyra.md" for link in links)


def test_page_links_endpoint_rejects_traversal(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.get("/api/page/links", params={"path": "../secrets.md"})

    assert response.status_code == 400


def test_page_links_endpoint_rejects_directory(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.get("/api/page/links", params={"path": "."})

    assert response.status_code == 400


def test_page_links_endpoint_rejects_missing_file(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.get("/api/page/links", params={"path": "missing.md"})

    assert response.status_code == 404


def test_page_links_endpoint_returns_empty_links_for_csv(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "table.csv").write_text("roll,event\n1,Rain\n", encoding="utf-8")
    client = make_client(world)

    response = client.get("/api/page/links", params={"path": "table.csv"})

    assert response.status_code == 200
    assert response.json() == []


def test_page_links_endpoint_returns_links_for_csv_cells(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "README.md").write_text("# Home\n", encoding="utf-8")
    (world / "Tables").mkdir()
    (world / "Tables" / "table.csv").write_text(
        "roll,event\n1,[[../README|Home]]\n",
        encoding="utf-8",
    )
    client = make_client(world)

    response = client.get("/api/page/links", params={"path": "Tables/table.csv"})

    assert response.status_code == 200
    links = response.json()
    assert len(links) == 1
    assert links[0]["target_path"] == "README.md"
    assert links[0]["label"] == "Home"


def test_page_links_endpoint_refreshes_stale_csv_links(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "README.md").write_text("# Home\n", encoding="utf-8")
    (world / "Tables").mkdir()
    table = world / "Tables" / "table.csv"
    table.write_text("roll,event\n1,Rain\n", encoding="utf-8")
    client = make_client(world)
    assert client.get("/api/pages").status_code == 200
    table.write_text("roll,event\n1,[[../README|Home]]\n", encoding="utf-8")

    response = client.get("/api/page/links", params={"path": "Tables/table.csv"})

    assert response.status_code == 200
    links = response.json()
    assert len(links) == 1
    assert links[0]["target_path"] == "README.md"


def test_page_links_endpoint_indexes_externally_added_markdown_source(
    tmp_path: Path,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_markdown(world / "README.md", "Home", "# Home\n")
    client = make_client(world)
    assert client.get("/api/pages").status_code == 200
    write_markdown(world / "external.md", "External", "# External\n\n[[README|Home]]\n")

    response = client.get("/api/page/links", params={"path": "external.md"})

    assert response.status_code == 200
    links = response.json()
    assert len(links) == 1
    assert links[0]["target_path"] == "README.md"


def test_page_backlinks_endpoint_includes_externally_added_sources(
    tmp_path: Path,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    write_markdown(world / "README.md", "Home", "# Home\n")
    client = make_client(world)
    assert client.get("/api/pages").status_code == 200
    write_markdown(world / "external.md", "External", "# External\n\n[[README|Home]]\n")

    response = client.get("/api/page/backlinks", params={"path": "README.md"})

    assert response.status_code == 200
    links = response.json()
    assert any(link["source_path"] == "external.md" for link in links)
