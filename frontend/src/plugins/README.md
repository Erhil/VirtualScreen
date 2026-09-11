Optional tools live here, one folder each. A plugin exports a `PluginTool` from `plugin.ts`
and is listed in `components/PluginToolsHost.tsx`; its backend half (if any) is a router in
`backend/app/plugins/<id>/` included in `backend/app/main.py`. See docs/PLUGINS.md.
