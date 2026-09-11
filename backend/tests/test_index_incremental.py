"""The index does work proportional to what changed, not to the size of the world.

A real world holds videos of hundreds of megabytes and hundreds of linked pages; these
tests pin the shortcuts that keep a save, a page open and a watcher pass cheap, and that
each shortcut still notices a real change.
"""

import shutil
from pathlib import Path

import pytest

from app.core import index as index_module
from app.core import pages as pages_module
from app.core.index import (
    ensure_page_indexed,
    list_indexed_links,
    list_indexed_pages,
    rebuild_index,
    refresh_index,
    refresh_index_for_disk_changes,
)


def forbid(monkeypatch: pytest.MonkeyPatch, module: object, name: str) -> None:
    def fail(*_args: object, **_kwargs: object) -> None:
        raise AssertionError(f"{name} should not run")

    monkeypatch.setattr(module, name, fail)


def test_opening_an_unchanged_media_page_does_not_rehash_it(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    video = world / "intro.mp4"
    video.write_bytes(b"video" * 1000)
    rebuild_index(world)
    forbid(monkeypatch, pages_module, "_sha256_file")

    page = ensure_page_indexed(world, video)

    assert page.path == "intro.mp4"


def test_a_changed_file_is_still_rehashed(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()
    video = world / "intro.mp4"
    video.write_bytes(b"old")
    rebuild_index(world)
    before = ensure_page_indexed(world, video).hash

    video.write_bytes(b"new and longer")

    assert ensure_page_indexed(world, video).hash != before


def test_editing_a_page_body_re_resolves_only_that_pages_links(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "a.md").write_text("# A\n", encoding="utf-8")
    (world / "b.md").write_text("# B\n", encoding="utf-8")
    (world / "source.md").write_text("[A](a.md)\n", encoding="utf-8")
    (world / "other.md").write_text("[A](a.md)\n", encoding="utf-8")
    rebuild_index(world)
    (world / "source.md").write_text("[B](b.md)\n", encoding="utf-8")
    resolved_sources: list[str] = []
    unpatched = index_module.resolve_links

    def spy(root, source_path, *args, **kwargs):  # type: ignore[no-untyped-def]
        resolved_sources.append(source_path)
        return unpatched(root, source_path, *args, **kwargs)

    monkeypatch.setattr(index_module, "resolve_links", spy)

    refresh_index(world, changed_paths=["source.md"])

    assert resolved_sources == ["source.md"]
    assert [link.target_path for link in list_indexed_links(world, "source.md")] == ["b.md"]
    assert [link.target_path for link in list_indexed_links(world, "other.md")] == ["a.md"]


def test_disk_refresh_with_nothing_changed_does_no_index_work(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    world = tmp_path / "world"
    world.mkdir()
    (world / "note.md").write_text("[Other](other.md)\n", encoding="utf-8")
    (world / "other.md").write_text("# Other\n", encoding="utf-8")
    rebuild_index(world)
    forbid(monkeypatch, index_module, "_rebuild_links")
    forbid(monkeypatch, index_module, "parse_page")

    refresh_index_for_disk_changes(world)

    assert len(list_indexed_links(world, "note.md")) == 1


def test_disk_refresh_drops_every_page_of_a_deleted_folder(tmp_path: Path) -> None:
    # The watcher reports a deleted folder as one event for the folder, not its files;
    # the disk diff is what finds the pages that went with it.
    world = tmp_path / "world"
    (world / "Quests").mkdir(parents=True)
    (world / "Quests" / "one.md").write_text("# One\n", encoding="utf-8")
    (world / "Quests" / "two.md").write_text("# Two\n", encoding="utf-8")
    (world / "index.md").write_text("[One](Quests/one.md)\n", encoding="utf-8")
    rebuild_index(world)

    shutil.rmtree(world / "Quests")
    refresh_index_for_disk_changes(world)

    assert [page.path for page in list_indexed_pages(world)] == ["index.md"]
    assert list_indexed_links(world, "index.md")[0].target_path is None
