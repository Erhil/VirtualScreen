# V1 Release Checklist

## Install

- Create the Python virtual environment.
- Install backend dev dependencies with `.\.venv\Scripts\python -m pip install -e .\backend[dev]`.
- Install frontend dependencies with `npm install` in `frontend/`.
- Install Playwright Chromium with `npx playwright install chromium` in `frontend/`.

## GitHub Source Release Files

- `LICENSE` is GPLv3.
- README and `.github` templates describe public setup, issue, PR, and verification
  expectations.
- `.github/workflows/ci.yml` runs the Windows release gate and Linux smoke checks.
- Issue and pull request templates are present.

## Automated Verification

Run from the repository root:

```powershell
.\scripts\test.ps1
```

The fast gate is not ready unless this passes:

- Release hygiene.
- Backend pytest.
- Backend Ruff.
- Frontend Vitest.
- Frontend production build.
- Playwright smoke e2e.
- Stage summary and e2e port cleanup.

Release hygiene must pass before tagging. It blocks sample-world runtime state,
oversized sample assets, generated DMS outputs, scratch cards, session-log noise, and
tracked build/test artifacts.

Before tagging a release candidate, also run the exhaustive browser suite:

```powershell
.\scripts\test.ps1 -E2E full
```

## Dev Stack Smoke

Start:

```powershell
.\scripts\stop-dev.ps1
.\scripts\check-dev.ps1
.\scripts\dev.ps1
```

Confirm the script prints:

- Backend URL.
- Local frontend URL.
- LAN frontend URL.
- VirtualScreen unlock code.

If `5173`, `5174`, `8000`, or `8010` remains occupied after stopping, run
`.\scripts\check-dev.ps1` and stop the listed process before retrying. `5174` and `8010`
are reserved for Playwright e2e servers.

## Browser Smoke

- Open `http://localhost:5173`.
- Unlock with the printed code.
- Confirm the world tree loads.
- Drag a file into another folder and confirm the tree/search path updates.
- Right-click a file and a folder in the world tree; duplicate, rename, and move each
  to Trash. Confirm folder operations are recursive and that Delete means Trash.
- Create a named workspace, switch back to Default, then switch to the new workspace.
- Toggle Split layout, open two different files in the two panes, reload, and confirm the
  split layout returns.
- Open a Markdown page, CSV table, PDF, image/GIF/SVG, and MP4.
- In Actions, save a named Table State Snapshot, change screen/map/audio/workspace
  state, load the snapshot, verify `/screen` and the DM workspace restore, then delete
  the snapshot.
- Confirm Actions exposes Slots, State, Keys, and MIDI tabs.
- In Actions, create a keyboard binding for restoring a saved Table State Snapshot,
  trigger it, and verify the same player-screen/workspace state restores.
- In Actions, connect a Web MIDI device if available, learn one note/control, bind it to
  a saved Table State Snapshot, and verify it restores the same state. If Web MIDI is not
  available, confirm the MIDI block shows a compact disabled state.
- Create and open a `.cs` structured card from the workspace `New Card` button and
  from a folder `+` menu, edit title/kind/tags/fields, reload, and confirm the card is
  still structured material with no rules automation controls.
- Confirm any world-local card templates under `.virtualscreen/card-templates/` are
  externally editable JSON fixtures and do not appear in normal world browsing/search.
- Confirm the release sample world has no tracked runtime `.virtualscreen` state except
  `.virtualscreen/card-templates/*.json`.
- Open a computed `.cs` card, confirm `WIS = 16` displays `WIS Bonus +3`, edit `WIS`
  to `8`, and confirm the display-only value updates without writing a derived value
  back into the source field.
- Launch Search from workspace controls, search for a known page, and open it.
- Search for `.cs` card title, tag, kind, and field text.
- Launch Capture from workspace controls.
- Launch Prep Check from workspace controls, run the audit, and confirm a clean world
  reports no broken references.
- Edit Markdown and revert or save.
- Confirm Metadata is collapsed by default, then edit metadata and verify the tree/tab
  label refreshes.
- Create a note in a folder, move it to Trash from the tree context menu, and restore it.
- In Screen > Display, send the active page fullscreen and as a popup.
- In Screen > Map, present an image map, toggle fog/grid, add a player pin, and confirm
  `/screen` updates.
- Use picker-assisted world path fields to choose a Screen fullscreen target, Map image
  source, Actions fast slot target, and `.cs` card `world_link` target.
- Confirm Esc closes the path picker and manually typed paths remain unchanged.
- Open the HP tool, add two rows, adjust HP with quick buttons, reload, and confirm the
  rows return only in the active named workspace.
- Open `http://localhost:5173/screen` and confirm it works without unlock.
- Confirm `/screen` has no DM controls.
- Play one ambient playlist queue, use Next/Previous, fade a music bus out/in, and
  play one effect independently without stopping the other buses.
- Trigger a fast slot with a click and its fixed hotkey.
- Create a browser-local keyboard action binding, reject a duplicate/reserved shortcut,
  and confirm the binding does not fire while typing in an editor or form.
- Run a sample `.dms` script and verify Markdown output appears.
- Run a `.dms` script that uses `card_template()` and `create_card()` and verify the
  created `.cs` card appears in tree/search.
- Save a temporary DMS output tab back into the world with Save As.

## LAN Smoke

- Open the printed LAN URL from another device.
- Confirm the DM workspace requires the unlock code.
- Open `/screen` from another device without unlocking.
- Confirm the player screen only shows content sent from the DM workspace.

## Safety Smoke

- Request an unrelated file through `/api/screen/world/file?path=...`; expect forbidden.
- Request an unrelated media file through `/api/screen/world/media?path=...`; expect forbidden.
- Confirm DM mutation APIs still require unlock when LAN auth is enabled.
- Confirm backups appear under `.virtualscreen/backups` after successful saves.
- Confirm trashed files move under `.virtualscreen/trash`.
