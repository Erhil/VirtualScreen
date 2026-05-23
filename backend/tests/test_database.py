import json
import sqlite3
from pathlib import Path

from app.core import pages as page_core
from app.core.database import database_path, initialize_database
from app.core.index import list_indexed_pages, rebuild_index
from app.core.search import search_index


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
