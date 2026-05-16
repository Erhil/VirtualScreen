import json
from dataclasses import asdict, dataclass
from datetime import UTC, datetime, timedelta
from pathlib import Path
from uuid import uuid4

from app.core.database import initialize_database
from app.core.paths import WorldPathError, resolve_under_root

RECENT_LIMIT = 20
DEFAULT_WORKSPACE_ID = "default"
DEFAULT_WORKSPACE_NAME = "Default"
WORKSPACE_NAME_LIMIT = 60
WORKSPACE_HP_ROW_LIMIT = 60
VALID_MEDIA_KINDS = {
    "markdown",
    "csv",
    "text",
    "script",
    "card",
    "image",
    "pdf",
    "video",
    "unsupported",
}
VALID_LAYOUT_MODES = {"single", "vertical_split"}
VALID_PANE_IDS = {"main", "secondary"}


class WorkspaceNotFoundError(ValueError):
    pass


@dataclass(frozen=True)
class WorkspaceTab:
    path: str
    name: str
    title: str | None
    mediaKind: str


@dataclass(frozen=True)
class WorkspacePane:
    id: str
    activePath: str | None


@dataclass(frozen=True)
class WorkspaceLayout:
    mode: str
    activePaneId: str
    panes: list[WorkspacePane]
    splitRatio: float


@dataclass(frozen=True)
class NamedWorkspaceSummary:
    id: str
    name: str
    is_active: bool
    updated_at: str


@dataclass(frozen=True)
class WorkspaceState:
    workspaceId: str
    workspaceName: str
    tabs: list[WorkspaceTab]
    activePath: str | None
    layout: WorkspaceLayout
    favorites: list[WorkspaceTab]
    recentFiles: list[WorkspaceTab]


@dataclass(frozen=True)
class WorkspaceHpRow:
    id: str
    name: str
    current_hp: int
    max_hp: int | None
    status: str
    notes: str


@dataclass(frozen=True)
class WorkspaceHpState:
    workspace_id: str
    rows: list[WorkspaceHpRow]
    updated_at: str


def _now() -> str:
    return datetime.now(tz=UTC).isoformat().replace("+00:00", "Z")


def _tab_from_dict(value: object) -> WorkspaceTab:
    if not isinstance(value, dict):
        raise ValueError("Workspace tab must be an object.")
    media_kind = str(value.get("mediaKind") or "")
    if media_kind not in VALID_MEDIA_KINDS:
        raise ValueError("Workspace tab has an unsupported media kind.")
    title = value.get("title")
    return WorkspaceTab(
        path=str(value.get("path") or ""),
        name=str(value.get("name") or ""),
        title=str(title) if title is not None else None,
        mediaKind=media_kind,
    )


def _tab_json(tab: WorkspaceTab) -> str:
    return json.dumps(asdict(tab), ensure_ascii=False, sort_keys=True)


def _tabs_from_json(value: str) -> list[WorkspaceTab]:
    return [_tab_from_dict(item) for item in json.loads(value)]


def _tabs_json(tabs: list[WorkspaceTab]) -> str:
    return json.dumps([asdict(tab) for tab in tabs], ensure_ascii=False)


def _default_layout(active_path: str | None = None) -> WorkspaceLayout:
    return WorkspaceLayout(
        mode="single",
        activePaneId="main",
        panes=[
            WorkspacePane(id="main", activePath=active_path),
            WorkspacePane(id="secondary", activePath=None),
        ],
        splitRatio=0.5,
    )


def _layout_json(layout: WorkspaceLayout) -> str:
    return json.dumps(asdict(layout), ensure_ascii=False, sort_keys=True)


def _clamp_split_ratio(value: object) -> float:
    ratio = float(value)
    return min(0.75, max(0.25, ratio))


def _validate_layout(layout: WorkspaceLayout, tab_paths: set[str]) -> WorkspaceLayout:
    if layout.mode not in VALID_LAYOUT_MODES:
        raise ValueError("Workspace layout mode must be single or vertical_split.")
    if layout.activePaneId not in VALID_PANE_IDS:
        raise ValueError("Workspace layout active pane must be main or secondary.")
    if {pane.id for pane in layout.panes} != VALID_PANE_IDS or len(layout.panes) != 2:
        raise ValueError("Workspace layout must include main and secondary panes.")

    panes_by_id = {pane.id: pane for pane in layout.panes}
    panes: list[WorkspacePane] = []
    for pane_id in ("main", "secondary"):
        active_path = panes_by_id[pane_id].activePath
        if active_path is not None and active_path not in tab_paths:
            raise ValueError("Workspace pane active path must be one of the open tabs.")
        panes.append(WorkspacePane(id=pane_id, activePath=active_path))

    return WorkspaceLayout(
        mode=layout.mode,
        activePaneId=layout.activePaneId,
        panes=panes,
        splitRatio=_clamp_split_ratio(layout.splitRatio),
    )


