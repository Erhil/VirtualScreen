import { useEffect, useState } from "react";

import type { PluginScreen, PluginTool, VsPlugin } from "./pluginTypes";

export function isVsPlugin(x: unknown): x is VsPlugin {
  if (typeof x !== "object" || x === null) {
    return false;
  }
  const candidate = x as Record<string, unknown>;
  if (typeof candidate.id !== "string" || candidate.id.length === 0) {
    return false;
  }
  if (typeof candidate.name !== "string") {
    return false;
  }
  if (candidate.tool !== undefined) {
    const tool = candidate.tool as Partial<PluginTool> | null;
    if (
      typeof tool !== "object" ||
      tool === null ||
      typeof tool.title !== "function" ||
      typeof tool.Panel !== "function"
    ) {
      return false;
    }
    if (tool.icon !== undefined && typeof tool.icon !== "string") {
      return false;
    }
  }
  if (candidate.screen !== undefined) {
    const screen = candidate.screen as Partial<PluginScreen> | null;
    if (typeof screen !== "object" || screen === null || typeof screen.Layer !== "function") {
      return false;
    }
  }
  return true;
}

export function collectPlugins(modules: Record<string, unknown>): VsPlugin[] {
  const result: VsPlugin[] = [];
  const seenIds = new Set<string>();

  for (const [path, mod] of Object.entries(modules)) {
    const candidate = (mod as { default?: unknown }).default;
    if (!isVsPlugin(candidate)) {
      console.warn(`[plugins] ${path}: invalid or missing default export; skipping`);
      continue;
    }
    if (seenIds.has(candidate.id)) {
      console.warn(`[plugins] ${path}: duplicate id "${candidate.id}"; skipping`);
      continue;
    }
    seenIds.add(candidate.id);
    result.push(candidate);
  }

  return result;
}

const defaultLoaders = import.meta.glob("../plugins/*/plugin.{ts,tsx}") as Record<
  string,
  () => Promise<unknown>
>;

export async function loadPlugins(
  loaders: Record<string, () => Promise<unknown>> = defaultLoaders
): Promise<VsPlugin[]> {
  const modules: Record<string, unknown> = {};

  for (const [path, load] of Object.entries(loaders)) {
    try {
      modules[path] = await load();
    } catch (err) {
      console.warn(`[plugins] ${path}: failed to import; skipping`, err);
    }
  }

  return collectPlugins(modules);
}

export function usePlugins(): VsPlugin[] {
  const [plugins, setPlugins] = useState<VsPlugin[]>([]);

  useEffect(() => {
    let active = true;

    loadPlugins().then((loaded) => {
      if (active) {
        setPlugins(loaded);
      }
    });

    return () => {
      active = false;
    };
  }, []);

  return plugins;
}
