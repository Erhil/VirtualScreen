import type { ComponentType } from "react";

import type { Translator } from "../lang";

export interface PluginToolContext {
  worldId: string | null;
  t: Translator;
}

/**
 * A tool that lives in its own folder under src/plugins and appears in the plugin dock.
 * Plugins are imported directly by PluginToolsHost: they ship in this repository, so a
 * runtime registry that discovers, validates and de-duplicates them was machinery with
 * nothing to discover. Adding one is a folder plus one line in PluginToolsHost.
 */
export interface PluginTool {
  id: string;
  icon: string;
  title: (t: Translator) => string;
  Panel: ComponentType<PluginToolContext>;
}