def _layout_from_dict(value: object, tab_paths: set[str]) -> WorkspaceLayout:
    if not isinstance(value, dict):
        raise ValueError("Workspace layout must be an object.")
    panes_value = value.get("panes")
    if not isinstance(panes_value, list):
        raise ValueError("Workspace layout panes must be a list.")
    panes = [
        WorkspacePane(
            id=str(item.get("id") or ""),
            activePath=(
                str(item["activePath"])
                if isinstance(item, dict) and item.get("activePath") is not None
                else None
            ),
        )
        for item in panes_value
        if isinstance(item, dict)
    ]
    return _validate_layout(
        WorkspaceLayout(
            mode=str(value.get("mode") or ""),
            activePaneId=str(value.get("activePaneId") or ""),
            panes=panes,
            splitRatio=value.get("splitRatio", 0.5),
        ),
        tab_paths,
    )


def _layout_from_json(value: str, active_path: str | None, tab_paths: set[str]) -> WorkspaceLayout:
    try:
        return _layout_from_dict(json.loads(value), tab_paths)
    except (TypeError, ValueError, json.JSONDecodeError):
        return _default_layout(active_path if active_path in tab_paths else None)


def _normalize_layout_for_tabs(
    layout: WorkspaceLayout,
    tabs: list[WorkspaceTab],
    active_path: str | None,
) -> WorkspaceLayout:
    tab_paths = {tab.path for tab in tabs}
    panes = []
    for pane in layout.panes:
        pane_active_path = pane.activePath if pane.activePath in tab_paths else None
        if layout.mode == "single" and pane.id == "main":
            pane_active_path = active_path if active_path in tab_paths else None
        panes.append(WorkspacePane(id=pane.id, activePath=pane_active_path))
    return _validate_layout(
        WorkspaceLayout(
            mode=layout.mode,
            activePaneId=layout.activePaneId,
            panes=panes,
            splitRatio=layout.splitRatio,
        ),
        tab_paths,
    )


def _validate_tab(root: Path, tab: WorkspaceTab) -> None:
    if not tab.path:
        raise WorldPathError("Workspace tab path is required.")
    path = resolve_under_root(root, tab.path)
    if not path.exists():
        raise WorldPathError("Workspace tab path was not found.")
    if path.is_dir():
        raise WorldPathError("Workspace tab path points to a directory.")


def _validate_tabs(root: Path, tabs: list[WorkspaceTab]) -> None:
    for tab in tabs:
        _validate_tab(root, tab)


def _normalize_name(conn, name: str, workspace_id: str | None = None) -> str:
    normalized = name.strip()
    if not normalized:
        raise ValueError("Workspace name is required.")
    if len(normalized) > WORKSPACE_NAME_LIMIT:
        raise ValueError("Workspace name must be 60 characters or fewer.")
    row = conn.execute(
        """
        select id from named_workspaces
        where name = ? and (? is null or id != ?)
        """,
        (normalized, workspace_id, workspace_id),
    ).fetchone()
    if row:
        raise ValueError("Workspace name must be unique.")
    return normalized


def _summary_from_row(row) -> NamedWorkspaceSummary:
    return NamedWorkspaceSummary(
        id=row["id"],
        name=row["name"],
        is_active=bool(row["is_active"]),
        updated_at=row["updated_at"],
    )


def _required_hp_text(value: object, field_name: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"HP row {field_name} is required.")
    normalized = value.strip()
    if not normalized:
        raise ValueError(f"HP row {field_name} is required.")
    return normalized


def _optional_hp_text(value: object, field_name: str, limit: int) -> str:
    if value is None:
        return ""
    if not isinstance(value, str):
        raise ValueError(f"HP row {field_name} must be text.")
    if len(value) > limit:
        raise ValueError(f"HP row {field_name} must be {limit} characters or fewer.")
    return value


def _hp_int(value: object, field_name: str, minimum: int, maximum: int) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"HP row {field_name} must be an integer.")
    if value < minimum or value > maximum:
        raise ValueError(f"HP row {field_name} must be between {minimum} and {maximum}.")
    return value


