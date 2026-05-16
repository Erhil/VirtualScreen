from __future__ import annotations

import ast
import hashlib
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Literal

from app.core.audio import scan_audio_library
from app.core.display import display_item_for_path
from app.core.index import (
    list_indexed_links,
    list_indexed_pages,
    media_kind_for_extension,
    rebuild_index,
)
from app.core.map import map_image_path
from app.core.paths import WorldPathError, normalize_relative_path, resolve_under_root
from app.core.scripts import list_dms_scripts

PrepHealthSeverity = Literal["error", "warning"]
PrepHealthIssueKind = Literal[
    "broken_link",
    "missing_embed",
    "missing_dms_reference",
    "dms_parse_error",
]
PrepHealthStatus = Literal["ok", "warning", "error"]

DMS_COMMANDS = {
    "screen_fs",
    "screen_pu",
    "audio_play",
    "table",
    "append_note",
    "map_load",
}


@dataclass(frozen=True)
class PrepHealthIssue:
    id: str
    severity: PrepHealthSeverity
    kind: PrepHealthIssueKind
    source_path: str
    source_title: str | None
    source_kind: str
    raw_target: str
    label: str | None
    command: str | None
    message: str


@dataclass(frozen=True)
class PrepHealthReport:
    checked_at: str
    status: PrepHealthStatus
    issue_count: int
    errors: int
    warnings: int
    issues: list[PrepHealthIssue]


def _checked_at() -> str:
    return datetime.now(tz=UTC).isoformat().replace("+00:00", "Z")


def _issue_id(
    *,
    kind: str,
    source_path: str,
    raw_target: str,
    command: str | None,
) -> str:
    value = "|".join([kind, source_path, raw_target, command or ""])
    return hashlib.sha1(value.encode("utf-8")).hexdigest()[:16]


def _script_title(path: str) -> str:
    return Path(path).stem.replace("_", " ").replace("-", " ").strip().title() or Path(path).stem


def _status(errors: int, warnings: int) -> PrepHealthStatus:
    if errors:
        return "error"
    if warnings:
        return "warning"
    return "ok"


def _dms_literal_calls(source: str) -> list[tuple[str, str]]:
    calls: list[tuple[str, str]] = []
    tree = ast.parse(source)
    for node in ast.walk(tree):
        if not isinstance(node, ast.Call):
            continue
        if not isinstance(node.func, ast.Name):
            continue
        command = node.func.id
        if command not in DMS_COMMANDS or not node.args:
            continue
        first_arg = node.args[0]
        if isinstance(first_arg, ast.Constant) and isinstance(first_arg.value, str):
            calls.append((command, first_arg.value))
    return calls


def _validate_table(root: Path, raw_path: str) -> None:
    relative_path = normalize_relative_path(raw_path)
    target = resolve_under_root(root, relative_path)
    if not target.exists():
        raise FileNotFoundError(relative_path)
    if target.is_dir():
        raise IsADirectoryError(relative_path)
    if target.suffix.lower() != ".csv":
        raise ValueError("table() expects a CSV file.")


def _validate_append_note(root: Path, raw_path: str) -> None:
    relative_path = normalize_relative_path(raw_path)
    target = resolve_under_root(root, relative_path)
    if relative_path == "" or relative_path.split("/")[0] == ".virtualscreen":
        raise WorldPathError("DMS note path is not allowed.")
    if target.suffix.lower() not in {".md", ".markdown"}:
        raise ValueError("append_note() expects a Markdown file.")
    if not target.exists():
        raise FileNotFoundError(relative_path)
    if target.is_dir():
        raise IsADirectoryError(relative_path)


def _validate_audio(root: Path, raw_path: str) -> None:
    relative_path = normalize_relative_path(raw_path)
    tracks = scan_audio_library(root)
    if not any(track.path == relative_path for track in tracks):
        raise FileNotFoundError(relative_path)


def _validate_dms_reference(root: Path, command: str, raw_path: str) -> None:
    if command in {"screen_fs", "screen_pu"}:
        display_item_for_path(root, raw_path)
    elif command == "audio_play":
        _validate_audio(root, raw_path)
    elif command == "table":
        _validate_table(root, raw_path)
    elif command == "append_note":
        _validate_append_note(root, raw_path)
    elif command == "map_load":
        map_image_path(root, raw_path)


def _dms_reference_message(command: str, raw_path: str, error: Exception) -> str:
    if isinstance(error, WorldPathError):
        return f"{command}('{raw_path}') points outside the active world or to an unsafe path."
    return f"{command}('{raw_path}') references a missing or unsupported world file."


def build_prep_health_report(root: Path) -> PrepHealthReport:
    rebuild_index(root)
    pages = {page.path: page for page in list_indexed_pages(root)}
    issues: list[PrepHealthIssue] = []

    for link in list_indexed_links(root):
        if link.resolved:
            continue
        page = pages.get(link.source_path)
        kind: PrepHealthIssueKind = "missing_embed" if link.link_type == "embed" else "broken_link"
        message = (
            f"Missing embedded reference: {link.raw_target}"
            if kind == "missing_embed"
            else f"Broken link: {link.raw_target}"
        )
        issues.append(
            PrepHealthIssue(
                id=_issue_id(
                    kind=kind,
                    source_path=link.source_path,
                    raw_target=link.raw_target,
                    command=None,
                ),
                severity="error",
                kind=kind,
                source_path=link.source_path,
                source_title=page.title if page else None,
                source_kind=media_kind_for_extension(page.extension if page else None),
                raw_target=link.raw_target,
                label=link.label,
                command=None,
                message=message,
            )
        )

    for script in list_dms_scripts(root):
        script_path = resolve_under_root(root, script.path)
        try:
            source = script_path.read_text(encoding="utf-8")
            literal_calls = _dms_literal_calls(source)
        except SyntaxError as exc:
            issues.append(
                PrepHealthIssue(
                    id=_issue_id(
                        kind="dms_parse_error",
                        source_path=script.path,
                        raw_target="",
                        command=None,
                    ),
                    severity="warning",
                    kind="dms_parse_error",
                    source_path=script.path,
                    source_title=script.title or _script_title(script.path),
                    source_kind="script",
                    raw_target="",
                    label=None,
                    command=None,
                    message=f"DMS parse error on line {exc.lineno or '?'}: {exc.msg}",
                )
            )
            continue

        for command, raw_path in literal_calls:
            try:
                _validate_dms_reference(root, command, raw_path)
            except (
                FileNotFoundError,
                IsADirectoryError,
                ValueError,
                WorldPathError,
            ) as exc:
                issues.append(
                    PrepHealthIssue(
                        id=_issue_id(
                            kind="missing_dms_reference",
                            source_path=script.path,
                            raw_target=raw_path,
                            command=command,
                        ),
                        severity="error",
                        kind="missing_dms_reference",
                        source_path=script.path,
                        source_title=script.title or _script_title(script.path),
                        source_kind="script",
                        raw_target=raw_path,
                        label=None,
                        command=command,
                        message=_dms_reference_message(command, raw_path, exc),
                    )
                )

    errors = sum(1 for issue in issues if issue.severity == "error")
    warnings = sum(1 for issue in issues if issue.severity == "warning")
    return PrepHealthReport(
        checked_at=_checked_at(),
        status=_status(errors, warnings),
        issue_count=len(issues),
        errors=errors,
        warnings=warnings,
        issues=issues,
    )
