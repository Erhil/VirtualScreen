import hashlib
import mimetypes
from pathlib import Path

from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


def make_client(world: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(world_root=world)
    return TestClient(app)


def test_reads_markdown_file_with_metadata(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "README.md").write_text("# Home\n\nWelcome.", encoding="utf-8")
    client = make_client(world)

    response = client.get("/api/world/file", params={"path": "README.md"})

    assert response.status_code == 200
    body = response.json()
    assert body["path"] == "README.md"
    assert body["name"] == "README.md"
    assert body["extension"] == "md"
    assert body["media_kind"] == "markdown"
    assert body["content_type"] == "text/markdown"
    assert body["size"] > 0
    assert body["modified_at"]
    assert body["hash"] == hashlib.sha256(b"# Home\n\nWelcome.").hexdigest()
    assert body["content"] == "# Home\n\nWelcome."


def test_reads_csv_file_with_metadata(tmp_path: Path) -> None:
    world = tmp_path / "world"
    tables = world / "Tables"
    tables.mkdir(parents=True)
    (tables / "events.csv").write_text("result,event\n1,Rain\n", encoding="utf-8")
    client = make_client(world)

    response = client.get("/api/world/file", params={"path": "Tables/events.csv"})

    assert response.status_code == 200
    body = response.json()
    assert body["path"] == "Tables/events.csv"
    assert body["extension"] == "csv"
    assert body["media_kind"] == "csv"
    assert body["content_type"] == "text/csv"
    assert body["hash"] == hashlib.sha256(b"result,event\n1,Rain\n").hexdigest()
    assert body["content"] == "result,event\n1,Rain\n"


def test_reads_dms_script_file_with_metadata(tmp_path: Path) -> None:
    world = tmp_path / "world"
    scripts = world / "Scripts"
    scripts.mkdir(parents=True)
    script = 'schema = {"name": "text"}\nname = form(schema)["name"]\n'
    (scripts / "hello_world.dms").write_text(script, encoding="utf-8")
    client = make_client(world)

    response = client.get("/api/world/file", params={"path": "Scripts/hello_world.dms"})

    assert response.status_code == 200
    body = response.json()
    assert body["path"] == "Scripts/hello_world.dms"
    assert body["extension"] == "dms"
    assert body["media_kind"] == "script"
    assert body["content_type"] == "text/x-dms"
    assert body["hash"] == hashlib.sha256(script.encode("utf-8")).hexdigest()
    assert body["content"] == script


def test_dms_content_type_ignores_platform_mimetype_database(
    tmp_path: Path,
    monkeypatch,
) -> None:
    world = tmp_path / "world"
    scripts = world / "Scripts"
    scripts.mkdir(parents=True)
    (scripts / "hello_world.dms").write_text("render_md('# Hi')\n", encoding="utf-8")
    client = make_client(world)

    original_guess_type = mimetypes.guess_type

    def linux_like_guess_type(url, strict=True):
        if str(url).endswith(".dms"):
            return "text/vnd.DMClientScript", None
        return original_guess_type(url, strict=strict)

    monkeypatch.setattr(mimetypes, "guess_type", linux_like_guess_type)

    response = client.get("/api/world/file", params={"path": "Scripts/hello_world.dms"})

    assert response.status_code == 200
    assert response.json()["content_type"] == "text/x-dms"


def test_file_hash_changes_when_content_changes(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    note = world / "README.md"
    note.write_text("# Home\n", encoding="utf-8")
    client = make_client(world)

    first_hash = client.get("/api/world/file", params={"path": "README.md"}).json()["hash"]
    note.write_text("# Changed\n", encoding="utf-8")
    second_hash = client.get("/api/world/file", params={"path": "README.md"}).json()["hash"]

    assert first_hash != second_hash


def test_reads_svg_as_text_file_and_media(tmp_path: Path) -> None:
    world = tmp_path / "world"
    media = world / "Media"
    media.mkdir(parents=True)
    (media / "map.svg").write_text("<svg></svg>", encoding="utf-8")
    client = make_client(world)

    file_response = client.get("/api/world/file", params={"path": "Media/map.svg"})
    media_response = client.get("/api/world/media", params={"path": "Media/map.svg"})

    assert file_response.status_code == 200
    assert file_response.json()["media_kind"] == "image"
    assert file_response.json()["content_type"] == "image/svg+xml"
    assert file_response.json()["content"] == "<svg></svg>"
    assert media_response.status_code == 200
    assert media_response.headers["content-type"].startswith("image/svg+xml")
    assert media_response.text == "<svg></svg>"


def test_svg_media_response_has_safety_headers(tmp_path: Path) -> None:
    world = tmp_path / "world"
    media = world / "Media"
    media.mkdir(parents=True)
    (media / "map.svg").write_text(
        "<svg><script>alert('x')</script></svg>",
        encoding="utf-8",
    )
    client = make_client(world)

    response = client.get("/api/world/media", params={"path": "Media/map.svg"})

    assert response.status_code == 200
    assert response.headers["x-content-type-options"] == "nosniff"
    assert "sandbox" in response.headers["content-security-policy"]


def test_serves_gif_and_mp4_media(tmp_path: Path) -> None:
    world = tmp_path / "world"
    media = world / "Media"
    media.mkdir(parents=True)
    (media / "animated-map.gif").write_bytes(b"GIF89a")
    (media / "animated-map.mp4").write_bytes(b"\x00\x00\x00\x18ftypmp42")
    client = make_client(world)

    gif_response = client.get("/api/world/media", params={"path": "Media/animated-map.gif"})
    mp4_response = client.get("/api/world/media", params={"path": "Media/animated-map.mp4"})
    pages_response = client.get("/api/pages")

    assert gif_response.status_code == 200
    assert gif_response.headers["content-type"].startswith("image/gif")
    assert mp4_response.status_code == 200
    assert mp4_response.headers["content-type"].startswith("video/mp4")
    pages = {page["path"]: page for page in pages_response.json()}
    assert pages["Media/animated-map.gif"]["title"] == "animated-map"
    assert pages["Media/animated-map.mp4"]["title"] == "animated-map"


def test_serves_pdf_media_and_indexes_page(tmp_path: Path) -> None:
    world = tmp_path / "world"
    docs = world / "Docs"
    docs.mkdir(parents=True)
    (docs / "handout.pdf").write_bytes(b"%PDF-1.4\n%tiny\n")
    client = make_client(world)

    file_response = client.get("/api/world/file", params={"path": "Docs/handout.pdf"})
    media_response = client.get("/api/world/media", params={"path": "Docs/handout.pdf"})
    pages_response = client.get("/api/pages")

    assert file_response.status_code == 415
    assert media_response.status_code == 200
    assert media_response.headers["content-type"].startswith("application/pdf")
    pages = {page["path"]: page for page in pages_response.json()}
    assert pages["Docs/handout.pdf"]["title"] == "handout"
    assert pages["Docs/handout.pdf"]["extension"] == "pdf"


def test_missing_file_returns_404(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.get("/api/world/file", params={"path": "missing.md"})

    assert response.status_code == 404


def test_directory_path_returns_400(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.get("/api/world/file", params={"path": "."})

    assert response.status_code == 400


def test_traversal_path_returns_400(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.get("/api/world/file", params={"path": "../secrets.txt"})

    assert response.status_code == 400


def test_unsupported_binary_file_returns_415(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "roll.bin").write_bytes(b"\x00\x01\x02")
    client = make_client(world)

    response = client.get("/api/world/file", params={"path": "roll.bin"})

    assert response.status_code == 415