def _hp_row_from_dict(value: object, seen_ids: set[str]) -> WorkspaceHpRow:
    if not isinstance(value, dict):
        raise ValueError("HP row must be an object.")

    row_id = _required_hp_text(value.get("id"), "id")
    if row_id in seen_ids:
        raise ValueError("HP row ids must be unique.")
    seen_ids.add(row_id)

    max_hp_value = value.get("max_hp")
    max_hp = (
        None
        if max_hp_value is None
        else _hp_int(max_hp_value, "max_hp", 1, 9999)
    )
    return WorkspaceHpRow(
        id=row_id,
        name=_required_hp_text(value.get("name"), "name"),
        current_hp=_hp_int(value.get("current_hp"), "current_hp", -9999, 9999),
        max_hp=max_hp,
        status=_optional_hp_text(value.get("status"), "status", 120),
        notes=_optional_hp_text(value.get("notes"), "notes", 500),
    )


def _hp_rows_from_value(value: object) -> list[WorkspaceHpRow]:
    if not isinstance(value, list):
        raise ValueError("HP rows must be a list.")
    if len(value) > WORKSPACE_HP_ROW_LIMIT:
        raise ValueError("HP rows must contain 60 rows or fewer.")

    seen_ids: set[str] = set()
    return [_hp_row_from_dict(item, seen_ids) for item in value]


def _hp_rows_from_json(value: str) -> list[WorkspaceHpRow]:
    loaded = json.loads(value)
    return _hp_rows_from_value(loaded)


def _hp_rows_json(rows: list[WorkspaceHpRow]) -> str:
    return json.dumps([asdict(row) for row in rows], ensure_ascii=False, sort_keys=True)


def _ensure_default_workspace(conn) -> None:
    count = conn.execute("select count(*) from named_workspaces").fetchone()[0]
    if count == 0:
        legacy = conn.execute(
            "select tabs_json, active_path from workspace_state where id = 1"
        ).fetchone()
        tabs_json = legacy["tabs_json"] if legacy else "[]"
        active_path = legacy["active_path"] if legacy else None
        try:
            tabs = _tabs_from_json(tabs_json)
        except (TypeError, ValueError, json.JSONDecodeError):
            tabs = []
            active_path = None
            tabs_json = "[]"
        tab_paths = {tab.path for tab in tabs}
        active_path = active_path if active_path in tab_paths else None
        timestamp = _now()
        conn.execute(
            """
            insert or ignore into named_workspaces(
              id, name, tabs_json, active_path, layout_json, is_active, created_at, updated_at
            )
            values (?, ?, ?, ?, ?, 1, ?, ?)
            """,
            (
                DEFAULT_WORKSPACE_ID,
                DEFAULT_WORKSPACE_NAME,
                tabs_json,
                active_path,
                _layout_json(_default_layout(active_path)),
                timestamp,
                timestamp,
            ),
        )

    active = conn.execute(
        "select id from named_workspaces where is_active = 1 limit 1"
    ).fetchone()
    if not active:
        conn.execute(
            """
            update named_workspaces
            set is_active = 1
            where id = (
              select id from named_workspaces order by id = ? desc, name limit 1
            )
            """,
            (DEFAULT_WORKSPACE_ID,),
        )


def _active_workspace_row(conn):
    _ensure_default_workspace(conn)
    return conn.execute(
        """
        select id, name, tabs_json, active_path, layout_json, updated_at
        from named_workspaces
        where is_active = 1
        limit 1
        """
    ).fetchone()


def _workspace_row(conn, workspace_id: str):
    _ensure_default_workspace(conn)
    row = conn.execute(
        """
        select id, name, is_active, updated_at
        from named_workspaces
        where id = ?
        """,
        (workspace_id,),
    ).fetchone()
    if not row:
        raise WorkspaceNotFoundError("Workspace was not found.")
    return row


def _load_favorites(conn) -> list[WorkspaceTab]:
    rows = conn.execute("select tab_json from favorites order by position").fetchall()
    return [_tab_from_dict(json.loads(row["tab_json"])) for row in rows]


def _load_recent(conn) -> list[WorkspaceTab]:
    rows = conn.execute(
        "select tab_json from recent_files order by opened_at desc limit ?",
        (RECENT_LIMIT,),
    ).fetchall()
    return [_tab_from_dict(json.loads(row["tab_json"])) for row in rows]


def list_workspaces(root: Path) -> list[NamedWorkspaceSummary]:
    conn = initialize_database(root)
    with conn:
        _ensure_default_workspace(conn)
        rows = conn.execute(
            """
            select id, name, is_active, updated_at
            from named_workspaces
            order by id != ? asc, name asc
            """,
            (DEFAULT_WORKSPACE_ID,),
        ).fetchall()
    conn.close()
    return [_summary_from_row(row) for row in rows]


