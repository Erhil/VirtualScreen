import shutil
from pathlib import Path

import pytest


@pytest.fixture
def sample_world(tmp_path: Path) -> Path:
    source = Path(__file__).resolve().parents[2] / "sample-world"
    target = tmp_path / "sample-world"
    shutil.copytree(source, target)
    return target
