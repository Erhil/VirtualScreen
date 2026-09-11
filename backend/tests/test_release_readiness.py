from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_sample_world_card_templates_remain_trackable() -> None:
    gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")

    expected_exceptions = [
        "!sample-world/.virtualscreen/",
        "!sample-world/.virtualscreen/card-templates/",
        "!sample-world/.virtualscreen/card-templates/*.json",
    ]

    missing = [pattern for pattern in expected_exceptions if pattern not in gitignore]

    assert missing == []
