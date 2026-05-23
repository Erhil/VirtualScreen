import os
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

from app.core.config import Settings, get_settings
from app.main import create_app


def make_client(world: Path) -> TestClient:
    app = create_app()
    app.dependency_overrides[get_settings] = lambda: Settings(world_root=world)
    return TestClient(app)


def make_symlink(source: Path, link: Path, *, target_is_directory: bool = False) -> None:
    try:
        os.symlink(source, link, target_is_directory=target_is_directory)
    except (OSError, NotImplementedError) as exc:
        pytest.skip(f"Symlinks are not available in this environment: {exc}")


def file_preconditions(client: TestClient, path: str) -> dict[str, str]:
    current = client.get("/api/world/file", params={"path": path}).json()
    return {
        "expected_modified_at": current["modified_at"],
        "expected_hash": current["hash"],
    }


def test_creates_markdown_with_default_content(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.post(
        "/api/world/file",
        json={"path": "Notes/New Note.md", "file_type": "markdown"},
    )

    assert response.status_code == 400

    notes = world / "Notes"
    notes.mkdir()
    response = client.post(
        "/api/world/file",
        json={"path": "Notes/New Note.md", "file_type": "markdown"},
    )

    assert response.status_code == 200
    assert response.json()["content"] == "# New Note\n"
    assert (notes / "New Note.md").read_text(encoding="utf-8") == "# New Note\n"


def test_creates_csv_with_default_content(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.post(
        "/api/world/file",
        json={"path": "events.csv", "file_type": "csv"},
    )

    assert response.status_code == 200
    assert response.json()["content"] == "result,event\n"
    assert (world / "events.csv").read_text(encoding="utf-8") == "result,event\n"


def test_creates_dms_with_default_content(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.post(
        "/api/world/file",
        json={"path": "hello_world.dms", "file_type": "script"},
    )

    assert response.status_code == 200
    assert response.json()["media_kind"] == "script"
    assert response.json()["content"] == "# Write DMS script here\n"
    assert (world / "hello_world.dms").read_text(encoding="utf-8") == "# Write DMS script here\n"


def test_creates_file_with_explicit_content(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    response = client.post(
        "/api/world/file",
        json={"path": "custom.md", "file_type": "markdown", "content": "# Custom\nBody"},
    )

    assert response.status_code == 200
    assert response.json()["content"] == "# Custom\nBody"


def test_create_rejects_existing_traversal_missing_parent_unsupported_and_internal(
    tmp_path: Path,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "exists.md").write_text("# Exists\n", encoding="utf-8")
    client = make_client(world)

    assert (
        client.post(
            "/api/world/file",
            json={"path": "exists.md", "file_type": "markdown"},
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/world/file",
            json={"path": "../escape.md", "file_type": "markdown"},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/world/file",
            json={"path": "Missing/new.md", "file_type": "markdown"},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/world/file",
            json={"path": "image.png", "file_type": "markdown"},
        ).status_code
        == 415
    )
    assert (
        client.post(
            "/api/world/file",
            json={"path": ".virtualscreen/hidden.md", "file_type": "markdown"},
        ).status_code
        == 400
    )


def test_world_routes_reject_nested_reserved_path_segments(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Notes" / ".virtualscreen").mkdir(parents=True)
    (world / "Notes" / ".git").mkdir()
    (world / "Notes" / "__pycache__").mkdir()
    (world / "Notes" / ".virtualscreen" / "secret.md").write_text(
        "# Secret\n",
        encoding="utf-8",
    )
    client = make_client(world)

    read_response = client.get(
        "/api/world/file",
        params={"path": "Notes/.virtualscreen/secret.md"},
    )
    create_response = client.post(
        "/api/world/file",
        json={"path": "Notes/.git/new.md", "file_type": "markdown"},
    )
    folder_response = client.post(
        "/api/world/folder",
        json={"path": "Notes/__pycache__/New"},
    )

    assert read_response.status_code == 400
    assert create_response.status_code == 400
    assert folder_response.status_code == 400
    assert not (world / "Notes" / ".git" / "new.md").exists()
    assert not (world / "Notes" / "__pycache__" / "New").exists()


def test_renames_markdown_and_updates_index(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "old.md").write_text("# Old Title\n", encoding="utf-8")
    client = make_client(world)

    response = client.post(
        "/api/world/file/rename",
        json={
            "path": "old.md",
            "new_path": "new.md",
            **file_preconditions(client, "old.md"),
        },
    )

    assert response.status_code == 200
    assert response.json()["path"] == "new.md"
    assert not (world / "old.md").exists()
    assert (world / "new.md").exists()
    search_response = client.get("/api/search", params={"q": "Old"})
    assert [result["path"] for result in search_response.json()] == ["new.md"]


def test_renames_csv_and_updates_index(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "old.csv").write_text("result,event\n1,Rain\n", encoding="utf-8")
    client = make_client(world)

    response = client.post(
        "/api/world/file/rename",
        json={
            "path": "old.csv",
            "new_path": "new.csv",
            **file_preconditions(client, "old.csv"),
        },
    )

    assert response.status_code == 200
    assert response.json()["path"] == "new.csv"
    assert not (world / "old.csv").exists()
    assert (world / "new.csv").exists()


def test_renames_dms_and_updates_index(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "old.dms").write_text("render_md('# Old Script')\n", encoding="utf-8")
    client = make_client(world)

    response = client.post(
        "/api/world/file/rename",
        json={
            "path": "old.dms",
            "new_path": "new.dms",
            **file_preconditions(client, "old.dms"),
        },
    )

    assert response.status_code == 200
    assert response.json()["path"] == "new.dms"
    assert not (world / "old.dms").exists()
    assert (world / "new.dms").exists()
    search_response = client.get("/api/search", params={"q": "Old Script"})
    assert [result["path"] for result in search_response.json()] == ["new.dms"]


def test_rename_rejects_stale_existing_target_and_unsupported(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "old.md").write_text("# Old\n", encoding="utf-8")
    (world / "target.md").write_text("# Target\n", encoding="utf-8")
    (world / "image.png").write_bytes(b"png")
    client = make_client(world)
    stale = file_preconditions(client, "old.md")
    (world / "old.md").write_text("# External\n", encoding="utf-8")

    assert (
        client.post(
            "/api/world/file/rename",
            json={"path": "old.md", "new_path": "renamed.md", **stale},
        ).status_code
        == 409
    )
    fresh = file_preconditions(client, "old.md")
    assert (
        client.post(
            "/api/world/file/rename",
            json={"path": "old.md", "new_path": "target.md", **fresh},
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/world/file/rename",
            json={
                "path": "image.png",
                "new_path": "image-renamed.png",
                "expected_modified_at": "2026-01-01T00:00:00Z",
                "expected_hash": "x",
            },
        ).status_code
        == 415
    )


def test_trash_moves_file_and_removes_it_from_index(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "trash-me.md").write_text("# Trash Me\n", encoding="utf-8")
    client = make_client(world)

    response = client.post(
        "/api/world/file/trash",
        json={"path": "trash-me.md", **file_preconditions(client, "trash-me.md")},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["path"] == "trash-me.md"
    assert body["trashed_path"].endswith("trash-me.md")
    assert not (world / "trash-me.md").exists()
    assert (world / body["trashed_path"]).exists()
    assert client.get("/api/search", params={"q": "Trash"}).json() == []


def test_trash_rejects_stale_preconditions(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    note = world / "trash-me.md"
    note.write_text("# Trash Me\n", encoding="utf-8")
    client = make_client(world)
    stale = file_preconditions(client, "trash-me.md")
    note.write_text("# External\n", encoding="utf-8")

    response = client.post(
        "/api/world/file/trash",
        json={"path": "trash-me.md", **stale},
    )

    assert response.status_code == 409


def test_creates_folder_under_existing_parent(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "NPCs").mkdir(parents=True)
    client = make_client(world)

    response = client.post("/api/world/folder", json={"path": "NPCs/Tavern"})

    assert response.status_code == 200
    assert response.json()["path"] == "NPCs/Tavern"
    assert response.json()["kind"] == "directory"
    assert (world / "NPCs" / "Tavern").is_dir()


def test_create_folder_rejects_unsafe_existing_and_missing_parent(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "NPCs").mkdir(parents=True)
    (world / "NPCs" / "Existing").mkdir()
    client = make_client(world)

    assert client.post("/api/world/folder", json={"path": "../escape"}).status_code == 400
    assert (
        client.post("/api/world/folder", json={"path": ".virtualscreen/hidden"}).status_code
        == 400
    )
    assert client.post("/api/world/folder", json={"path": "NPCs/Existing"}).status_code == 409
    assert client.post("/api/world/folder", json={"path": "Missing/New"}).status_code == 400


def test_lists_and_restores_trashed_file(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "restore-me.md").write_text("# Restore Me\n", encoding="utf-8")
    client = make_client(world)
    trash_response = client.post(
        "/api/world/file/trash",
        json={"path": "restore-me.md", **file_preconditions(client, "restore-me.md")},
    )
    trashed_path = trash_response.json()["trashed_path"]

    trash = client.get("/api/world/trash")

    assert trash.status_code == 200
    assert trash.json()[0]["original_path"] == "restore-me.md"
    assert trash.json()[0]["trashed_path"] == trashed_path

    restore = client.post("/api/world/trash/restore", json={"trashed_path": trashed_path})

    assert restore.status_code == 200
    assert restore.json()["path"] == "restore-me.md"
    assert (world / "restore-me.md").exists()
    assert client.get("/api/search", params={"q": "Restore"}).json()[0]["path"] == "restore-me.md"


def test_restore_collision_requires_alternate_path(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "restore-me.md").write_text("# Restore Me\n", encoding="utf-8")
    client = make_client(world)
    trashed_path = client.post(
        "/api/world/file/trash",
        json={"path": "restore-me.md", **file_preconditions(client, "restore-me.md")},
    ).json()["trashed_path"]
    (world / "restore-me.md").write_text("# New File\n", encoding="utf-8")

    conflict = client.post("/api/world/trash/restore", json={"trashed_path": trashed_path})
    restored = client.post(
        "/api/world/trash/restore",
        json={"trashed_path": trashed_path, "restore_path": "restored-copy.md"},
    )

    assert conflict.status_code == 409
    assert restored.status_code == 200
    assert (world / "restored-copy.md").read_text(encoding="utf-8") == "# Restore Me\n"


def test_permanently_deletes_trash_entry(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "delete-me.md").write_text("# Delete Me\n", encoding="utf-8")
    client = make_client(world)
    trashed_path = client.post(
        "/api/world/file/trash",
        json={"path": "delete-me.md", **file_preconditions(client, "delete-me.md")},
    ).json()["trashed_path"]

    response = client.request("DELETE", "/api/world/trash", json={"trashed_path": trashed_path})

    assert response.status_code == 200
    assert not (world / trashed_path).exists()
    assert client.get("/api/world/trash").json() == []


def test_moves_file_path_and_updates_index(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Inbox").mkdir(parents=True)
    (world / "Archive").mkdir()
    (world / "Inbox" / "move-me.md").write_text("# Move Me\n", encoding="utf-8")
    client = make_client(world)

    response = client.post(
        "/api/world/path/move",
        json={"path": "Inbox/move-me.md", "new_path": "Archive/moved.md"},
    )

    assert response.status_code == 200
    assert response.json()["path"] == "Archive/moved.md"
    assert not (world / "Inbox" / "move-me.md").exists()
    assert (world / "Archive" / "moved.md").exists()
    search_response = client.get("/api/search", params={"q": "Move"})
    assert [result["path"] for result in search_response.json()] == ["Archive/moved.md"]


def test_moves_folder_path_recursively_and_updates_index(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Campaign" / "Session").mkdir(parents=True)
    (world / "Archive").mkdir()
    (world / "Campaign" / "Session" / "notes.md").write_text("# Session Notes\n", encoding="utf-8")
    (world / "Campaign" / "Session" / "data.csv").write_text("result,event\n", encoding="utf-8")
    client = make_client(world)

    response = client.post(
        "/api/world/path/move",
        json={"path": "Campaign/Session", "new_path": "Archive/Session"},
    )

    assert response.status_code == 200
    assert response.json()["kind"] == "directory"
    assert response.json()["path"] == "Archive/Session"
    assert not (world / "Campaign" / "Session").exists()
    assert (world / "Archive" / "Session" / "notes.md").exists()
    assert (world / "Archive" / "Session" / "data.csv").exists()
    search_response = client.get("/api/search", params={"q": "Session Notes"})
    assert [result["path"] for result in search_response.json()] == ["Archive/Session/notes.md"]


def test_move_path_rejects_unsafe_missing_duplicate_and_self_descendant(
    tmp_path: Path,
) -> None:
    world = tmp_path / "world"
    (world / "Folder" / "Child").mkdir(parents=True)
    (world / "Folder" / "note.md").write_text("# Note\n", encoding="utf-8")
    (world / "Target").mkdir()
    (world / "Target" / "note.md").write_text("# Existing\n", encoding="utf-8")
    client = make_client(world)

    assert (
        client.post(
            "/api/world/path/move",
            json={"path": "../escape.md", "new_path": "Target/escape.md"},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/world/path/move",
            json={"path": ".virtualscreen/hidden.md", "new_path": "Target/hidden.md"},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/world/path/move",
            json={"path": "Folder/note.md", "new_path": ".virtualscreen/hidden.md"},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/world/path/move",
            json={"path": "Missing.md", "new_path": "Target/missing.md"},
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/world/path/move",
            json={"path": "Folder/note.md", "new_path": "MissingParent/note.md"},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/world/path/move",
            json={"path": "Folder/note.md", "new_path": "Target/note.md"},
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/world/path/move",
            json={"path": "Folder", "new_path": "Folder/Child/Moved"},
        ).status_code
        == 400
    )


def test_duplicates_file_path_and_updates_index(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "copy-me.md").write_text("# Copy Me\n", encoding="utf-8")
    client = make_client(world)

    response = client.post(
        "/api/world/path/duplicate",
        json={"path": "copy-me.md", "new_path": "copy-of-me.md"},
    )

    assert response.status_code == 200
    assert response.json()["path"] == "copy-of-me.md"
    assert (world / "copy-me.md").read_text(encoding="utf-8") == "# Copy Me\n"
    assert (world / "copy-of-me.md").read_text(encoding="utf-8") == "# Copy Me\n"
    assert sorted(
        result["path"] for result in client.get("/api/search", params={"q": "Copy"}).json()
    ) == ["copy-me.md", "copy-of-me.md"]


def test_duplicate_path_can_generate_copy_name(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "copy-me.md").write_text("# Copy Me\n", encoding="utf-8")
    client = make_client(world)

    response = client.post("/api/world/path/duplicate", json={"path": "copy-me.md"})

    assert response.status_code == 200
    assert response.json()["path"] == "copy-me Copy.md"
    assert (world / "copy-me Copy.md").read_text(encoding="utf-8") == "# Copy Me\n"


def test_path_operations_allow_visible_media_without_indexing(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Media").mkdir(parents=True)
    (world / "Archive").mkdir()
    (world / "Media" / "map.png").write_bytes(b"png")
    client = make_client(world)

    response = client.post(
        "/api/world/path/move",
        json={"path": "Media/map.png", "new_path": "Archive/map.png"},
    )

    assert response.status_code == 200
    assert response.json()["path"] == "Archive/map.png"
    assert (world / "Archive" / "map.png").read_bytes() == b"png"
    assert not (world / "Media" / "map.png").exists()


def test_duplicates_folder_path_recursively_and_updates_index(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "Source" / "Nested").mkdir(parents=True)
    (world / "Source" / "Nested" / "notes.md").write_text("# Duplicate Folder\n", encoding="utf-8")
    client = make_client(world)

    response = client.post(
        "/api/world/path/duplicate",
        json={"path": "Source", "new_path": "Source Copy"},
    )

    assert response.status_code == 200
    assert response.json()["kind"] == "directory"
    assert response.json()["path"] == "Source Copy"
    assert (world / "Source" / "Nested" / "notes.md").exists()
    assert (world / "Source Copy" / "Nested" / "notes.md").exists()
    search_response = client.get("/api/search", params={"q": "Duplicate Folder"})
    assert sorted(result["path"] for result in search_response.json()) == [
        "Source Copy/Nested/notes.md",
        "Source/Nested/notes.md",
    ]


def test_tree_search_index_and_duplicate_do_not_follow_symlinks(tmp_path: Path) -> None:
    world = tmp_path / "world"
    outside = tmp_path / "outside"
    (world / "Source").mkdir(parents=True)
    outside.mkdir()
    (world / "Source" / "note.md").write_text("# Local Note\n", encoding="utf-8")
    (outside / "secret.md").write_text("# Outside Secret\noutside-needle\n", encoding="utf-8")
    make_symlink(outside / "secret.md", world / "linked-secret.md")
    make_symlink(outside, world / "LinkedOutside", target_is_directory=True)
    make_symlink(outside / "secret.md", world / "Source" / "linked-secret.md")
    client = make_client(world)

    tree_response = client.get("/api/world/tree")
    search_response = client.get("/api/search", params={"q": "outside-needle"})
    duplicate_response = client.post(
        "/api/world/path/duplicate",
        json={"path": "Source", "new_path": "Source Copy"},
    )

    assert tree_response.status_code == 200
    root_names = {child["name"] for child in tree_response.json()["children"]}
    assert "linked-secret.md" not in root_names
    assert "LinkedOutside" not in root_names
    assert search_response.status_code == 200
    assert search_response.json() == []
    assert duplicate_response.status_code == 400
    assert not (world / "Source Copy").exists()


def test_duplicate_path_rejects_unsafe_missing_duplicate_and_self_descendant(
    tmp_path: Path,
) -> None:
    world = tmp_path / "world"
    (world / "Folder" / "Child").mkdir(parents=True)
    (world / "Folder" / "note.md").write_text("# Note\n", encoding="utf-8")
    (world / "Existing").mkdir()
    client = make_client(world)

    assert (
        client.post(
            "/api/world/path/duplicate",
            json={"path": "../escape.md", "new_path": "copy.md"},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/world/path/duplicate",
            json={"path": "Folder/note.md", "new_path": ".virtualscreen/copy.md"},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/world/path/duplicate",
            json={"path": "Missing.md", "new_path": "copy.md"},
        ).status_code
        == 404
    )
    assert (
        client.post(
            "/api/world/path/duplicate",
            json={"path": "Folder/note.md", "new_path": "Missing/copy.md"},
        ).status_code
        == 400
    )
    assert (
        client.post(
            "/api/world/path/duplicate",
            json={"path": "Folder", "new_path": "Existing"},
        ).status_code
        == 409
    )
    assert (
        client.post(
            "/api/world/path/duplicate",
            json={"path": "Folder", "new_path": "Folder/Child/Copy"},
        ).status_code
        == 400
    )


def test_trashes_file_path_and_removes_it_from_index(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "path-trash.md").write_text("# Path Trash\n", encoding="utf-8")
    client = make_client(world)

    response = client.post("/api/world/path/trash", json={"path": "path-trash.md"})

    assert response.status_code == 200
    body = response.json()
    assert body["path"] == "path-trash.md"
    assert body["trashed_path"].endswith("path-trash.md")
    assert not (world / "path-trash.md").exists()
    assert (world / body["trashed_path"]).exists()
    assert client.get("/api/search", params={"q": "Path Trash"}).json() == []


def test_trashes_folder_path_recursively_and_removes_it_from_index(tmp_path: Path) -> None:
    world = tmp_path / "world"
    (world / "TrashFolder" / "Nested").mkdir(parents=True)
    (world / "TrashFolder" / "Nested" / "notes.md").write_text("# Folder Trash\n", encoding="utf-8")
    client = make_client(world)

    response = client.post("/api/world/path/trash", json={"path": "TrashFolder"})

    assert response.status_code == 200
    body = response.json()
    assert body["path"] == "TrashFolder"
    assert body["trashed_path"].endswith("TrashFolder")
    assert not (world / "TrashFolder").exists()
    assert (world / body["trashed_path"] / "Nested" / "notes.md").exists()
    assert client.get("/api/search", params={"q": "Folder Trash"}).json() == []


def test_trash_path_rejects_unsafe_and_missing_paths(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    client = make_client(world)

    assert client.post("/api/world/path/trash", json={"path": "../escape.md"}).status_code == 400
    assert (
        client.post("/api/world/path/trash", json={"path": ".virtualscreen/hidden.md"}).status_code
        == 400
    )
    assert client.post("/api/world/path/trash", json={"path": "Missing.md"}).status_code == 404
