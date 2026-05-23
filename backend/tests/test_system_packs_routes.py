import io
import json
import stat
import zipfile
from asyncio import run
from pathlib import Path

import pytest
from fastapi import HTTPException, Request
from fastapi.testclient import TestClient

from app.api.routes.system_packs import _read_multipart_upload
from app.core.config import Settings, get_settings
from app.core.system_packs import MAX_ZIP_BYTES
from app.main import create_app


@pytest.fixture(autouse=True)
def clear_cached_settings():
    get_settings.cache_clear()
    yield
    get_settings.cache_clear()


def make_client(world: Path, token: str | None = None) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(
        world_root=world,
        access_token=token or "",
    )
    return TestClient(app)


def template_payload(template_id: str = "npc-pack") -> dict[str, object]:
    return {
        "id": template_id,
        "name": "NPC Pack",
        "kind": "npc",
        "description": None,
        "card": {
            "kind": "npc",
            "title": "{{title}}",
            "tags": ["npc"],
            "sections": [{"title": "Core", "fields": {"Hook": ""}}],
        },
    }


def pack_bytes(
    files: dict[str, bytes | str],
    manifest_files: list[str] | None = None,
    manifest_overrides: dict[str, object] | None = None,
    symlink_paths: set[str] | None = None,
) -> bytes:
    manifest = {
        "schema_version": 1,
        "name": "Starter Pack",
        "version": "1.0.0",
        "description": "Small content-only pack.",
        "files": manifest_files if manifest_files is not None else list(files),
    }
    manifest.update(manifest_overrides or {})

    stream = io.BytesIO()
    with zipfile.ZipFile(stream, "w", zipfile.ZIP_DEFLATED) as archive:
        archive.writestr("system-pack.json", json.dumps(manifest))
        for path, content in files.items():
            data = content.encode("utf-8") if isinstance(content, str) else content
            if symlink_paths and path in symlink_paths:
                info = zipfile.ZipInfo(path)
                info.external_attr = (stat.S_IFLNK | 0o777) << 16
                archive.writestr(info, data)
            else:
                archive.writestr(path, data)
    return stream.getvalue()


def upload_zip(
    client: TestClient,
    url: str,
    content: bytes,
    data: dict[str, str] | None = None,
) -> object:
    return client.post(
        url,
        files={"pack": ("pack.zip", content, "application/zip")},
        data=data or {},
    )


def upload_request(headers: list[tuple[bytes, bytes]]) -> Request:
    async def receive():
        raise AssertionError("System pack upload body should not be read.")

    return Request(
        {
            "type": "http",
            "method": "POST",
            "path": "/api/system-packs/import",
            "headers": [
                (b"content-type", b"multipart/form-data; boundary=pack"),
                *headers,
            ],
        },
        receive,
    )


def decisions(*items: tuple[str, str, str | None]) -> dict[str, str]:
    return {
        "decisions": json.dumps(
            [
                {
                    "target_path": path,
                    "decision": decision,
                    **({"rename_target_path": rename} if rename is not None else {}),
                }
                for path, decision, rename in items
            ]
        )
    }


def sample_harbor_pack_path() -> Path:
    return (
        Path(__file__).resolve().parents[2]
        / "sample-world"
        / "System Packs"
        / "Harbor Starter Pack.zip"
    )


def test_sample_world_harbor_pack_manifest_matches_archive() -> None:
    pack_path = sample_harbor_pack_path()
    assert pack_path.exists()
    assert pack_path.stat().st_size < 100_000

    with zipfile.ZipFile(pack_path) as archive:
        manifest = json.loads(archive.read("system-pack.json").decode("utf-8"))
        archive_files = {
            info.filename
            for info in archive.infolist()
            if not info.is_dir()
        }

    assert manifest["name"] == "Harbor Starter Pack"
    assert "Scripts/skipped_pack_script.dms" in manifest["files"]
    assert archive_files == {"system-pack.json", *manifest["files"]}


