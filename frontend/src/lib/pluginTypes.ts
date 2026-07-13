import type { ComponentType } from "react";

import type { Translator } from "../lang";

export interface PluginToolContext {
  worldId: string | null;
  t: Translator;
}

export interface PluginTool {
  icon?: string;
  title: (t: Translator) => string;
  Panel: ComponentType<PluginToolContext>;
}

export interface PluginScreen {
  Layer: ComponentType;
}

export interface VsPlugin {
  id: string;
  name: string;
  version?: string;
  tool?: PluginTool;
  screen?: PluginScreen;
}

export function definePlugin(plugin: VsPlugin): VsPlugin {
  return plugin;
}
