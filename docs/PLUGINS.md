# Plugins

VirtualScreen has a small **first-party plugin system**: optional features that layer on top of the base
app, are **auto-discovered** from a plugins folder, and are **removed by deleting their folder** — with no
edits to the core and no central list to maintain.

> **Two kinds of extension — don't confuse them.**
> - **Plugins** (this document) — *first-party, compiled-in* features you (the developer) write: interactive
>   maps, image generation, extra DM tools. They ship as TypeScript/Python in the repo and are toggled by
>   presence/absence of a folder.
> - **DMS scripts** — *user-authored, trust-gated* behaviors written inside a world (`.cs` scripts). That is
>   the mechanism for untrusted, per-world extension. Plugins are **not** sandboxed and are **not** the place
>   for untrusted code.

## Design in one paragraph

A plugin is a self-contained folder. The **core never imports a plugin by name.** Instead a generic loader
discovers whatever folders are present — `pkgutil` on the backend, `import.meta.glob` on the frontend — and
wires up each plugin's declared *capabilities*. Because discovery is folder-scan based, **adding** a plugin is
"create a folder"; **removing** one is "delete a folder". With the plugins folder empty, the app behaves
exactly as it did before the plugin system existed: backend registration is a no-op and the frontend hosts
render `null`. A plugin that throws or is malformed is caught, logged, and skipped — it can never take down the
base app.

## Folder layout

```
backend/app/
  core/plugins.py            # generic loader (core — never references a specific plugin)
  plugins/                   # ← drop backend plugin packages here
    <id>/
      __init__.py
      plugin.py              # exposes  PLUGIN = BackendPlugin(...)
      test_*.py              # co-located tests travel with the plugin
      ...                    # routes, logic — normal FastAPI/Python

frontend/src/
  lib/pluginTypes.ts         # the manifest contract (core)
  lib/pluginRegistry.ts      # generic loader via import.meta.glob (core)
  components/PluginToolsHost.tsx    # mounts `tool` capabilities (DM console)
  components/PluginScreenHost.tsx   # mounts `screen` capabilities (/screen)
  plugins/                   # ← drop frontend plugin folders here
    <id>/
      plugin.ts(x)           # export default definePlugin({...})
      ...                    # components, hooks — normal React/TS
```

The `plugins/` folders contain **only** plugin folders. The loader and types live in `core/` / `lib/`, so
emptying `plugins/` never removes machinery.

## The manifest

### Frontend (`src/lib/pluginTypes.ts`)

```ts
export interface VsPlugin {
  id: string;                 // unique; conventionally matches the folder name
  name: string;               // human label
  version?: string;
  tool?: PluginTool;          // adds a DM-console tool (dock button + panel)
  screen?: PluginScreen;      // adds a layer to the player /screen
}

export interface PluginTool {
  icon?: string;                                  // emoji shown on the dock button
  title: (t: Translator) => string;               // localized label
  Panel: ComponentType<PluginToolContext>;        // rendered inside a <Modal>
}
export interface PluginScreen {
  Layer: ComponentType;                           // rendered on /screen (no injected context)
}

export interface PluginToolContext { worldId: string | null; t: Translator; }
```

A `screen` layer receives no props — like `PlayerScreen` itself, it subscribes to the display/map event
streams for its data and calls its own `/api/plugins/<id>/...` endpoints (which resolve the active world
server-side). A `tool` panel gets `{ worldId, t }`.

Author a plugin with the `definePlugin` helper (just an identity function for type inference):

```ts
// frontend/src/plugins/<id>/plugin.ts
import { definePlugin } from "../../lib/pluginTypes";
import { MyToolPanel } from "./MyToolPanel";

export default definePlugin({
  id: "my-feature",
  name: "My Feature",
  tool: { icon: "✨", title: () => "My Feature", Panel: MyToolPanel },
});
```

All capability fields are optional — a plugin declares only what it needs. A tool-only plugin omits `screen`;
a display-only plugin (e.g. an interactive map overlay) omits `tool`.

> **Strings / i18n.** `title` receives the app `Translator`, but a self-contained plugin should ship its own
> literal strings (as above) rather than adding keys to the shared `lang` catalog — editing the catalog would
> be a core change and break "delete the folder, nothing left behind." Consequence: plugins are English-only
> until a per-plugin i18n mechanism exists (a documented growth path, not built yet).

### Backend (`backend/app/core/plugins.py`)

```py
@dataclass(frozen=True)
class BackendPlugin:
    id: str
    router: APIRouter | None = None   # mounted under /api if present
```

```py
# backend/app/plugins/<id>/plugin.py
from fastapi import APIRouter
from app.core.plugins import BackendPlugin

router = APIRouter()

@router.post("/plugins/my-feature/do-thing")
async def do_thing() -> dict[str, str]:
    return {"ok": "yes"}

PLUGIN = BackendPlugin(id="my-feature", router=router)
```

