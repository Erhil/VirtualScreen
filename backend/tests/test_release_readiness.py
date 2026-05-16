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


def test_gitignore_covers_local_agent_ide_and_dev_world_files() -> None:
    gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")

    required_patterns = [
        "dev-world/",
        "AGENTS.md",
        "AGENT.md",
        "CLAUDE.md",
        "GEMINI.md",
        "CODEX.md",
        "CURSOR.md",
        ".agents/",
        ".codex/",
        ".codex-plugin/",
        ".claude/",
        ".gemini/",
        ".continue/",
        ".aider*",
        ".mcp.json",
        ".windsurfrules",
        ".clinerules",
        ".roo/",
        ".roomodes",
        "scripts/build-release.ps1",
        ".idea/",
        "*.iml",
        ".vscode/",
        "*.code-workspace",
        ".cursor/",
        ".cursorrules",
        ".vs/",
        ".fleet/",
        ".zed/",
        ".project",
        ".classpath",
        ".settings/",
    ]

    missing = [pattern for pattern in required_patterns if pattern not in gitignore]

    assert missing == []


def test_sample_world_card_templates_remain_trackable() -> None:
    gitignore = (ROOT / ".gitignore").read_text(encoding="utf-8")

    expected_exceptions = [
        "!sample-world/.virtualscreen/",
        "!sample-world/.virtualscreen/card-templates/",
        "!sample-world/.virtualscreen/card-templates/*.json",
    ]

    missing = [pattern for pattern in expected_exceptions if pattern not in gitignore]

    assert missing == []


def test_release_hygiene_treats_dev_world_as_generated_local_state() -> None:
    hygiene_script = (ROOT / "scripts" / "release-hygiene.ps1").read_text(encoding="utf-8")

    assert '"dev-world"' in hygiene_script
