from __future__ import annotations

import asyncio
from contextlib import suppress
from dataclasses import dataclass
from pathlib import Path

from watchfiles import Change, awatch

from app.core.events import WorldEventHub, world_event_hub, world_event_payload
from app.core.index import rebuild_index
from app.core.paths import normalize_relative_path

IGNORED_DIRECTORIES = {".virtualscreen", ".git", "__pycache__"}
IGNORED_FILENAMES = {".ds_store", "thumbs.db"}
TEMP_SUFFIXES = (".tmp", ".temp", ".swp", ".swx", ".part", ".crdownload", "~")


@dataclass(frozen=True)
class WatchChangeSummary:
    paths: list[str]
    deleted_paths: list[str]
    reason: str


def _path_parts(relative_path: str | Path) -> list[str]:
    return [part for part in str(relative_path).replace("\\", "/").strip("/").split("/") if part]


def is_ignored_world_path(relative_path: str | Path) -> bool:
    parts = _path_parts(relative_path)
    if not parts:
        return True
    if any(part in IGNORED_DIRECTORIES for part in parts):
        return True

    filename = parts[-1].lower()
    return (
        filename in IGNORED_FILENAMES
        or filename.startswith(".#")
        or filename.startswith("~$")
        or filename.endswith(TEMP_SUFFIXES)
    )


def event_reason(change_kinds: set[Change]) -> str:
    if change_kinds == {Change.added}:
        return "created"
    if change_kinds == {Change.modified}:
        return "modified"
    if change_kinds == {Change.deleted}:
        return "deleted"
    return "mixed"


def _normalize_watch_path(root: Path, raw_path: str | Path) -> str | None:
    root_path = root.resolve(strict=False)
    changed_path = Path(raw_path).resolve(strict=False)
    try:
        relative_path = normalize_relative_path(changed_path.relative_to(root_path).as_posix())
    except ValueError:
        return None

    if is_ignored_world_path(relative_path):
        return None
    return relative_path


def summarize_watch_changes(
    root: Path,
    changes: set[tuple[Change, str]] | set[tuple[Change, Path]],
) -> WatchChangeSummary:
    changed_paths: set[str] = set()
    deleted_paths: set[str] = set()
    change_kinds: set[Change] = set()

    for change, raw_path in changes:
        relative_path = _normalize_watch_path(root, raw_path)
        if relative_path is None:
            continue
        change_kinds.add(change)
        if change is Change.deleted:
            deleted_paths.add(relative_path)
        else:
            changed_paths.add(relative_path)

    deleted_paths -= changed_paths
    reason = event_reason(change_kinds)
    if changed_paths and not deleted_paths and reason == "mixed":
        reason = "modified"

    return WatchChangeSummary(
        paths=sorted(changed_paths, key=str.lower),
        deleted_paths=sorted(deleted_paths, key=str.lower),
        reason=reason,
    )


def _watch_filter(root: Path):
    def should_watch(_change: Change, raw_path: str) -> bool:
        return _normalize_watch_path(root, raw_path) is not None

    return should_watch


async def watch_world(root: Path, hub: WorldEventHub = world_event_hub) -> None:
    root.mkdir(parents=True, exist_ok=True)
    async for changes in awatch(root, debounce=500, watch_filter=_watch_filter(root)):
        summary = summarize_watch_changes(root, changes)
        if not summary.paths and not summary.deleted_paths:
            continue

        result = rebuild_index(root)
        event = world_event_payload(
            paths=summary.paths,
            deleted_paths=summary.deleted_paths,
            reason=summary.reason,  # type: ignore[arg-type]
            source="watcher",
            rebuilt_at=result.rebuilt_at,
        )
        await hub.publish(event)


class WatcherManager:
    def __init__(self, enabled: bool, hub: WorldEventHub = world_event_hub) -> None:
        self.enabled = enabled
        self.hub = hub
        self._task: asyncio.Task[None] | None = None
        self._root: Path | None = None

    async def start(self, root: Path) -> None:
        if not self.enabled:
            return
        if self._task is not None and self._root == root:
            return
        await self.stop()
        self._root = root
        self._task = asyncio.create_task(watch_world(root, self.hub))

    async def switch(self, root: Path) -> None:
        await self.start(root)

    async def stop(self) -> None:
        if self._task is None:
            return
        self._task.cancel()
        with suppress(asyncio.CancelledError):
            await self._task
        self._task = None
        self._root = None