def test_sample_world_harbor_pack_previews_and_imports(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)
    content = sample_harbor_pack_path().read_bytes()

    preview_response = upload_zip(client, "/api/system-packs/preview", content)

    assert preview_response.status_code == 200
    preview_body = preview_response.json()
    assert preview_body["manifest"]["name"] == "Harbor Starter Pack"
    preview_rows = {row["target_path"]: row for row in preview_body["rows"]}
    assert preview_rows["Notes/Imported Harbor Rumors.md"]["status"] == "ready"
    assert preview_rows["Cards/Imported Dockside Contact.cs"]["status"] == "ready"
    assert preview_rows["Tables/imported-harbor-events.csv"]["status"] == "ready"
    assert preview_rows["Media/imported-pack-map.svg"]["status"] == "ready"
    assert preview_rows[".music/ambient/Imported Harbor/harbor-pack-ambience.wav"][
        "status"
    ] == "ready"
    assert preview_rows[".virtualscreen/card-templates/imported-contact.json"][
        "status"
    ] == "ready"
    assert preview_rows["Scripts/skipped_pack_script.dms"]["status"] == "skipped"

    import_response_body = upload_zip(client, "/api/system-packs/import", content)

    assert import_response_body.status_code == 200
    assert (world / "Notes" / "Imported Harbor Rumors.md").exists()
    assert (world / "Cards" / "Imported Dockside Contact.cs").exists()
    assert (world / "Tables" / "imported-harbor-events.csv").exists()
    assert (world / "Media" / "imported-pack-map.svg").exists()
    assert (
        world
        / ".music"
        / "ambient"
        / "Imported Harbor"
        / "harbor-pack-ambience.wav"
    ).read_bytes().startswith(b"RIFF")
    assert (world / ".virtualscreen" / "card-templates" / "imported-contact.json").exists()
    assert not (world / "Scripts" / "skipped_pack_script.dms").exists()


