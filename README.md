# Description

VirtualScreen is a local-first DM console for running offline tabletop games from a browser. It keeps your campaign material as ordinary files in a **world** folder and adds a safe local interface for notes, cards, tables, media, maps, audio, scripts, and player-screen control.

The app runs on the DM computer, can be opened from the local network, and exposes a public read-only `/screen` view for the table. It is not a cloud campaign manager, rules engine, hosted service, or LLM product.

# Installation

## Install system

Install Python 3.11 or newer. During installation on Windows, enable the option that adds Python to `PATH`, then verify that `python --version` works from PowerShell.

Install Node.js 24 or newer, which includes npm. Verify that `node --version` reports version 24 or newer and `npm --version` reports npm 11 or newer.

Install PowerShell if your system does not already include it. Windows users can use Windows PowerShell or PowerShell 7.

Install a Chromium-compatible browser for manual use. The test setup also installs Playwright Chromium through npm so automated browser checks can run.

Clone or download this source release, then open PowerShell in the repository root.

## Setup environment (optional)

VirtualScreen works without an `.env` file. If you need to customize local settings, copy `.env.example` to `.env` and edit the values.

Useful settings:

- `VIRTUALSCREEN_WORLD_ROOT`: initial world folder, default `sample-world`.
- `VIRTUALSCREEN_HOST` and `VIRTUALSCREEN_PORT`: backend bind address and port.
- `VIRTUALSCREEN_LAN_MODE`: enables LAN-facing behavior when set to `true`.
- `VIRTUALSCREEN_ACCESS_TOKEN`: fixed unlock code. If omitted, `scripts/dev.ps1` generates one.

# Start app

Create and install a fresh Python environment:

```powershell
python -m venv .venv
.\.venv\Scripts\python -m pip install --upgrade pip
.\.venv\Scripts\python -m pip install -e .\backend[dev]
```

Install the frontend dependencies and Playwright browser:

```powershell
cd frontend
npm install
npx playwright install chromium
cd ..
```

Start VirtualScreen:

```powershell
.\scripts\dev.ps1
```

Open the DM workspace at `http://localhost:5173`. Open the player screen at `http://localhost:5173/screen`. `dev.ps1` prints the unlock code for the DM workspace.

Stop the app:

```powershell
.\scripts\stop-dev.ps1
```

Check whether development or test ports are still occupied:

```powershell
.\scripts\check-dev.ps1
```

Run the release test gate:

```powershell
.\scripts\test.ps1
```

Run the full browser suite before publishing a release:

```powershell
.\scripts\test.ps1 -E2E full
```

## Install extra Python libraries for DMS scripts

Trusted `.dms` scripts run with the same Python environment as the VirtualScreen backend.
If a script needs packages such as NumPy, pandas, or PyTorch, install them into
VirtualScreen's `.venv`, not into global Python.

Examples:

```powershell
.\.venv\Scripts\python -m pip install numpy
.\.venv\Scripts\python -m pip install pandas
```

For PyTorch, use the install command from the official PyTorch installer page that
matches your CPU or CUDA setup, but run it with `.\.venv\Scripts\python -m pip`.

After installing new packages, restart VirtualScreen so new script runs see the
updated environment:

```powershell
.\scripts\stop-dev.ps1
.\scripts\dev.ps1
```

Example `.dms` script:

```python
import numpy as np

values = np.array([1, 2, 3, 4])
render_md(f"# Result\n\nAverage: {values.mean()}")
```

DMS scripts are trusted local Python code and can import powerful libraries. Heavy
packages can take time and disk space to install. If a script reports
`ModuleNotFoundError`, install the missing package into `.venv`. Do not commit `.venv`;
it is local machine state.

# Main functions

- **World files:** browse, create, edit, rename, duplicate, move, trash, restore, and search normal world files.
- **Markdown and DMS editing:** CodeMirror editing, split Markdown preview, world-aware autocomplete, and trusted `.dms` scripts.
- **Structured cards:** `.cs` JSON cards for NPCs, monsters, items, spells, locations, references, character sheets, tables, typed fields, `world_link` fields, and safe display-only computed fields.
- **Sample world guide:** open `sample-world/README.md` inside the app for a native walkthrough of core features using real sample notes, cards, tables, media, scripts, maps, and audio.
- **Player screen:** send fullscreen content, staged or visible popups, and interactive image maps to `/screen`.
- **Maps:** image-backed maps with fog reveal, square grid, player/DM pins, local measure mode, and presets.
- **Audio:** ambient, music, and effect buses with playlist queues, next/previous, loop, and fade controls.
- **Live tools:** Quick Capture, HP Scratchpad, Prep Check, Table State Snapshots, fast slots, keyboard bindings, and MIDI bindings.
- **Release checks:** `scripts/release-hygiene.ps1` blocks runtime clutter, oversized sample assets, build output, caches, and agent-only files from the release folder.

VirtualScreen V1 is licensed under GPLv3. See `LICENSE`.
