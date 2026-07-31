import shutil
from pathlib import Path

import pytest

from app.core import world_library


@pytest.fixture(autouse=True)
def isolated_world_library(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    """Keep the suite off the developer's own world library.

    Most test modules build Settings(world_root=...) and leave worlds_root at its
    default, which is the user's Documents folder. That was harmless while the
    active world lived only in this process - the lookup always missed and fell
    back to the test's own tmp world. Now that the choice is restored from a
    state file on disk, a run would pick up whatever real campaign was last
    opened, and the file-management tests move and delete files.
    """
    monkeypatch.setenv("VIRTUALSCREEN_WORLDS_ROOT", str(tmp_path / "worlds"))
    world_library._ACTIVE_WORLDS.clear()


@pytest.fixture
def sample_world(tmp_path: Path) -> Path:
    source = Path(__file__).resolve().parents[2] / "sample-world"
    target = tmp_path / "sample-world"
    shutil.copytree(source, target)
    return target
