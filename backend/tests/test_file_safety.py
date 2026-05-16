from pathlib import Path

from app.core.file_safety import replace_with_retries


class FlakyReplacePath:
    def __init__(self) -> None:
        self.attempts = 0

    def replace(self, target: Path) -> None:
        self.attempts += 1
        if self.attempts == 1:
            raise PermissionError("temporarily locked")
        target.write_text("moved", encoding="utf-8")


def test_replace_with_retries_handles_transient_permission_error(
    tmp_path: Path,
    monkeypatch,
) -> None:
    source = FlakyReplacePath()
    target = tmp_path / "target.txt"
    monkeypatch.setattr("app.core.file_safety.time.sleep", lambda _seconds: None)

    replace_with_retries(source, target)  # type: ignore[arg-type]

    assert source.attempts == 2
    assert target.read_text(encoding="utf-8") == "moved"
