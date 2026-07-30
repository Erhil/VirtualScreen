import os
from pathlib import Path

import pytest

from app.core.paths import WorldPathError, normalize_relative_path, resolve_under_root


def test_normalizes_windows_and_posix_paths() -> None:
    assert normalize_relative_path(r"NPCs\Captain Ilyra.md") == "NPCs/Captain Ilyra.md"
    assert normalize_relative_path("./Tables/random-events.csv") == "Tables/random-events.csv"


@pytest.mark.parametrize("bad_path", ["../secrets.txt", "NPCs/../../secrets.txt", "/absolute.md"])
def test_rejects_unsafe_paths(bad_path: str) -> None:
    with pytest.raises(WorldPathError):
        normalize_relative_path(bad_path)


def test_resolves_safe_path_under_root(tmp_path: Path) -> None:
    world = tmp_path / "world"
    world.mkdir()

    resolved = resolve_under_root(world, "NPCs/Captain Ilyra.md")

    assert resolved == world / "NPCs" / "Captain Ilyra.md"


@pytest.mark.skipif(os.name != "nt", reason=r"The \\?\ prefix only exists on Windows.")
def test_resolves_path_that_windows_returns_with_an_extended_length_prefix(
    tmp_path: Path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    # ntpath.realpath keeps the \\?\ prefix whenever it cannot re-resolve the
    # stripped form, which happens at random while a world folder is being
    # written to. The file is ordinary and must still resolve.
    world = tmp_path / "world"
    (world / "Cards").mkdir(parents=True)
    (world / "Cards" / "Clockwork Gull.cs").write_text("{}", encoding="utf-8")
    unpatched_resolve = Path.resolve

    def resolve_keeping_windows_prefix(self: Path, *args: object, **kwargs: object) -> Path:
        resolved = unpatched_resolve(self, *args, **kwargs)  # type: ignore[arg-type]
        if resolved.name == "Clockwork Gull.cs":
            return Path(f"\\\\?\\{resolved}")
        return resolved

    monkeypatch.setattr(Path, "resolve", resolve_keeping_windows_prefix)

    resolved = resolve_under_root(world, "Cards/Clockwork Gull.cs")

    assert resolved == world / "Cards" / "Clockwork Gull.cs"


def test_rejects_symlink_escape(tmp_path: Path) -> None:
    world = tmp_path / "world"
    outside = tmp_path / "outside"
    world.mkdir()
    outside.mkdir()
    escape = world / "escape"

    try:
        escape.symlink_to(outside, target_is_directory=True)
    except OSError:
        pytest.skip("Symlink creation is not available in this environment.")

    with pytest.raises(WorldPathError):
        resolve_under_root(world, "escape/file.txt")

