import { describe, expect, it } from "vitest";

import type { SearchResult, WorkspaceTab } from "./api";
import {
  chooseSecondaryPaneActiveTab,
  clampWorkspaceSplitRatio,
  defaultWorkspaceLayout,
  groupSearchResults,
  isFavorite,
  normalizeWorkspaceLayout,
  openFileInActivePane,
  recordRecentItem,
  retargetLayoutAfterTabClose,
  searchResultToTab,
  switchWorkspaceSession,
  toggleFavorite
} from "./workspace";

const captain: WorkspaceTab = {
  path: "NPCs/Captain Ilyra.md",
  name: "Captain Ilyra.md",
  title: "Captain Ilyra",
  mediaKind: "markdown"
};

const home: WorkspaceTab = {
  path: "README.md",
  name: "README.md",
  title: "Sample World Guide",
  mediaKind: "markdown"
};

function result(path: string, mediaKind: SearchResult["media_kind"]): SearchResult {
  return {
    path,
    name: path.split("/").at(-1) ?? path,
    extension: path.split(".").at(-1) ?? null,
    media_kind: mediaKind,
    title: path,
    page_type: null,
    tags: [],
    aliases: [],
    snippet: null,
    match_reason: "title",
    score: 100
  };
}

describe("workspace helpers", () => {
  it("groups search results by media kind", () => {
    const groups = groupSearchResults([
      result("README.md", "markdown"),
      result("NPCs/Captain Ilyra.cs", "card"),
      result("Tables/random-events.csv", "csv"),
      result("Scripts/hello_world.dms", "script"),
      result("Docs/handout.pdf", "pdf"),
      result("Media/flyover.mp4", "video")
    ]);

    expect(groups).toEqual([
      { label: "Markdown", results: [result("README.md", "markdown")] },
      { label: "Cards", results: [result("NPCs/Captain Ilyra.cs", "card")] },
      { label: "CSV", results: [result("Tables/random-events.csv", "csv")] },
      { label: "Scripts", results: [result("Scripts/hello_world.dms", "script")] },
      { label: "PDF", results: [result("Docs/handout.pdf", "pdf")] },
      { label: "Video", results: [result("Media/flyover.mp4", "video")] }
    ]);
  });

  it("maps search results to tabs", () => {
    const tab = searchResultToTab({
      ...result("NPCs/Captain Ilyra.md", "markdown"),
      title: "Captain Ilyra"
    });

    expect(tab).toEqual(captain);
  });

  it("toggles favorites by path while preserving order", () => {
    expect(toggleFavorite([], captain)).toEqual([captain]);
    expect(toggleFavorite([home, captain], captain)).toEqual([home]);
  });

  it("detects favorites by path", () => {
    expect(isFavorite([captain], "NPCs/Captain Ilyra.md")).toBe(true);
    expect(isFavorite([captain], "README.md")).toBe(false);
  });

  it("records recent items with de-duplication and newest first", () => {
    const recent = recordRecentItem([captain, home], home);

    expect(recent.map((item) => item.path)).toEqual(["README.md", "NPCs/Captain Ilyra.md"]);
  });

  it("builds and normalizes default workspace layouts", () => {
    expect(defaultWorkspaceLayout("README.md")).toEqual({
      mode: "single",
      activePaneId: "main",
      panes: [
        { id: "main", activePath: "README.md" },
        { id: "secondary", activePath: null }
      ],
      splitRatio: 0.5
    });

    expect(clampWorkspaceSplitRatio(0.1)).toBe(0.25);
    expect(clampWorkspaceSplitRatio(0.9)).toBe(0.75);

    expect(
      normalizeWorkspaceLayout(
        {
          mode: "vertical_split",
          activePaneId: "secondary",
          panes: [
            { id: "secondary", activePath: "missing.md" },
            { id: "main", activePath: "README.md" }
          ],
          splitRatio: 0.9
        },
        [home]
      )
    ).toEqual({
      mode: "vertical_split",
      activePaneId: "secondary",
      panes: [
        { id: "main", activePath: "README.md" },
        { id: "secondary", activePath: null }
      ],
      splitRatio: 0.75
    });
  });

  it("chooses a secondary pane tab distinct from the primary tab", () => {
    expect(chooseSecondaryPaneActiveTab([home, captain], "README.md")).toBe(
      "NPCs/Captain Ilyra.md"
    );
    expect(chooseSecondaryPaneActiveTab([home], "README.md")).toBeNull();
  });

  it("opens files into the active pane", () => {
    const layout = {
      ...defaultWorkspaceLayout("README.md"),
      mode: "vertical_split" as const,
      activePaneId: "secondary" as const
    };

    expect(openFileInActivePane(layout, "NPCs/Captain Ilyra.md")).toEqual({
      ...layout,
      panes: [
        { id: "main", activePath: "README.md" },
        { id: "secondary", activePath: "NPCs/Captain Ilyra.md" }
      ]
    });
  });

  it("retargets or clears pane active paths after a tab closes", () => {
    const layout = {
      mode: "vertical_split" as const,
      activePaneId: "secondary" as const,
      panes: [
        { id: "main" as const, activePath: "README.md" },
        { id: "secondary" as const, activePath: "NPCs/Captain Ilyra.md" }
      ],
      splitRatio: 0.5
    };

    expect(retargetLayoutAfterTabClose(layout, [home], "NPCs/Captain Ilyra.md")).toEqual({
      ...layout,
      panes: [
        { id: "main", activePath: "README.md" },
        { id: "secondary", activePath: null }
      ]
    });
    expect(retargetLayoutAfterTabClose(layout, [], "README.md")).toEqual({
      ...layout,
      panes: [
        { id: "main", activePath: null },
        { id: "secondary", activePath: null }
      ]
    });
  });

  it("switches workspace session data while preserving world collections", () => {
    const current = {
      workspaceId: "default",
      workspaceName: "Default",
      tabs: [home],
      activePath: "README.md",
      layout: defaultWorkspaceLayout("README.md"),
      favorites: [captain],
      recentFiles: [home]
    };
    const incoming = {
      workspaceId: "session-2",
      workspaceName: "Session 2",
      tabs: [captain],
      activePath: "NPCs/Captain Ilyra.md",
      layout: defaultWorkspaceLayout("NPCs/Captain Ilyra.md"),
      favorites: [],
      recentFiles: []
    };

    expect(switchWorkspaceSession(current, incoming)).toEqual({
      ...incoming,
      favorites: [captain],
      recentFiles: [home]
    });
  });
});