def test_preview_reports_ready_conflicts_and_skipped_entries(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Notes").mkdir(parents=True)
    (world / "Notes" / "Existing.md").write_text("# Existing\n", encoding="utf-8")
    client = make_client(world)
    content = pack_bytes(
        {
            "Notes/New.md": "# New\n",
            "Notes/Existing.md": "# Replacement\n",
            "Scripts/tool.dms": "render_md('# no')",
            ".music/effects/bell.mp3": b"ID3bell",
            ".music/effects/readme.txt": "not audio",
            ".virtualscreen/card-templates/npc-pack.json": json.dumps(template_payload()),
            ".virtualscreen/card-templates/nested/bad.json": json.dumps(template_payload("bad")),
            ".virtualscreen/card-templates/broken.json": "{",
            "Media/map.png": b"\x89PNG\r\n\x1a\n",
            "Secrets/extra.md": "# Not manifest-listed\n",
            "unsafe-link.md": "Notes/New.md",
        },
        manifest_files=[
            "Notes/New.md",
            "Notes/Existing.md",
            "Scripts/tool.dms",
            ".music/effects/bell.mp3",
            ".music/effects/readme.txt",
            ".virtualscreen/card-templates/npc-pack.json",
            ".virtualscreen/card-templates/nested/bad.json",
            ".virtualscreen/card-templates/broken.json",
            "Media/map.png",
            "../escape.md",
            "/absolute.md",
            "C:/absolute.md",
            "unsafe-link.md",
        ],
        symlink_paths={"unsafe-link.md"},
    )

    response = upload_zip(client, "/api/system-packs/preview", content)

    assert response.status_code == 200
    body = response.json()
    statuses = {entry["target_path"]: entry for entry in body["rows"]}
    assert statuses["Notes/New.md"]["status"] == "ready"
    assert statuses["Notes/Existing.md"]["status"] == "conflict"
    assert statuses[".music/effects/bell.mp3"]["status"] == "ready"
    assert statuses[".virtualscreen/card-templates/npc-pack.json"]["status"] == "ready"
    assert statuses["Media/map.png"]["status"] == "ready"
    assert statuses["Scripts/tool.dms"] == {
        "id": "skipped:Scripts/tool.dms",
        "source_path": "Scripts/tool.dms",
        "target_path": "Scripts/tool.dms",
        "status": "skipped",
        "message": "DMS scripts are skipped in V2 content packs.",
        "reason": "unsupported_dms",
    }
    assert statuses[".music/effects/readme.txt"]["reason"] == "unsupported_extension"
    assert statuses[".virtualscreen/card-templates/nested/bad.json"]["reason"] == (
        "nested_card_template"
    )
    assert statuses[".virtualscreen/card-templates/broken.json"]["reason"] == (
        "invalid_card_template"
    )
    assert statuses["../escape.md"]["reason"] == "unsafe_path"
    assert statuses["/absolute.md"]["reason"] == "unsafe_path"
    assert statuses["C:/absolute.md"]["reason"] == "unsafe_path"
    assert statuses["unsafe-link.md"]["reason"] == "symlink"
    assert statuses["../escape.md"]["status"] == "invalid"
    assert body["skipped_unlisted"] == ["Secrets/extra.md"]
    assert body["counts"] == {"ready": 4, "conflict": 1, "skipped": 2, "invalid": 6}
    assert not (world / "Notes" / "New.md").exists()


def test_preview_marks_duplicate_manifest_targets_invalid(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = upload_zip(
        client,
        "/api/system-packs/preview",
        pack_bytes(
            {"Notes/New.md": "# New\n"},
            manifest_files=["Notes/New.md", "./Notes/New.md"],
        ),
    )

    assert response.status_code == 200
    rows = response.json()["rows"]
    assert rows[0]["status"] == "ready"
    assert rows[1]["source_path"] == "./Notes/New.md"
    assert rows[1]["target_path"] == "Notes/New.md"
    assert rows[1]["status"] == "invalid"
    assert rows[1]["reason"] == "duplicate_path"


def test_upload_rejects_missing_invalid_and_oversized_content_length_before_body_read() -> None:
    missing = upload_request([])
    invalid = upload_request([(b"content-length", b"not-a-number")])
    oversized = upload_request(
        [(b"content-length", str(MAX_ZIP_BYTES + 1024 * 1024 + 1).encode("ascii"))]
    )

    with pytest.raises(HTTPException) as missing_exc:
        run(_read_multipart_upload(missing))
    with pytest.raises(HTTPException) as invalid_exc:
        run(_read_multipart_upload(invalid))
    with pytest.raises(HTTPException) as oversized_exc:
        run(_read_multipart_upload(oversized))

    assert missing_exc.value.status_code == 411
    assert invalid_exc.value.status_code == 400
    assert oversized_exc.value.status_code == 413


def test_preview_rejects_reserved_path_segments_except_direct_card_templates(
    tmp_path: Path,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = upload_zip(
        client,
        "/api/system-packs/preview",
        pack_bytes(
            {
                "Notes/.virtualscreen/secret.md": "# No\n",
                "Notes/.git/secret.md": "# No\n",
                "Notes/__pycache__/secret.md": "# No\n",
                ".virtualscreen/card-templates/npc-pack.json": json.dumps(template_payload()),
            }
        ),
    )

    assert response.status_code == 200
    rows = {row["target_path"]: row for row in response.json()["rows"]}
    assert rows["Notes/.virtualscreen/secret.md"]["reason"] == "unsafe_path"
    assert rows["Notes/.git/secret.md"]["reason"] == "unsafe_path"
    assert rows["Notes/__pycache__/secret.md"]["reason"] == "unsafe_path"
    assert rows[".virtualscreen/card-templates/npc-pack.json"]["status"] == "ready"


def test_import_skip_overwrite_and_rename_conflict_strategies(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Notes").mkdir(parents=True)
    (world / "Notes" / "Existing.md").write_text("# Existing\n", encoding="utf-8")
    client = make_client(world)

    skip_response = upload_zip(
        client,
        "/api/system-packs/import",
        pack_bytes({"Notes/Existing.md": "# Replacement\n"}),
        data=decisions(("Notes/Existing.md", "skip", None)),
    )
    assert skip_response.status_code == 200
    assert (world / "Notes" / "Existing.md").read_text(encoding="utf-8") == "# Existing\n"
    assert skip_response.json()["files"] == [
        {
            "source_path": "Notes/Existing.md",
            "target_path": "Notes/Existing.md",
            "status": "skipped",
            "message": "File already exists.",
            "reason": "conflict",
        }
    ]

    overwrite_response = upload_zip(
        client,
        "/api/system-packs/import",
        pack_bytes({"Notes/Existing.md": "# Replacement\n"}),
        data=decisions(("Notes/Existing.md", "overwrite", None)),
    )
    assert overwrite_response.status_code == 200
    overwrite_body = overwrite_response.json()
    assert (world / "Notes" / "Existing.md").read_text(encoding="utf-8") == "# Replacement\n"
    assert overwrite_body["files"][0]["status"] == "overwritten"
    backup_path = world / overwrite_body["files"][0]["backup_path"]
    assert backup_path.exists()
    assert backup_path.read_text(encoding="utf-8") == "# Existing\n"

    rename_response = upload_zip(
        client,
        "/api/system-packs/import",
        pack_bytes({"Notes/Existing.md": "# Renamed\n"}),
        data=decisions(("Notes/Existing.md", "rename", "Notes/Existing From Pack.md")),
    )
    assert rename_response.status_code == 200
    assert (world / "Notes" / "Existing From Pack.md").read_text(encoding="utf-8") == "# Renamed\n"
    assert rename_response.json()["files"][0]["target_path"] == "Notes/Existing From Pack.md"
    assert rename_response.json()["files"][0]["source_path"] == "Notes/Existing.md"

    unsafe_rename = upload_zip(
        client,
        "/api/system-packs/import",
        pack_bytes({"Notes/Existing.md": "# Unsafe\n"}),
        data=decisions(("Notes/Existing.md", "rename", ".virtualscreen/not-allowed.md")),
    )
    assert unsafe_rename.status_code == 400
    assert not (world / ".virtualscreen" / "not-allowed.md").exists()


def test_import_rejects_existing_rename_target_before_writing(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Notes").mkdir(parents=True)
    (world / "Notes" / "Existing.md").write_text("# Existing\n", encoding="utf-8")
    (world / "Notes" / "Other.md").write_text("# Other\n", encoding="utf-8")
    client = make_client(world)

    response = upload_zip(
        client,
        "/api/system-packs/import",
        pack_bytes({"Notes/Existing.md": "# Replacement\n"}),
        data=decisions(("Notes/Existing.md", "rename", "Notes/Other.md")),
    )

    assert response.status_code == 400
    assert (world / "Notes" / "Existing.md").read_text(encoding="utf-8") == "# Existing\n"
    assert (world / "Notes" / "Other.md").read_text(encoding="utf-8") == "# Other\n"


def test_import_rejects_final_target_collisions_before_writing(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Notes").mkdir(parents=True)
    (world / "Notes" / "Existing.md").write_text("# Existing\n", encoding="utf-8")
    client = make_client(world)

    response = upload_zip(
        client,
        "/api/system-packs/import",
        pack_bytes(
            {
                "Notes/Existing.md": "# Replacement\n",
                "Notes/New.md": "# New\n",
            }
        ),
        data=decisions(("Notes/Existing.md", "rename", "Notes/New.md")),
    )

    assert response.status_code == 400
    assert (world / "Notes" / "Existing.md").read_text(encoding="utf-8") == "# Existing\n"
    assert not (world / "Notes" / "New.md").exists()


def test_import_writes_allowed_files_and_publishes_one_event(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)
    content = pack_bytes(
        {
            "Notes/New.md": "# New\n",
            ".music/effects/bell.mp3": b"ID3bell",
            ".virtualscreen/card-templates/npc-pack.json": json.dumps(template_payload()),
            "Scripts/tool.dms": "render_md('# skipped')",
        }
    )

    with client.websocket_connect("/ws/events") as websocket:
        response = upload_zip(
            client,
            "/api/system-packs/import",
            content,
        )
        event = websocket.receive_json()

    assert response.status_code == 200
    assert (world / "Notes" / "New.md").read_text(encoding="utf-8") == "# New\n"
    assert (world / ".music" / "effects" / "bell.mp3").read_bytes() == b"ID3bell"
    assert (world / ".virtualscreen" / "card-templates" / "npc-pack.json").exists()
    assert not (world / "Scripts" / "tool.dms").exists()
    assert response.json()["files"][-1:] == [
        {
            "source_path": "Scripts/tool.dms",
            "target_path": "Scripts/tool.dms",
            "status": "skipped",
            "message": "DMS scripts are skipped in V2 content packs.",
            "reason": "unsupported_dms",
        }
    ]
    assert event["type"] == "world_changed"
    assert event["paths"] == [
        "Notes/New.md",
        ".music/effects/bell.mp3",
        ".virtualscreen/card-templates/npc-pack.json",
    ]
    assert event["deleted_paths"] == []
    assert event["reason"] == "created"


def test_import_rejects_bad_manifest_and_limits(tmp_path: Path, monkeypatch) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    missing_manifest = io.BytesIO()
    with zipfile.ZipFile(missing_manifest, "w") as archive:
        archive.writestr("Notes/New.md", "# New")

    assert upload_zip(
        client,
        "/api/system-packs/import",
        missing_manifest.getvalue(),
    ).status_code == 400

    optional_description = upload_zip(
        client,
        "/api/system-packs/preview",
        pack_bytes(
            {"Notes/New.md": "# New\n"},
            manifest_overrides={"description": None},
        ),
    )
    assert optional_description.status_code == 200
    assert optional_description.json()["manifest"]["description"] == ""

    too_many_files = [f"Notes/{index}.md" for index in range(201)]
    too_many_response = upload_zip(
        client,
        "/api/system-packs/import",
        pack_bytes({}, manifest_files=too_many_files),
    )
    assert too_many_response.status_code == 413

    from app.core import system_packs

    monkeypatch.setattr(system_packs, "MAX_ZIP_BYTES", 10)
    too_large_zip = upload_zip(
        client,
        "/api/system-packs/import",
        pack_bytes({"Notes/New.md": "# New\n"}),
    )
    assert too_large_zip.status_code == 413

    monkeypatch.setattr(system_packs, "MAX_ZIP_BYTES", 1024 * 1024)
    monkeypatch.setattr(system_packs, "MAX_DECOMPRESSED_BYTES", 5)
    too_large_decompressed = upload_zip(
        client,
        "/api/system-packs/import",
        pack_bytes({"Notes/New.md": "# New\n"}),
    )
    assert too_large_decompressed.status_code == 413


def test_system_pack_routes_are_auth_protected(tmp_path: Path, monkeypatch) -> None:
    world = tmp_path / "world"
    world.mkdir()
    monkeypatch.setenv("VIRTUALSCREEN_ACCESS_TOKEN", "secret")
    get_settings.cache_clear()
    client = make_client(world, token="secret")
    content = pack_bytes({"Notes/New.md": "# New\n"})

    locked = upload_zip(client, "/api/system-packs/preview", content)
    unlocked = client.post(
        "/api/system-packs/preview",
        files={"file": ("pack.zip", content, "application/zip")},
        headers={"X-VirtualScreen-Token": "secret"},
    )

    assert locked.status_code == 401
    assert unlocked.status_code == 200
