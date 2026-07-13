import { describe, expect, it, vi } from "vitest";

import { collectPlugins, loadPlugins } from "./pluginRegistry";
import type { PluginScreen, PluginTool, VsPlugin } from "./pluginTypes";

function noop() {
  // intentionally empty
}

describe("collectPlugins", () => {
  it("keeps a valid tool plugin", () => {
    const plugin: VsPlugin = {
      id: "tool-plugin",
      name: "Tool Plugin",
      tool: {
        title: () => "Tool Plugin",
        Panel: () => null
      }
    };

    const result = collectPlugins({ "../plugins/tool-plugin/plugin.tsx": { default: plugin } });

    expect(result).toEqual([plugin]);
  });

  it("keeps a valid screen plugin", () => {
    const plugin: VsPlugin = {
      id: "screen-plugin",
      name: "Screen Plugin",
      screen: {
        Layer: () => null
      }
    };

    const result = collectPlugins({ "../plugins/screen-plugin/plugin.tsx": { default: plugin } });

    expect(result).toEqual([plugin]);
  });

  it("skips a module whose default export is missing or invalid", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(noop);

    const result = collectPlugins({
      "../plugins/no-default/plugin.ts": {},
      "../plugins/bad-shape/plugin.ts": { default: { name: "Missing id" } },
      "../plugins/bad-tool/plugin.ts": {
        default: { id: "bad-tool", name: "Bad Tool", tool: { title: "not a function" } }
      }
    });

    expect(result).toEqual([]);
    expect(warnSpy).toHaveBeenCalledTimes(3);

    warnSpy.mockRestore();
  });

  it("keeps only the first module when ids collide", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(noop);

    const first: VsPlugin = { id: "dup", name: "First" };
    const second: VsPlugin = { id: "dup", name: "Second" };

    const result = collectPlugins({
      "../plugins/first/plugin.ts": { default: first },
      "../plugins/second/plugin.ts": { default: second }
    });

    expect(result).toEqual([first]);
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('duplicate id "dup"')
    );

    warnSpy.mockRestore();
  });

  it("returns an empty array for no modules", () => {
    expect(collectPlugins({})).toEqual([]);
  });

  it("skips a plugin whose screen.Layer is not a function", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(noop);

    const result = collectPlugins({
      "../plugins/bad-screen/plugin.ts": {
        default: { id: "bad-screen", name: "Bad Screen", screen: { Layer: "not a function" } }
      }
    });

    expect(result).toEqual([]);
    warnSpy.mockRestore();
  });

  it("skips a plugin whose tool.icon is a non-string", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(noop);

    const result = collectPlugins({
      "../plugins/bad-icon/plugin.ts": {
        default: {
          id: "bad-icon",
          name: "Bad Icon",
          tool: { title: () => "Bad Icon", Panel: () => null, icon: 42 }
        }
      }
    });

    expect(result).toEqual([]);
    warnSpy.mockRestore();
  });

  it("keeps a plugin exposing both a valid tool and a valid screen, present in both capability filters", () => {
    const plugin: VsPlugin = {
      id: "dual-plugin",
      name: "Dual Plugin",
      tool: {
        title: () => "Dual Plugin",
        Panel: () => null
      },
      screen: {
        Layer: () => null
      }
    };

    const result = collectPlugins({ "../plugins/dual-plugin/plugin.tsx": { default: plugin } });

    expect(result).toEqual([plugin]);

    const toolPlugins = result.filter(
      (p): p is VsPlugin & { tool: PluginTool } => Boolean(p.tool)
    );
    const screenPlugins = result.filter(
      (p): p is VsPlugin & { screen: PluginScreen } => Boolean(p.screen)
    );

    expect(toolPlugins).toEqual([plugin]);
    expect(screenPlugins).toEqual([plugin]);
  });
});

describe("loadPlugins", () => {
  it("isolates a plugin module that fails to import and resolves with only the valid ones", async () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(noop);

    const validPlugin: VsPlugin = {
      id: "a",
      name: "A"
    };

    const fakeLoaders: Record<string, () => Promise<unknown>> = {
      "a/plugin.ts": () => Promise.resolve({ default: validPlugin }),
      "b/plugin.ts": () => Promise.reject(new Error("boom"))
    };

    await expect(loadPlugins(fakeLoaders)).resolves.toEqual([validPlugin]);

    warnSpy.mockRestore();
  });

  it("resolves to an empty array when there are no loaders", async () => {
    await expect(loadPlugins({})).resolves.toEqual([]);
  });
});