def load_workspace(root: Path) -> WorkspaceState:
    conn = initialize_database(root)
    with conn:
        row = _active_workspace_row(conn)
        tabs = _tabs_from_json(row["tabs_json"])
        tab_paths = {tab.path for tab in tabs}
        active_path = row["active_path"] if row["active_path"] in tab_paths else None
        layout = _layout_from_json(row["layout_json"], active_path, tab_paths)
        favorites = _load_favorites(conn)
        recent_files = _load_recent(conn)
    conn.close()

    return WorkspaceState(
        workspaceId=row["id"],
        workspaceName=row["name"],
        tabs=tabs,
        activePath=active_path,
        layout=layout,
        favorites=favorites,
        recentFiles=recent_files,
    )


def load_workspace_hp(root: Path) -> WorkspaceHpState:
    conn = initialize_database(root)
    with conn:
        workspace = _active_workspace_row(conn)
        row = conn.execute(
            """
            select rows_json, updated_at
            from workspace_hp
            where workspace_id = ?
            """,
            (workspace["id"],),
        ).fetchone()
    conn.close()

    if not row:
        return WorkspaceHpState(workspace_id=workspace["id"], rows=[], updated_at=_now())

    try:
        rows = _hp_rows_from_json(row["rows_json"])
    except (TypeError, ValueError, json.JSONDecodeError):
        rows = []
    return WorkspaceHpState(
        workspace_id=workspace["id"],
        rows=rows,
        updated_at=row["updated_at"],
    )


def save_workspace_hp(root: Path, rows: list[WorkspaceHpRow]) -> WorkspaceHpState:
    validated_rows = _hp_rows_from_value([asdict(row) for row in rows])
    conn = initialize_database(root)
    with conn:
        workspace = _active_workspace_row(conn)
        updated_at = _now()
        conn.execute(
            """
            insert into workspace_hp(workspace_id, rows_json, updated_at)
            values (?, ?, ?)
            on conflict(workspace_id) do update
            set rows_json = excluded.rows_json,
                updated_at = excluded.updated_at
            """,
            (workspace["id"], _hp_rows_json(validated_rows), updated_at),
        )
    conn.close()
    return WorkspaceHpState(
        workspace_id=workspace["id"],
        rows=validated_rows,
        updated_at=updated_at,
    )


def create_workspace(root: Path, name: str) -> WorkspaceState:
    conn = initialize_database(root)
    with conn:
        _ensure_default_workspace(conn)
        normalized = _normalize_name(conn, name)
        timestamp = _now()
        workspace_id = uuid4().hex
        conn.execute("update named_workspaces set is_active = 0")
        conn.execute(
            """
            insert into named_workspaces(
              id, name, tabs_json, active_path, layout_json, is_active, created_at, updated_at
            )
            values (?, ?, '[]', null, ?, 1, ?, ?)
            """,
            (
                workspace_id,
                normalized,
                _layout_json(_default_layout()),
                timestamp,
                timestamp,
            ),
        )
    conn.close()
    return load_workspace(root)


def rename_workspace(root: Path, workspace_id: str, name: str) -> NamedWorkspaceSummary:
    conn = initialize_database(root)
    with conn:
        _workspace_row(conn, workspace_id)
        normalized = _normalize_name(conn, name, workspace_id)
        conn.execute(
            "update named_workspaces set name = ?, updated_at = ? where id = ?",
            (normalized, _now(), workspace_id),
        )
        row = _workspace_row(conn, workspace_id)
    conn.close()
    return _summary_from_row(row)


def activate_workspace(root: Path, workspace_id: str) -> WorkspaceState:
    conn = initialize_database(root)
    with conn:
        _workspace_row(conn, workspace_id)
        conn.execute("update named_workspaces set is_active = 0")
        conn.execute(
            "update named_workspaces set is_active = 1, updated_at = ? where id = ?",
            (_now(), workspace_id),
        )
    conn.close()
    return load_workspace(root)


def delete_workspace(root: Path, workspace_id: str) -> list[NamedWorkspaceSummary]:
    conn = initialize_database(root)
    with conn:
        row = _workspace_row(conn, workspace_id)
        if workspace_id == DEFAULT_WORKSPACE_ID:
            raise ValueError("Default workspace cannot be deleted.")
        if row["is_active"]:
            raise ValueError("Active workspace cannot be deleted.")
        conn.execute("delete from named_workspaces where id = ?", (workspace_id,))
    conn.close()
    return list_workspaces(root)


