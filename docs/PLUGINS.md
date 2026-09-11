# Plugins

A plugin is an optional tool kept in its own folder, so the core does not grow around it and it
can be removed cleanly. There is no discovery machinery: plugins ship in this repository and are
imported directly, which is all two or three in-repo tools need.

## Layout

```
frontend/src/plugins/<id>/plugin.ts   exports a PluginTool (id, icon, title, Panel)
frontend/src/plugins/<id>/...         the panel component and its helpers
backend/app/plugins/<id>/plugin.py    a FastAPI router, if the tool needs an API
backend/app/plugins/<id>/test_*.py    its tests, collected by the normal gate
```

## Adding one

1. Create `frontend/src/plugins/<id>/plugin.ts` exporting a `PluginTool`
   (`frontend/src/lib/pluginTypes.ts`), and add it to `PLUGIN_TOOLS` in
   `frontend/src/components/PluginToolsHost.tsx`. It appears as a button in the plugin dock and
   opens in a modal with `{ worldId, t }`.
2. If it needs an API, create `backend/app/plugins/<id>/plugin.py` with an `APIRouter`, namespace
   its routes under `/api/plugins/<id>/...`, and include the router in `backend/app/main.py`.
3. Put configuration in the plugin's own `BaseSettings` subclass with an `env_prefix` and
   `env_file=".env"`. Do not read `os.environ` directly — `.env` is parsed inside the process and
   never exported, so `os.environ` silently misses it. Do not add fields to core `Settings`.
4. Any test that writes through `settings.resolved_world_root` relies on the root
   `backend/conftest.py`, which keeps the suite off the developer's real world library.

## Removing one

Delete both folders, and the one line in each of `PluginToolsHost.tsx` and `main.py`.

## Existing plugins

- `image-gen` — generates art through an external SDXL service and saves it into the world. See
  `backend/app/plugins/image_gen/README.md` for its configuration and the network requirements.

Plugins are first-party code, not a sandbox. Untrusted, per-world behaviour belongs in DMS scripts,
which are trust-gated.
