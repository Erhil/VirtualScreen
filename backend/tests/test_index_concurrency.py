"""Concurrent index refreshes of the same page must not corrupt the search index.

Two requests can refresh one page at once (opening it and showing its backlinks, or a
request racing the file watcher). Each replaces the page row and its full-text row, whose
rowid is the page id. If one refresh read the page id before the other committed, it
deleted the wrong full-text row, and SQLite then reused the id for its insert: the insert
failed with "constraint failed" and the index was left with an orphan row.
"""

import threading
from pathlib import Path

from app.core.index import ensure_page_indexed, rebuild_index, refresh_index


def test_concurrent_refreshes_of_one_page_do_not_fail(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    note = world / "note.md"
    note.write_text("# Note\n", encoding="utf-8")
    (world / "other.md").write_text("[Note](note.md)\n", encoding="utf-8")
    rebuild_index(world)
    errors: list[BaseException] = []
    barrier = threading.Barrier(6)

    def worker(index: int) -> None:
        try:
            barrier.wait()
            for step in range(15):
                note.write_text(f"# Note\n\nedit {index}-{step}\n", encoding="utf-8")
                if index % 2:
                    ensure_page_indexed(world, note)
                else:
                    refresh_index(world, changed_paths=["note.md"])
        except BaseException as error:  # noqa: BLE001 - collected and re-raised below
            errors.append(error)

    threads = [threading.Thread(target=worker, args=(index,)) for index in range(6)]
    for thread in threads:
        thread.start()
    for thread in threads:
        thread.join()

    assert errors == []