def save_tabs(root: Path, tabs: list[WorkspaceTab], active_path: str | None) -> WorkspaceState:
    _validate_tabs(root, tabs)
    if active_path is not None and active_path not in {tab.path for tab in tabs}:
        raise WorldPathError("Active workspace tab must be one of the open tabs.")

    conn = initialize_database(root)
    with conn:
        row = _active_workspace_row(conn)
        current_tabs = _tabs_from_json(row["tabs_json"])
        current_paths = {tab.path for tab in current_tabs}
        layout = _layout_from_json(row["layout_json"], row["active_path"], current_paths)
        layout = _normalize_layout_for_tabs(layout, tabs, active_path)
        conn.execute(
            """
            update named_workspaces
            set tabs_json = ?, active_path = ?, layout_json = ?, updated_at = ?
            where id = ?
            """,
            (
                _tabs_json(tabs),
                active_path,
                _layout_json(layout),
                _now(),
                row["id"],
            ),
        )
    conn.close()
    return load_workspace(root)


def save_layout(root: Path, layout: WorkspaceLayout) -> WorkspaceState:
    conn = initialize_database(root)
    with conn:
        row = _active_workspace_row(conn)
        tabs = _tabs_from_json(row["tabs_json"])
        layout = _validate_layout(layout, {tab.path for tab in tabs})
        conn.execute(
            """
            update named_workspaces
            set layout_json = ?, updated_at = ?
            where id = ?
            """,
            (_layout_json(layout), _now(), row["id"]),
        )
    conn.close()
    return load_workspace(root)


def restore_workspace_state(
    root: Path,
    workspace_id: str,
    tabs: list[WorkspaceTab],
    active_path: str | None,
    layout: WorkspaceLayout,
) -> WorkspaceState:
    _validate_tabs(root, tabs)
    tab_paths = {tab.path for tab in tabs}
    if active_path is not None and active_path not in tab_paths:
        raise WorldPathError("Active workspace tab must be one of the open tabs.")
    normalized_layout = _validate_layout(layout, tab_paths)

    conn = initialize_database(root)
    with conn:
        _workspace_row(conn, workspace_id)
        timestamp = _now()
        conn.execute("update named_workspaces set is_active = 0")
        conn.execute(
            """
            update named_workspaces
            set tabs_json = ?, active_path = ?, layout_json = ?, is_active = 1, updated_at = ?
            where id = ?
            """,
            (
                _tabs_json(tabs),
                active_path,
                _layout_json(normalized_layout),
                timestamp,
                workspace_id,
            ),
        )
    conn.close()
    return load_workspace(root)


def save_favorites(root: Path, favorites: list[WorkspaceTab]) -> WorkspaceState:
    _validate_tabs(root, favorites)
    conn = initialize_database(root)
    with conn:
        _ensure_default_workspace(conn)
        conn.execute("delete from favorites")
        for index, tab in enumerate(favorites):
            conn.execute(
                "insert into favorites(position, tab_json) values (?, ?)",
                (index, _tab_json(tab)),
            )
    conn.close()
    return load_workspace(root)


def record_recent(root: Path, tab: WorkspaceTab) -> WorkspaceState:
    _validate_tab(root, tab)
    opened_at = _now()
    conn = initialize_database(root)
    with conn:
        _ensure_default_workspace(conn)
        conn.execute(
            """
            insert into recent_files(path, tab_json, opened_at)
            values (?, ?, ?)
            on conflict(path) do update
            set tab_json = excluded.tab_json,
                opened_at = excluded.opened_at
            """,
            (tab.path, _tab_json(tab), opened_at),
        )
        stale_rows = conn.execute(
            "select path from recent_files order by opened_at desc limit -1 offset ?",
            (RECENT_LIMIT,),
        ).fetchall()
        for row in stale_rows:
            conn.execute("delete from recent_files where path = ?", (row["path"],))
    conn.close()
    return load_workspace(root)


def save_recent_files(root: Path, recent_files: list[WorkspaceTab]) -> WorkspaceState:
    _validate_tabs(root, recent_files)
    now = datetime.now(tz=UTC)
    conn = initialize_database(root)
    with conn:
        _ensure_default_workspace(conn)
        conn.execute("delete from recent_files")
        for index, tab in enumerate(recent_files[:RECENT_LIMIT]):
            opened_at = (now - timedelta(microseconds=index)).isoformat().replace(
                "+00:00",
                "Z",
            )
            conn.execute(
                """
                insert into recent_files(path, tab_json, opened_at)
                values (?, ?, ?)
                """,
                (tab.path, _tab_json(tab), opened_at),
            )
    conn.close()
    return load_workspace(root)