The loop in `create_app()` calls `register_plugins(app)`, which mounts every discovered plugin's router under
`/api`. A plugin's routes are conventionally namespaced `/api/plugins/<id>/...`.

## Adding a plugin — checklist

1. **Backend (if it needs an API):** create `backend/app/plugins/<id>/` with `__init__.py` and `plugin.py`
   exposing `PLUGIN = BackendPlugin(id="<id>", router=...)`. Put logic — and any `test_*.py` — in the same
   folder so they travel with the plugin. Co-located tests are collected by the gate (`pytest backend`) and
   run under the same ruff + mypy as app code, so keep them typed. Nothing else to register.
2. **Frontend:** create `frontend/src/plugins/<id>/plugin.ts` with `export default definePlugin({...})` plus
   its components. Declare a `tool` and/or `screen` capability. Use literal strings (see the i18n note above).
3. **Rebuild:** restart the backend (re-scans on startup) and rebuild the frontend (`npm run build`, or the dev
   server HMR picks it up). The tool appears in the console dock; the screen layer appears on `/screen`.

That's the whole install. No edits to `App.tsx`, `main.py`, routing tables, the `lang` catalog, or any
registry.

## Removing a plugin

**Delete its folder(s):** `frontend/src/plugins/<id>/` and, if it had one, `backend/app/plugins/<id>/`.
Then rebuild (frontend) / restart (backend). The feature is gone; the base app is unaffected — because the
core never referenced the plugin by name, there is nothing left dangling. The plugin's co-located `test_*.py`
is deleted with the folder, so the gate stays green (no orphaned test asserting a route that no longer
exists).

> Example: keep an interactive-map plugin in `plugins/` when you want it; delete the folder to run with just
> the base map. No code changes either way.

Vite resolves `import.meta.glob` at build time, so after adding/removing a frontend plugin you must rebuild (or
rely on the dev server). The backend re-scans `app/plugins/` on every startup.

## Invariants (what keeps the base safe)

1. **Core never imports a specific plugin.** Enforced by review + tests; discovery is fully generic.
2. **Empty plugins folder ⇒ identical base app.** Backend registration returns `[]`; `PluginToolsHost` and
   `PluginScreenHost` early-return `null`.
3. **A broken plugin is skipped, not fatal.** Backend wraps each import in `try/except` + log; the frontend
   registry validates each manifest and `console.warn`s + skips invalid ones. One bad plugin never breaks the
   others or the base.
4. **Plugins depend on core, never the reverse.** A plugin may import from `lib/`, `components/`, `core/`; core
   must not import from `plugins/`.

## Capability growth path

Today the loader wires exactly these capabilities (kept minimal on purpose):

| Capability | Where it plugs in | Status |
|---|---|---|
| Backend HTTP `router` | `register_plugins` → `include_router` under `/api` | **implemented** |
| Frontend `tool` | `PluginToolsHost` (dock + `<Modal>` panel) | **implemented** |
| Frontend `screen` | `PluginScreenHost` on `/screen` | **implemented** |
| DMS verb (e.g. `audio_play`-style) | registry in `core/scripts.py` | planned — wire when first needed |
| Fast-slot / MIDI action kind | registry in `lib/fastSlots.ts` + `lib/actionBindingDispatch.ts` | planned |
| Table-snapshot slice | `capture`/`restore` hooks in `lib/tableSnapshots.ts` | planned |

The three "planned" rows are the existing central *switch-on-kind* seams. When a plugin first needs one, turn
that switch into a small registry that merges the discovered plugins' contributions (same pattern as the
router loop), then add the field to the manifest. We intentionally don't build these before a real plugin
needs them.

## Worked example — interactive map as a `screen` plugin

The base app always ships plain maps. An "interactive map" (clickable regions, live fog reveal on the player
screen, etc.) is a natural plugin:

- **Backend** `backend/app/plugins/interactive_map/` — a `router` for its extra endpoints (region metadata,
  reveal state), `PLUGIN = BackendPlugin(id="interactive-map", router=...)`.
- **Frontend** `frontend/src/plugins/interactive-map/` — a `screen` capability whose `Layer` subscribes to the
  map/display event stream (like `PlayerScreen` does) and draws the interactive overlay; optionally a `tool`
  capability giving the DM a control panel in the console.

Want just the base map for a session? Delete `frontend/src/plugins/interactive-map/` (and the backend folder),
rebuild, done.

A small example plugin, **Random Tables** (`backend/app/plugins/random_tables/` +
`frontend/src/plugins/random-tables/`), ships in-tree as a copyable reference: a backend roll endpoint plus a
DM-console tool, with a co-located backend test. It also demonstrates removal — delete its two folders, rebuild,
and the app falls back to base with the gate still green. (It's an example, so it may be absent in your
checkout without any impact.)
