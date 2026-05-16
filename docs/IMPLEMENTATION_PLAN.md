# VirtualScreen V1 Implementation Plan

## Current V1 Shape

VirtualScreen V1 is a local-first DM console served from the DM PC. It manages one active
world at a time from a controlled world library, exposes the DM workspace over LAN behind
an unlock code, and provides a public read-only `/screen` route for the player display.

Implemented V1 capabilities:

- World library with current/recent worlds and safe world switching.
- Folder tree, tabs, favorites, recents, and persisted shared workspace state.
- Named workspaces with a default workspace per world and one vertical split-pane layout.
- Markdown, CSV, text, PDF, image, animated GIF, SVG, MP4, and audio media handling.
- CodeMirror-backed Markdown/DMS editing with world-aware autocomplete, Markdown split
  preview, CSV table editing, backups, hash/mtime conflict checks, and index refresh.
- `.cs` structured cards with title, kind, tags, editable fields, world-local templates,
  V2 layouts for typed fields and data-only tables, safe display-only computed fields,
  a compact Card Creator, links, search, favorites/recents/workspaces, and
  player-screen presentation.
- File/folder create, rename, drag/drop move, duplicate, move-to-trash, restore, and
  permanent trash delete. Tree delete actions always move content to VirtualScreen trash.
- Markdown and sidecar metadata editing for Markdown, CSV, media, and other pages.
- SQLite-backed page index, FTS search, links, backlinks, and live world sync.
- Tools panel with top-level Metadata, Audio, HP, Screen, Actions, and Scripts tools.
  Metadata is collapsed by default. Search and Capture launch from workspace controls.
- Prep Check launches from workspace controls and runs an explicit broken-reference audit
  for unresolved links, missing embeds, and saved `.dms` literal command paths.
- Screen tool tabs: Display and Map. Actions tool tabs: Slots, State, Keys, and MIDI.
- Player screen with fullscreen content, popup overlays, optional screen background, and
  public read-only display endpoints.
- Three independent local audio buses: ambient, music, and effect, with playlist
  queue playback and explicit fade in/out controls.
- Fast slots with hotkeys for file, screen, audio effect, and Run script actions.
- Trusted `.dms` scripts can be edited, indexed, run, cancelled, create notes/cards,
  and saved as temporary Markdown/CSV outputs.
- Interactive image maps with pan/zoom, fog reveal, square grid, player/DM pins,
  local measurement, and player-screen presentation.
- Workspace-specific HP Scratchpad for simple live HP tracking without initiative,
  rules automation, imports, or player-screen exposure.
- Table State Snapshots V1: the Actions tool exposes compact Save Current / Load /
  Delete controls for named world-local snapshots of display, popups, map state, local
  audio bus settings, and workspace tabs/layout through `/api/table-snapshots`.
- Action Bindings V1: the Actions tool exposes compact browser-local keyboard bindings
  for existing action types, including restoring saved table state snapshots.
- MIDI Control Surface V1: the Actions tool exposes optional browser-local Web MIDI
  bindings that learn note-on/control-change messages and dispatch the same action
  registry as keyboard bindings.
- Legacy deprecated `/api/scenarios` support remains for compatibility with legacy
  deprecated `.virtualscreen/scenarios` manifests.

## V1 Hardening Priorities

1. Release safety.
   - Keep all DM APIs and WebSockets protected when LAN auth is enabled.
   - Keep `/screen` public, but only allow it to read currently displayed content and
     embedded media dependencies.
   - Preserve strict world path normalization and `.virtualscreen` isolation.

2. Release reliability.
   - Keep `scripts/test.ps1` as the single verification command.
   - Run release hygiene, backend pytest, Ruff, frontend unit tests, frontend build, and
     focused Playwright smoke e2e by default, with `.\scripts\test.ps1 -E2E full`
     available for the exhaustive browser suite.
   - Report per-stage timing and clean up Playwright test ports before and after e2e.
   - Add smoke coverage for LAN auth, public screen access, display rendering, audio,
     DMS scripts, fast slots, keyboard/MIDI action bindings, editing, metadata, search,
     trash, and world switching.
   - Keep the release sample world free of runtime `.virtualscreen` state except
     intentional JSON card templates.

3. Release usability.
   - Keep the tools panel compact and resizable, with Search/Capture in workspace
     controls instead of top-level tools.
   - Keep the player screen free of DM controls.
   - Keep LAN startup instructions explicit: URL, unlock code, and `/screen` behavior.

## Deferred Beyond V1

- Jupyter notebook support is out of scope; notebooks were only a UI/UX reference.
- Notion/Foundry importers.
- Direct scenario-to-note workflows; DMS temporary outputs use Save As instead.
- Persistent audio playlist editing and player-screen audio sync.
- Advanced MIDI profiles, banks, LED feedback, long press, and hold actions.
- Safe computed card fields are implemented as display-only arithmetic over typed
  number and boolean fields; broader card-driven rules automation remains deferred.
- Card-driven rules automation or gameplay logic remains out of scope; `.cs` cards and
  HP Scratchpad stay simple structured/live-session material.
- Advanced map layers, drawing brushes, hex grids, measurements persistence, and Foundry import.
- Incremental per-file indexing beyond current live-sync rebuild behavior.

## V1 Exit Criteria

- `.\scripts\test.ps1` passes on a clean development machine and prints a readable
  stage summary, including release hygiene.
- `.\scripts\test.ps1 -E2E full` remains available for release-candidate browser
  regression runs.
- `.\scripts\dev.ps1` starts backend and frontend, prints local/LAN URLs, and prints an
  unlock code.
- `http://localhost:5173` requires unlock when LAN auth is enabled.
- `http://localhost:5173/screen` opens without unlock and cannot read arbitrary world files.
- A DM can browse, search, edit, create, trash/restore, manage metadata, show content on
  `/screen`, present an image map, play three audio buses, trigger fast slots and
  browser-local keyboard/MIDI action bindings, run a sample `.dms` script, track a small
  HP scratchpad in a named workspace, create templated `.cs` cards with V2 layouts and
  computed fields from the UI or DMS, and manage named table state snapshots from the
  Actions tool.
