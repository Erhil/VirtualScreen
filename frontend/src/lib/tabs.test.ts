import { describe, expect, it } from "vitest";

import {
  activateTab,
  closeTab,
  dirtyTabCloseMessage,
  mediaKindForEntry,
  mediaKindForPath,
  shouldConfirmDirtyTabClose,
  openTab,
  openTabToWorkspaceTab,
  workspaceTabFromPath,
  workspaceTabToOpenTab,
  type OpenTab
} from "./tabs";

const first: OpenTab = { path: "README.md", name: "README.md", mediaKind: "markdown" };
const second: OpenTab = {
  path: "Tables/random-events.csv",
  name: "random-events.csv",
  mediaKind: "csv"
};

describe("tab helpers", () => {
  it("opens a new tab and activates it", () => {
    expect(openTab({ tabs: [], activePath: null }, first)).toEqual({
      tabs: [first],
      activePath: "README.md"
    });
  });

  it("activates an existing tab without duplicating it", () => {
    expect(openTab({ tabs: [first], activePath: "README.md" }, first)).toEqual({
      tabs: [first],
      activePath: "README.md"
    });
  });

  it("closes the active tab and activates the nearest remaining tab", () => {
    expect(closeTab({ tabs: [first, second], activePath: second.path }, second.path)).toEqual({
      tabs: [first],
      activePath: first.path
    });
  });

  it("activates a requested tab", () => {
    expect(activateTab({ tabs: [first, second], activePath: first.path }, second.path)).toEqual({
      tabs: [first, second],
      activePath: second.path
    });
  });

  it("requires confirmation only for dirty tab closes", () => {
    expect(shouldConfirmDirtyTabClose(first.path, new Set())).toBe(false);
    expect(shouldConfirmDirtyTabClose(first.path, new Set([first.path]))).toBe(true);
  });

  it("formats a clear dirty tab close warning", () => {
    expect(dirtyTabCloseMessage({ ...first, title: "Sample World Guide" })).toBe(
      "Close Sample World Guide without saving changes?"
    );
    expect(dirtyTabCloseMessage(second)).toBe(
      "Close random-events.csv without saving changes?"
    );
  });

  it("maps world paths and entries to workspace tabs", () => {
    expect(mediaKindForPath("Cards/Hero.cs")).toBe("card");
    expect(mediaKindForPath("Media/map.svg")).toBe("image");
    expect(mediaKindForEntry({
      name: "map.svg",
      path: "Media/map.svg",
      kind: "file",
      extension: "svg",
      children: []
    })).toBe("image");

    const workspaceTab = workspaceTabFromPath("Cards/Hero.cs", [
      {
        path: "Cards/Hero.cs",
        name: "Hero.cs",
        extension: "cs",
        title: "Hero",
        page_type: "card",
        tags: [],
        aliases: [],
        size: 100,
        modified_at: "2026-01-01T00:00:00Z",
        hash: "abc"
      }
    ]);
    expect(workspaceTab).toMatchObject({
      path: "Cards/Hero.cs",
      name: "Hero.cs",
      title: "Hero",
      mediaKind: "card"
    });
    const open = workspaceTabToOpenTab(workspaceTab);
    expect(open).toMatchObject({ path: "Cards/Hero.cs", mediaKind: "card" });
    expect(openTabToWorkspaceTab(open)).toEqual(workspaceTab);
  });
});
