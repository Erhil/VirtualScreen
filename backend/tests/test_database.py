import json
import os
import sqlite3
from pathlib import Path

import pytest

from app.core import pages as page_core
from app.core.database import database_path, initialize_database
from app.core.index import (
    ensure_page_indexed,
    list_indexed_links,
    list_indexed_pages,
    rebuild_index,
    refresh_index,
)
from app.core.search import search_index


def make_symlink(source: Path, link: Path, *, target_is_directory: bool = False) -> None:
    try:
        os.symlink(source, link, target_is_directory=target_is_directory)
    except (OSError, NotImplementedError) as exc:
        pytest.skip(f"Symlinks are not available in this environment: {exc}")


def test_schema_initialization_creates_database_and_tables(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()

    initialize_database(world).close()

    assert database_path(world) == world / ".virtualscreen" / "virtualscreen.sqlite3"
    assert database_path(world).exists()

    with sqlite3.connect(database_path(world)) as conn:
        table_names = {
            row[0]
            for row in conn.execute(
                "select name from sqlite_master where type in ('table', 'virtual')"
            )
        }

    assert "app_meta" in table_names
    assert "pages" in table_names
    assert "links" in table_names
    assert "search_fts" in table_names
    assert "workspace_state" in table_names
    assert "named_workspaces" in table_names
    assert "workspace_hp" in table_names
    assert "favorites" in table_names
    assert "recent_files" in table_names
    assert "display_state" in table_names
    assert "map_state" in table_names
    assert "map_presets" in table_names
    assert "table_snapshots" in table_names
    assert "fast_slots" in table_names


def test_table_snapshots_schema_uses_state_json_only_for_new_databases(
    tmp_path: Path,
) -> None:
    world = tmp_path / "world"
    world.mkdir()

    initialize_database(world).close()

    with sqlite3.connect(database_path(world)) as conn:
        columns = {
            row[1] for row in conn.execute("pragma table_info(table_snapshots)").fetchall()
        }

    assert columns == {
        "id",
        "name",
        "state_json",
        "created_at",
        "updated_at",
    }


def test_table_snapshots_legacy_schema_backfills_state_json(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    database_path(world).parent.mkdir()
    display = {"fullscreen": {"path": "README.md"}, "popups": []}
    map_state = {"image_path": "Maps/cave.png"}
    workspace = {
        "workspace_id": "default",
        "workspace_name": "Default",
        "tabs": [],
        "activePath": None,
        "layout": {"sidebar": 320, "panes": []},
    }
    audio = [{"path": ".music/effects/bell.mp3"}]

    with sqlite3.connect(database_path(world)) as conn:
        conn.execute(
            """
            create table table_snapshots (
              id text primary key,
              name text not null unique,
              display_json text not null,
              map_json text not null,
              workspace_json text not null,
              audio_paths_json text not null,
              created_at text not null,
              updated_at text not null
            )
            """
        )
        conn.execute(
            """
            insert into table_snapshots(
              id, name, display_json, map_json, workspace_json,
              audio_paths_json, created_at, updated_at
            )
            values (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                "snapshot-1",
                "Legacy",
                json.dumps(display),
                json.dumps(map_state),
                json.dumps(workspace),
                json.dumps(audio),
                "2026-05-01T00:00:00Z",
                "2026-05-01T00:00:00Z",
            ),
        )

    initialize_database(world).close()

    with sqlite3.connect(database_path(world)) as conn:
        conn.row_factory = sqlite3.Row
        columns = {
            row["name"] for row in conn.execute("pragma table_info(table_snapshots)").fetchall()
        }
        row = conn.execute(
            "select state_json from table_snapshots where id = ?",
            ("snapshot-1",),
        ).fetchone()

    assert "state_json" in columns
    assert json.loads(row["state_json"]) == {
        "display": display,
        "map": map_state,
        "workspace": workspace,
        "audio": audio,
    }


def test_schema_initialization_is_idempotent(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()

    initialize_database(world).close()
    initialize_database(world).close()

    assert database_path(world).exists()


def test_rebuild_index_ignores_virtualscreen_directory(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "visible.md").write_text("# Visible\n\nFind me.", encoding="utf-8")
    hidden_dir = world / ".virtualscreen"
    hidden_dir.mkdir()
    (hidden_dir / "hidden.md").write_text("# Hidden", encoding="utf-8")

    result = rebuild_index(world)
    pages = list_indexed_pages(world)

    assert result.pages_indexed == 1
    assert [page.path for page in pages] == ["visible.md"]


def test_rebuild_index_caps_large_text_and_sidecar_metadata_reads(
    tmp_path: Path,
    monkeypatch,
) -> None:
    world = tmp_path / "world"
    (world / "Media").mkdir(parents=True)
    metadata_dir = world / ".virtualscreen" / "metadata" / "Media"
    metadata_dir.mkdir(parents=True)
    (world / "large.md").write_text("# Hidden Needle\noutside-needle\n", encoding="utf-8")
    (world / "Media" / "map.png").write_bytes(b"png")
    (metadata_dir / "map.png.json").write_text(
        json.dumps({"title": "Outside Needle", "tags": ["outside-needle"]}),
        encoding="utf-8",
    )
    monkeypatch.setattr(page_core, "MAX_INDEX_TEXT_BYTES", 10)
    monkeypatch.setattr(page_core, "MAX_SIDECAR_METADATA_BYTES", 10)

    result = rebuild_index(world)
    indexed = {page.path: page for page in list_indexed_pages(world)}
    search_results = search_index(world, "outside-needle")

    assert result.pages_indexed == 2
    assert indexed["large.md"].title == "large"
    assert indexed["large.md"].body == ""
    assert indexed["Media/map.png"].title == "map"
    assert indexed["Media/map.png"].metadata == {}
    assert search_results == []


def test_refresh_index_inserts_changed_page_without_scanning_world(
    tmp_path: Path,
    monkeypatch,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    rebuild_index(world)
    (world / "new.md").write_text("# New Note\n\nFind needle.", encoding="utf-8")
    monkeypatch.setattr(
        "app.core.index.scan_pages",
        lambda _root: (_ for _ in ()).throw(AssertionError("full scan should not run")),
    )

    result = refresh_index(world, changed_paths=["new.md"])
    pages = {page.path: page for page in list_indexed_pages(world)}
    search_results = search_index(world, "needle")

    assert result.pages_indexed == 1
    assert pages["new.md"].title == "New Note"
    assert [item.path for item in search_results] == ["new.md"]


def test_refresh_index_updates_page_and_rebuilds_links_from_indexed_pages(
    tmp_path: Path,
    monkeypatch,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "source.md").write_text("[Target](target.md)\n", encoding="utf-8")
    (world / "target.md").write_text("# Target\n", encoding="utf-8")
    rebuild_index(world)
    (world / "target.md").write_text("# Renamed Target\nfresh-needle\n", encoding="utf-8")
    monkeypatch.setattr(
        "app.core.index.scan_pages",
        lambda _root: (_ for _ in ()).throw(AssertionError("full scan should not run")),
    )

    refresh_index(world, changed_paths=["target.md"])
    pages = {page.path: page for page in list_indexed_pages(world)}
    links = list_indexed_links(world, "source.md")
    search_results = search_index(world, "fresh-needle")

    assert pages["target.md"].title == "Renamed Target"
    assert links[0].target_title == "Renamed Target"
    assert [item.path for item in search_results] == ["target.md"]


def test_refresh_index_deletes_removed_page_and_rebuilds_links_from_indexed_pages(
    tmp_path: Path,
    monkeypatch,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "source.md").write_text("[Target](target.md)\n", encoding="utf-8")
    (world / "target.md").write_text("# Target\n", encoding="utf-8")
    rebuild_index(world)
    (world / "target.md").unlink()
    monkeypatch.setattr(
        "app.core.index.scan_pages",
        lambda _root: (_ for _ in ()).throw(AssertionError("full scan should not run")),
    )

    refresh_index(world, deleted_paths=["target.md"])
    pages = {page.path: page for page in list_indexed_pages(world)}
    links = list_indexed_links(world, "source.md")
    search_results = search_index(world, "Target")

    assert "target.md" not in pages
    assert links[0].target_path is None
    assert "target.md" not in [item.path for item in search_results]


def test_refresh_index_folder_change_skips_symlinked_files(tmp_path: Path) -> None:
    world = tmp_path / "world"
    outside = tmp_path / "outside"
    (world / "Folder").mkdir(parents=True)
    outside.mkdir()
    (world / "Folder" / "good.md").write_text("# Good\n", encoding="utf-8")
    (outside / "secret.md").write_text("# Secret\nhidden-needle\n", encoding="utf-8")
    make_symlink(outside / "secret.md", world / "Folder" / "linked-secret.md")
    rebuild_index(world)

    refresh_index(world, changed_paths=["Folder"])

    paths = [page.path for page in list_indexed_pages(world)]
    assert paths == ["Folder/good.md"]
    assert search_index(world, "hidden-needle") == []


def test_refresh_index_direct_change_skips_symlinked_file(tmp_path: Path) -> None:
    world = tmp_path / "world"
    outside = tmp_path / "outside"
    world.mkdir()
    outside.mkdir()
    (outside / "secret.md").write_text("# Secret\nhidden-needle\n", encoding="utf-8")
    make_symlink(outside / "secret.md", world / "linked-secret.md")
    rebuild_index(world)

    refresh_index(world, changed_paths=["linked-secret.md"])

    assert list_indexed_pages(world) == []
    assert search_index(world, "hidden-needle") == []


def test_ensure_page_indexed_refreshes_stale_page_without_full_rebuild(
    tmp_path: Path,
    monkeypatch,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    note = world / "note.md"
    note.write_text("# Old\n", encoding="utf-8")
    rebuild_index(world)
    note.write_text("# New\n", encoding="utf-8")
    monkeypatch.setattr(
        "app.core.index.scan_pages",
        lambda _root: (_ for _ in ()).throw(AssertionError("full scan should not run")),
    )

    indexed = ensure_page_indexed(world, note)

    assert indexed.title == "New"


def test_empty_index_does_not_rebuild_after_rebuilt_marker(
    tmp_path: Path,
    monkeypatch,
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    rebuild_index(world)
    monkeypatch.setattr(
        "app.core.index.scan_pages",
        lambda _root: (_ for _ in ()).throw(AssertionError("full scan should not run")),
    )

    assert list_indexed_pages(world) == []
