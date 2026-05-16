import json
import sqlite3
from pathlib import Path

DATABASE_DIR = ".virtualscreen"
DATABASE_NAME = "virtualscreen.sqlite3"


def _legacy_snapshot_value(raw_value: object, fallback: object) -> object:
    if raw_value is None:
        return fallback
    try:
        return json.loads(str(raw_value))
    except json.JSONDecodeError:
        return fallback


def _migrate_table_snapshots(conn: sqlite3.Connection) -> None:
    columns = {
        row["name"] for row in conn.execute("pragma table_info(table_snapshots)").fetchall()
    }
    if "state_json" in columns:
        return

    conn.execute("alter table table_snapshots add column state_json text not null default '{}'")
    legacy_columns = {"display_json", "map_json", "workspace_json", "audio_paths_json"}
    if not legacy_columns.issubset(columns):
        return

    rows = conn.execute(
        """
        select id, display_json, map_json, workspace_json, audio_paths_json
        from table_snapshots
        """
    ).fetchall()
    for row in rows:
        state = {
            "display": _legacy_snapshot_value(row["display_json"], {}),
            "map": _legacy_snapshot_value(row["map_json"], {}),
            "workspace": _legacy_snapshot_value(row["workspace_json"], {}),
            "audio": _legacy_snapshot_value(row["audio_paths_json"], []),
        }
        conn.execute(
            "update table_snapshots set state_json = ? where id = ?",
            (json.dumps(state, ensure_ascii=False, sort_keys=True), row["id"]),
        )


def database_path(root: Path) -> Path:
    return root / DATABASE_DIR / DATABASE_NAME


def connect_database(root: Path) -> sqlite3.Connection:
    path = database_path(root)
    path.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    conn.execute("pragma foreign_keys = on")
    return conn


def initialize_database(root: Path) -> sqlite3.Connection:
    conn = connect_database(root)
    conn.executescript(
        """
        create table if not exists app_meta (
          key text primary key,
          value text not null
        );

        create table if not exists pages (
          id integer primary key,
          path text not null unique,
          name text not null,
          extension text,
          media_kind text not null,
          title text not null,
          page_type text,
          tags_json text not null,
          aliases_json text not null,
          metadata_json text not null,
          fields_json text not null,
          body text not null,
          size integer not null,
          modified_at text not null,
          content_hash text not null default ''
        );

        create table if not exists links (
          id integer primary key,
          source_path text not null,
          raw_target text not null,
          label text not null,
          link_type text not null,
          target_path text,
          target_title text,
          target_kind text,
          heading text,
          resolved integer not null,
          link_order integer not null
        );

        create virtual table if not exists search_fts using fts5(
          path,
          title,
          aliases,
          tags,
          metadata,
          body
        );

        create table if not exists workspace_state (
          id integer primary key check (id = 1),
          tabs_json text not null default '[]',
          active_path text
        );

        create table if not exists named_workspaces (
          id text primary key,
          name text not null unique,
          tabs_json text not null default '[]',
          active_path text,
          layout_json text not null,
          is_active integer not null default 0,
          created_at text not null,
          updated_at text not null
        );

        create table if not exists workspace_hp (
          workspace_id text primary key,
          rows_json text not null,
          updated_at text not null,
          foreign key(workspace_id) references named_workspaces(id) on delete cascade
        );

        create table if not exists favorites (
          position integer primary key,
          tab_json text not null
        );

        create table if not exists recent_files (
          path text primary key,
          tab_json text not null,
          opened_at text not null
        );

        create table if not exists display_state (
          id integer primary key check (id = 1),
          state_json text not null,
          updated_at text not null
        );

        create table if not exists map_state (
          id integer primary key check (id = 1),
          state_json text not null,
          updated_at text not null
        );

        create table if not exists map_presets (
          id text primary key,
          name text not null,
          state_json text not null,
          created_at text not null,
          updated_at text not null
        );

        create table if not exists table_snapshots (
          id text primary key,
          name text not null unique,
          state_json text not null,
          created_at text not null,
          updated_at text not null
        );

        create table if not exists fast_slots (
          position integer primary key,
          slot_json text not null
        );

        create table if not exists scenario_runs (
          run_id text primary key,
          scenario_id text not null,
          status text not null,
          output_kind text not null,
          output text not null,
          stderr text not null,
          created_at text not null
        );
        """
    )
    columns = {
        row["name"] for row in conn.execute("pragma table_info(pages)").fetchall()
    }
    if "content_hash" not in columns:
        conn.execute("alter table pages add column content_hash text not null default ''")
    _migrate_table_snapshots(conn)
    conn.commit()
    return conn
