from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


def make_client(world: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(world_root=world)
    return TestClient(app)


def test_world_tree_uses_empty_path_for_root(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "note.md").write_text("# Note\n", encoding="utf-8")

    client = make_client(world)

    response = client.get("/api/world/tree")

    assert response.status_code == 200
    body = response.json()
    assert body["path"] == ""
    assert body["children"][0]["path"] == "note.md"


def test_world_tree_skips_transiently_inaccessible_child_directory(
    tmp_path: Path, monkeypatch
) -> None:
    world = tmp_path / "world"
    locked = world / "locked"
    world.mkdir()
    locked.mkdir()
    (world / "note.md").write_text("# Note\n", encoding="utf-8")

    original_iterdir = Path.iterdir

    def fake_iterdir(path: Path):
        if path == locked:
            raise PermissionError("directory is temporarily unavailable")
        return original_iterdir(path)

    monkeypatch.setattr(Path, "iterdir", fake_iterdir)
    client = make_client(world)

    response = client.get("/api/world/tree")

    assert response.status_code == 200
    body = response.json()
    assert [child["path"] for child in body["children"]] == ["note.md"]


def test_world_tree_includes_markdown_page_metadata(sample_world: Path) -> None:
    client = make_client(sample_world)

    response = client.get("/api/world/tree")

    assert response.status_code == 200
    body = response.json()
    readme = next(child for child in body["children"] if child["path"] == "README.md")
    assert readme["title"] == "Sample World Guide"
    assert readme["page_type"] == "index"
    assert readme["tags"] == ["sample", "guide", "session"]
    assert readme["aliases"] == ["Home"]


def test_world_tree_does_not_add_page_metadata_to_non_markdown_files(sample_world: Path) -> None:
    client = make_client(sample_world)

    response = client.get("/api/world/tree")

    assert response.status_code == 200
    body = response.json()
    tables = next(child for child in body["children"] if child["path"] == "Tables")
    csv_file = tables["children"][0]
    assert csv_file["path"] == "Tables/random-events.csv"
    assert csv_file["title"] is None
    assert csv_file["page_type"] is None
    assert csv_file["tags"] == []
    assert csv_file["aliases"] == []
