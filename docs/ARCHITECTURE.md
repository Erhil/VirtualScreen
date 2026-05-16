# VirtualScreen Architecture

## Overview

VirtualScreen is a local-first web app for running tabletop games from a DM PC.

```text
DM browser / LAN clients -> Vite frontend -> FastAPI backend -> active world folder
                                             |
                                             +-> SQLite index and app state
                                             +-> public read-only /screen display
```

The source of truth is normal files in the active world. SQLite stores derived indexes and
app-only state such as named workspace tabs/layouts, favorites, recent files, display state,
fast slots, and legacy scenario run history.

## Content Roots

- Worlds live under a configured world library root.
- The active world is selected through the world library API.
- All file access is resolved through safe path helpers against the active world root.
- `.virtualscreen` stores app internals: SQLite, backups, trash, metadata sidecars,
  optional `screen-background.*`, and legacy deprecated `.virtualscreen/scenarios`.
  In the release `sample-world`, only `.virtualscreen/card-templates/*.json` is
  intentional source content; runtime state is generated locally.
- `.music` stores audio tracks and is hidden from the normal world tree/search.
- `.cs` files store structured cards as normal world JSON files with title, kind, tags,
  typed fields, table sections, world links, and safe display-only computed fields. They
  are searchable structured material, not rules automation.
- Trusted `.dms` scripts live as normal world files in any folder and are indexed like
  other text materials.

## Backend

FastAPI owns:

- World tree, file, media, folder, trash, and metadata APIs.
- SQLite indexing, FTS search, links, backlinks, and live-sync events.
- LAN unlock-code middleware for DM APIs and DM WebSockets.
- Public read-only screen APIs for the player display.
- Display state and display WebSocket broadcasts.
- Audio library scanning under `.music`; playback, playlist queues, and fades stay
  local to the DM browser.
- Fast slots and trusted `.dms` script execution.
- Legacy deprecated `/api/scenarios` compatibility routes still execute manifests under
  legacy deprecated `.virtualscreen/scenarios`.

Important security boundaries:

- DM APIs under `/api/*` and DM WebSockets under `/ws/*` are protected when
  `VIRTUALSCREEN_ACCESS_TOKEN` is set.
- Public screen routes are limited to `/api/screen/*` and `/ws/screen/display`.
- Public screen file/media reads may only access the current display item or embedded
  media dependencies of the displayed document.
- Legacy scenario scripts must live under their scenario folder and run with a manifest
  timeout; new DM workflows should use saved `.dms` files.

## Frontend

The DM workspace has three main regions:

- Left world panel: world selector, tools for world/trash, tree, favorites, recents.
- Center viewer: named workspace controls, tabs, optional vertical split panes,
  Markdown/CSV/card/text/PDF/media viewers, and editing controls.
- Right tools panel: compact accordion tools for Metadata, Audio, HP, Screen, Actions,
  and Scripts. Metadata is collapsed by default.
- Workspace controls launch Search and Capture.
- Screen contains Display and Map tabs; Actions contains Slots, State, Keys, and MIDI
  tabs.

The player display at `/screen` is separate from the DM workspace. It shows one fullscreen
item plus zero or more DM-controlled popups, including read-only PDFs through the browser
native viewer. It has no edit, search, trash, or close controls.

## Data And Refresh Flow

- Index rebuild scans the active world, parses metadata, links, and bodies, and rebuilds
  SQLite FTS.
- Card files contribute their title, kind, tags, fields, table cells, formula text, and
  links to the same page index used by notes and tables.
- Save/create/rename/trash/metadata actions rebuild the index and publish live events.
- The file watcher rebuilds after external changes and broadcasts refresh events.
- The frontend keeps unsaved drafts local and marks them changed-on-disk instead of
  overwriting them.
- Named workspace tabs/layouts, favorites, recents, fast slots, and display state are stored
  per world. Favorites and recents are world-level; tabs and split layout are workspace-level.
