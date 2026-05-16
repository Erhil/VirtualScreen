from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def test_public_release_metadata_exists() -> None:
    required_paths = [
        "README.md",
        "LICENSE",
        ".github/workflows/ci.yml",
        ".github/ISSUE_TEMPLATE/bug_report.yml",
        ".github/ISSUE_TEMPLATE/feature_request.yml",
        ".github/pull_request_template.md",
    ]

    missing = [path for path in required_paths if not (ROOT / path).is_file()]

    assert missing == []


def test_readme_documents_fresh_release_setup() -> None:
    readme = (ROOT / "README.md").read_text(encoding="utf-8")

    expected_snippets = [
        "# Description",
        "# Installation",
        "## Install system",
        "## Setup environment (optional)",
        "# Start app",
        "# Main functions",
        "python -m venv .venv",
        ".\\.venv\\Scripts\\python -m pip install -e .\\backend[dev]",
        "npm install",
        "npx playwright install chromium",
        ".\\scripts\\test.ps1",
        ".\\scripts\\dev.ps1",
        "GPLv3",
    ]

    missing = [snippet for snippet in expected_snippets if snippet not in readme]

    assert missing == []
