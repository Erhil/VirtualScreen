import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildDisplayBackgroundUrl,
  buildMediaUrl,
  buildScreenDisplayBackgroundUrl,
  buildScreenMediaUrl,
  blankDisplay,
  closeDisplayPopup,
  clearDisplayPopups,
  fetchPrepHealth,
  fetchHpTracker,
  fetchAuthStatus,
  createCapture,
  createWorld,
  createWorldFolder,
  createWorldFile,
  deleteTrash,
  describeHealth,
  duplicateWorldPath,
  fetchFastSlots,
  fetchCardTemplates,
  fetchTrash,
  fetchWorlds,
  fetchDisplayState,
  fetchScreenDisplayState,
  fetchScreenPageLinks,
  fetchScreenWorldFile,
  fetchWorkspace,
  fetchWorkspaces,
  fetchPage,
  fetchPageBacklinks,
  fetchPageLinks,
  fetchPages,
  rebuildIndex,
  recordRecent,
  moveWorldPath,
  renameWorldFile,
  restoreTrash,
  saveFavorites,
  saveHpTracker,
  saveRecentFiles,
  saveRecentWorlds,
  saveWorldFile,
  saveWorkspaceLayout,
  saveWorkspaceTabs,
  searchWorld,
  fetchAudioLibrary,
  fetchCaptureToday,
  fetchTableSnapshot,
  fetchTableSnapshots,
  fetchWorldFile,
  fetchWorldTree,
  createWorkspace,
  deleteTableSnapshot,
  openWorld,
  openDisplayPopup,
  loginAuth,
  logoutAuth,
  renameWorkspace,
  fetchScenarios,
  fetchScenarioRuns,
  fetchScripts,
  fetchDmsRun,
  cancelDmsRun,
  runScenario,
  runDmsScript,
  submitDmsForm,
  saveFastSlots,
  restoreTableSnapshot,
  saveTableSnapshot,
  activateWorkspace,
  deleteWorkspace,
  setDisplayFullscreen,
  setDisplayPopupVisible,
  showActiveOnDisplay,
  trashWorldFile,
  trashWorldPath,
  updatePageMetadata,
  type DmsEffect,
  type FastSlot,
  type CreateCaptureRequest,
  type HpTrackerState,
  type PrepHealthResponse,
  type TableSnapshotState,
  type WorldEntry,
  type WorkspaceLayout,
  type WorkspaceState
} from "./api";

function mockJsonResponse(body: unknown, ok = true, status = 200) {
  return Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(body)
  } as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("describeHealth", () => {
  it("formats backend health for compact display", () => {
    expect(describeHealth({ service: "virtualscreen-api", status: "ok" })).toBe(
      "virtualscreen-api:ok"
    );
  });
});

describe("API types", () => {
  it("accepts DMS map effect shapes", () => {
    const effects: DmsEffect[] = [
      { id: "effect-1", kind: "map_load", path: "Maps/city.svg", present: true },
      { id: "effect-2", kind: "map_preset", preset_id: "city-gate", present: true },
      { id: "effect-3", kind: "map_present" },
      { id: "effect-4", kind: "map_stop" },
      { id: "effect-5", kind: "map_fog", enabled: false }
    ];

    expect(effects.map((effect) => effect.kind)).toEqual([
      "map_load",
      "map_preset",
      "map_present",
      "map_stop",
      "map_fog"
    ]);
  });

  it("accepts prep health audit shapes", () => {
    const response: PrepHealthResponse = {
      checked_at: "2026-05-14T12:00:00Z",
      status: "error",
      issue_count: 2,
      errors: 1,
      warnings: 1,
      issues: [
        {
          id: "link:README.md:Missing Page",
          severity: "error",
          kind: "broken_link",
          source_path: "README.md",
          source_title: "Home",
          source_kind: "markdown",
          raw_target: "Missing Page",
          label: "Missing Page",
          command: null,
          message: "Broken link: Missing Page"
        },
        {
          id: "dms:Scripts/intro.dms:Media/map.png",
          severity: "warning",
          kind: "dms_parse_error",
          source_path: "Scripts/intro.dms",
          source_title: "Intro",
          source_kind: "script",
          raw_target: "",
          label: null,
          command: null,
          message: "DMS parse error on line 3."
        }
      ]
    };

    expect(response.issues.map((issue) => issue.kind)).toEqual([
      "broken_link",
      "dms_parse_error"
    ]);
  });
});

describe("world API helpers", () => {
  it("fetches today's quick captures and creates a capture", async () => {
    const today = {
      path: "Session Logs/2026-05-11.md",
      exists: false
    };
    const created = {
      path: "Session Logs/2026-05-11.md",
      category: "npc",
      heading: "NPCs",
      entry: "- 19:05 - Gate captain owes a favor.",
      created: true,
      modified_at: "2026-05-11T19:05:00Z",
      hash: "a".repeat(64)
    };
    const payload: CreateCaptureRequest = {
      category: "npc",
      text: "Gate captain owes a favor."
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(today))
      .mockResolvedValueOnce(mockJsonResponse(created));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCaptureToday()).resolves.toEqual(today);
    await expect(createCapture(payload)).resolves.toEqual(created);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/capture/today");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/capture", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  });

  it("fetches auth status and logs in/out", async () => {
    const fetchMock = vi.fn(() =>
      mockJsonResponse({ enabled: true, authenticated: true })
    );
    vi.stubGlobal("fetch", fetchMock);

    await fetchAuthStatus();
    await loginAuth("secret");
    await logoutAuth();

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/auth/status");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token: "secret" })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/auth/logout", {
      method: "POST"
    });
  });

  it("fetches world library state and opens worlds", async () => {
    const state = {
      worlds_root: "D:/Worlds",
      current: null,
      worlds: [
        {
          id: "Campaign A",
          name: "Campaign A",
          path: "D:/Worlds/Campaign A",
          modified_at: "2026-05-08T12:00:00Z"
        }
      ],
      recent: []
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve(state)
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () => Promise.resolve({ ...state, current: state.worlds[0] })
      } as Response);
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWorlds()).resolves.toEqual(state);
    await expect(openWorld("Campaign A")).resolves.toEqual({
      ...state,
      current: state.worlds[0]
    });
    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/worlds");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/worlds/open", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "Campaign A" })
    });
  });

  it("creates a world inside the world library", async () => {
    const state = {
      worlds_root: "D:/Worlds",
      current: {
        id: "New Campaign",
        name: "New Campaign",
        path: "D:/Worlds/New Campaign",
        modified_at: "2026-05-08T12:00:00Z"
      },
      worlds: [
        {
          id: "New Campaign",
          name: "New Campaign",
          path: "D:/Worlds/New Campaign",
          modified_at: "2026-05-08T12:00:00Z"
        }
      ],
      recent: []
    };
    const fetchMock = vi.fn(() => mockJsonResponse(state));
    vi.stubGlobal("fetch", fetchMock);

    await expect(createWorld("New Campaign")).resolves.toEqual(state);

    expect(fetchMock).toHaveBeenCalledWith("/api/worlds", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "New Campaign" })
    });
  });

  it("saves recent world ids", async () => {
    const fetchMock = vi.fn(() =>
      mockJsonResponse({
        worlds_root: "D:/Worlds",
        current: null,
        worlds: [],
        recent: []
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    await saveRecentWorlds(["A", "B"]);

    expect(fetchMock).toHaveBeenCalledWith("/api/worlds/recent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recent: ["A", "B"] })
    });
  });

  it("fetches the world tree", async () => {
    const tree: WorldEntry = {
      name: "sample-world",
      path: "",
      kind: "directory",
      extension: null,
      children: [],
      title: null,
      page_type: null,
      tags: [],
      aliases: []
    };
    const fetchMock = vi.fn(() => mockJsonResponse(tree));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWorldTree()).resolves.toEqual(tree);
    expect(fetchMock).toHaveBeenCalledWith("/api/world/tree");
  });

  it("fetches card template catalogs", async () => {
    const catalog = {
      templates: [
        {
          id: "npc-contact",
          name: "NPC Contact",
          kind: "npc",
          source: "world",
          card: {
            kind: "npc",
            title: "{{title}}",
            tags: ["npc"],
            sections: []
          }
        }
      ],
      warnings: []
    };
    const fetchMock = vi.fn(() => mockJsonResponse(catalog));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchCardTemplates()).resolves.toEqual(catalog);

    expect(fetchMock).toHaveBeenCalledWith("/api/card-templates");
  });

  it("fetches a world file with an encoded path", async () => {
    const fetchMock = vi.fn(() =>
      mockJsonResponse({
        path: "NPCs/Captain Ilyra.md",
        name: "Captain Ilyra.md",
        extension: "md",
        media_kind: "markdown",
        content_type: "text/markdown",
        size: 12,
        modified_at: "2026-05-05T09:00:00Z",
        hash: "abc123",
        content: "# Captain Ilyra"
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = await fetchWorldFile("NPCs/Captain Ilyra.md");

    expect(file.media_kind).toBe("markdown");
    expect(file.hash).toBe("abc123");
    expect(fetchMock).toHaveBeenCalledWith("/api/world/file?path=NPCs%2FCaptain%20Ilyra.md");
  });

  it("saves a world file with conflict preconditions", async () => {
    const savedFile = {
      path: "README.md",
      name: "README.md",
      extension: "md",
      media_kind: "markdown",
      content_type: "text/markdown",
      size: 24,
      modified_at: "2026-05-05T09:01:00Z",
      hash: "new-hash",
      content: "# Updated",
      backup_path: ".virtualscreen/backups/20260505-090100/README.md"
    };
    const fetchMock = vi.fn(() => mockJsonResponse(savedFile));
    vi.stubGlobal("fetch", fetchMock);

    const response = await saveWorldFile("README.md", {
      content: "# Updated",
      expected_modified_at: "2026-05-05T09:00:00Z",
      expected_hash: "old-hash"
    });

    expect(response.backup_path).toContain("README.md");
    expect(fetchMock).toHaveBeenCalledWith("/api/world/file?path=README.md", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "# Updated",
        expected_modified_at: "2026-05-05T09:00:00Z",
        expected_hash: "old-hash"
      })
    });
  });

  it("creates a managed world file", async () => {
    const createdFile = {
      path: "Session Notes.md",
      name: "Session Notes.md",
      extension: "md",
      media_kind: "markdown",
      content_type: "text/markdown",
      size: 16,
      modified_at: "2026-05-05T09:01:00Z",
      hash: "new-hash",
      content: "# Session Notes\n"
    };
    const fetchMock = vi.fn(() => mockJsonResponse(createdFile));
    vi.stubGlobal("fetch", fetchMock);

    const response = await createWorldFile({
      path: "Session Notes.md",
      file_type: "markdown"
    });

    expect(response.path).toBe("Session Notes.md");
    expect(fetchMock).toHaveBeenCalledWith("/api/world/file", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "Session Notes.md", file_type: "markdown" })
    });
  });

  it("renames a managed world file with conflict preconditions", async () => {
    const renamedFile = {
      path: "Renamed Home.md",
      name: "Renamed Home.md",
      extension: "md",
      media_kind: "markdown",
      content_type: "text/markdown",
      size: 16,
      modified_at: "2026-05-05T09:02:00Z",
      hash: "new-hash",
      content: "# Home\n"
    };
    const fetchMock = vi.fn(() => mockJsonResponse(renamedFile));
    vi.stubGlobal("fetch", fetchMock);

    const response = await renameWorldFile({
      path: "README.md",
      new_path: "Renamed Home.md",
      expected_modified_at: "2026-05-05T09:01:00Z",
      expected_hash: "old-hash"
    });

    expect(response.path).toBe("Renamed Home.md");
    expect(fetchMock).toHaveBeenCalledWith("/api/world/file/rename", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "README.md",
        new_path: "Renamed Home.md",
        expected_modified_at: "2026-05-05T09:01:00Z",
        expected_hash: "old-hash"
      })
    });
  });

  it("moves a managed world file to trash", async () => {
    const fetchMock = vi.fn(() =>
      mockJsonResponse({
        path: "events.csv",
        trashed_path: ".virtualscreen/trash/20260505-090200/events.csv"
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await trashWorldFile({
      path: "events.csv",
      expected_modified_at: "2026-05-05T09:01:00Z",
      expected_hash: "old-hash"
    });

    expect(response.trashed_path).toContain("events.csv");
    expect(fetchMock).toHaveBeenCalledWith("/api/world/file/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "events.csv",
        expected_modified_at: "2026-05-05T09:01:00Z",
        expected_hash: "old-hash"
      })
    });
  });

  it("moves a world path with a folder-safe path operation payload", async () => {
    const responseBody = {
      path: "Lore/Cities",
      affected_paths: ["Lore/Cities/Overview.md", "Lore/Cities/NPCs/Mayor.md"],
      deleted_paths: ["World/Cities/Overview.md", "World/Cities/NPCs/Mayor.md"]
    };
    const fetchMock = vi.fn(() => mockJsonResponse(responseBody));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      moveWorldPath({ path: "World/Cities", new_path: "Lore/Cities" })
    ).resolves.toEqual(responseBody);

    expect(fetchMock).toHaveBeenCalledWith("/api/world/path/move", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "World/Cities", new_path: "Lore/Cities" })
    });
  });

  it("duplicates a world path and returns affected descendants", async () => {
    const responseBody = {
      path: "Lore/Cities Copy",
      affected_paths: ["Lore/Cities Copy/Overview.md"],
      deleted_paths: []
    };
    const fetchMock = vi.fn(() => mockJsonResponse(responseBody));
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      duplicateWorldPath({ path: "Lore/Cities", new_path: "Lore/Cities Copy" })
    ).resolves.toEqual(responseBody);

    expect(fetchMock).toHaveBeenCalledWith("/api/world/path/duplicate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "Lore/Cities", new_path: "Lore/Cities Copy" })
    });
  });

  it("moves a world path to trash without file conflict preconditions", async () => {
    const responseBody = {
      path: "Lore/Cities",
      trashed_path: ".virtualscreen/trash/20260515-120000/Lore/Cities",
      affected_paths: [],
      deleted_paths: ["Lore/Cities/Overview.md", "Lore/Cities/NPCs/Mayor.md"]
    };
    const fetchMock = vi.fn(() => mockJsonResponse(responseBody));
    vi.stubGlobal("fetch", fetchMock);

    await expect(trashWorldPath({ path: "Lore/Cities" })).resolves.toEqual(responseBody);

    expect(fetchMock).toHaveBeenCalledWith("/api/world/path/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "Lore/Cities" })
    });
  });

  it("creates folders and manages trash entries", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        mockJsonResponse({
          name: "Tavern",
          path: "NPCs/Tavern",
          kind: "directory",
          extension: null,
          children: [],
          title: null,
          page_type: null,
          tags: [],
          aliases: []
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse([
          {
            original_path: "old.md",
            trashed_path: ".virtualscreen/trash/20260508-120000/old.md",
            name: "old.md",
            kind: "file",
            size: 12,
            trashed_at: "20260508-120000"
          }
        ])
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          path: "old.md",
          trashed_path: ".virtualscreen/trash/20260508-120000/old.md"
        })
      )
      .mockResolvedValueOnce(
        mockJsonResponse({
          trashed_path: ".virtualscreen/trash/20260508-120000/old.md"
        })
      );
    vi.stubGlobal("fetch", fetchMock);

    await createWorldFolder({ path: "NPCs/Tavern" });
    await fetchTrash();
    await restoreTrash({ trashed_path: ".virtualscreen/trash/20260508-120000/old.md" });
    await deleteTrash({ trashed_path: ".virtualscreen/trash/20260508-120000/old.md" });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/world/folder", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "NPCs/Tavern" })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/world/trash");
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/world/trash/restore", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trashed_path: ".virtualscreen/trash/20260508-120000/old.md" })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/world/trash", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ trashed_path: ".virtualscreen/trash/20260508-120000/old.md" })
    });
  });

  it("builds a media URL with an encoded path", () => {
    expect(buildMediaUrl("Media/sample map.svg")).toBe(
      "/api/world/media?path=Media%2Fsample%20map.svg"
    );
    expect(buildScreenMediaUrl("Media/sample map.svg")).toBe(
      "/api/screen/world/media?path=Media%2Fsample%20map.svg"
    );
  });

  it("builds display background URLs with optional cache busting", () => {
    expect(buildDisplayBackgroundUrl()).toBe("/api/display/background");
    expect(buildDisplayBackgroundUrl("2026-05-08T12:00:00Z")).toBe(
      "/api/display/background?v=2026-05-08T12%3A00%3A00Z"
    );
    expect(buildScreenDisplayBackgroundUrl()).toBe("/api/screen/display/background");
    expect(buildScreenDisplayBackgroundUrl("2026-05-08T12:00:00Z")).toBe(
      "/api/screen/display/background?v=2026-05-08T12%3A00%3A00Z"
    );
  });

  it("fetches and mutates player display state", async () => {
    const state = {
      fullscreen: {
        path: "Media/map.mp4",
        title: "Animated Map",
        name: "map.mp4",
        media_kind: "video"
      },
      popups: [
        {
          id: "popup-1",
          path: "Handout.md",
          title: "Handout",
          name: "Handout.md",
          media_kind: "markdown",
          created_at: "2026-05-08T12:00:00Z",
          preset: "plain"
        }
      ],
      updated_at: "2026-05-08T12:00:00Z"
    };
    const fetchMock = vi.fn(() => mockJsonResponse(state));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchDisplayState()).resolves.toEqual(state);
    await setDisplayFullscreen("Media/map.mp4");
    await openDisplayPopup("Handout.md");
    await openDisplayPopup("Clue.md", "clue");
    await openDisplayPopup("Draft.md", "plain", false);
    await setDisplayPopupVisible("popup-1", true);
    await showActiveOnDisplay({
      path: "README.md",
      mode: "fullscreen",
      clear_existing: true
    });
    await closeDisplayPopup("popup-1");
    await clearDisplayPopups();
    await blankDisplay();

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/display/state");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/display/fullscreen", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "Media/map.mp4" })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/display/popup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "Handout.md", visible: true })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/display/popup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "Clue.md", preset: "clue", visible: true })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(5, "/api/display/popup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "Draft.md", preset: "plain", visible: false })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(6, "/api/display/popup/popup-1", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visible: true })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(7, "/api/display/show-active", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: "README.md",
        mode: "fullscreen",
        clear_existing: true
      })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(8, "/api/display/popup/popup-1", {
      method: "DELETE"
    });
    expect(fetchMock).toHaveBeenNthCalledWith(9, "/api/display/popups", {
      method: "DELETE"
    });
    expect(fetchMock).toHaveBeenNthCalledWith(10, "/api/display/blank", {
      method: "POST"
    });
  });

  it("fetches player-screen content through public read endpoints", async () => {
    const displayState = {
      fullscreen: null,
      popups: [],
      updated_at: "2026-05-08T12:00:00Z"
    };
    const file = {
      path: "README.md",
      name: "README.md",
      extension: "md",
      media_kind: "markdown",
      content_type: "text/markdown",
      size: 12,
      modified_at: "2026-05-05T09:00:00Z",
      hash: "abc123",
      content: "# Home"
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(displayState))
      .mockResolvedValueOnce(mockJsonResponse(file))
      .mockResolvedValueOnce(mockJsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchScreenDisplayState()).resolves.toEqual(displayState);
    await expect(fetchScreenWorldFile("README.md")).resolves.toEqual(file);
    await expect(fetchScreenPageLinks("README.md")).resolves.toEqual([]);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/screen/display/state");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/screen/world/file?path=README.md");
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/screen/page/links?path=README.md");
  });

  it("throws a useful error when a request fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => mockJsonResponse({ detail: "Nope" }, false, 415)));

    await expect(fetchWorldFile("roll.bin")).rejects.toThrow(
      "Request failed with 415: /api/world/file?path=roll.bin"
    );
  });

  it("fetches page summaries", async () => {
    const fetchMock = vi.fn(() =>
      mockJsonResponse([
        {
          path: "README.md",
          name: "README.md",
          extension: "md",
          title: "Sample World Guide",
          page_type: "index",
          tags: ["sample"],
          aliases: ["Home"],
          size: 10,
          modified_at: "2026-05-05T09:00:00Z",
          hash: "home-hash"
        }
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const pages = await fetchPages();

    expect(pages[0].title).toBe("Sample World Guide");
    expect(fetchMock).toHaveBeenCalledWith("/api/pages");
  });

  it("fetches page detail with an encoded path", async () => {
    const fetchMock = vi.fn(() =>
      mockJsonResponse({
        path: "NPCs/Captain Ilyra.md",
        name: "Captain Ilyra.md",
        extension: "md",
        title: "Captain Ilyra",
        page_type: "npc",
        tags: ["city-watch"],
        aliases: ["Ilyra"],
        size: 10,
        modified_at: "2026-05-05T09:00:00Z",
        hash: "captain-hash",
        metadata: { title: "Captain Ilyra" },
        fields: { danger: "medium" }
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const page = await fetchPage("NPCs/Captain Ilyra.md");

    expect(page.fields).toEqual({ danger: "medium" });
    expect(fetchMock).toHaveBeenCalledWith("/api/page?path=NPCs%2FCaptain%20Ilyra.md");
  });

  it("updates page metadata with encoded path and conflict preconditions", async () => {
    const responseBody = {
      page: {
        path: "NPCs/Captain Ilyra.md",
        name: "Captain Ilyra.md",
        extension: "md",
        title: "Captain Ilyra Updated",
        page_type: "npc",
        tags: ["city-watch"],
        aliases: ["Ilyra"],
        size: 10,
        modified_at: "2026-05-05T09:01:00Z",
        hash: "updated-hash",
        metadata: { title: "Captain Ilyra Updated" },
        fields: { voice: "formal" }
      },
      file: {
        path: "NPCs/Captain Ilyra.md",
        name: "Captain Ilyra.md",
        extension: "md",
        media_kind: "markdown",
        content_type: "text/markdown",
        size: 10,
        modified_at: "2026-05-05T09:01:00Z",
        hash: "new-hash",
        content: "# Captain Ilyra"
      },
      backup_path: ".virtualscreen/backups/20260505-090100/NPCs/Captain Ilyra.md"
    };
    const fetchMock = vi.fn(() => mockJsonResponse(responseBody));
    vi.stubGlobal("fetch", fetchMock);

    const response = await updatePageMetadata("NPCs/Captain Ilyra.md", {
      metadata: {
        title: "Captain Ilyra Updated",
        type: "npc",
        tags: ["city-watch"],
        aliases: ["Ilyra"],
        fields: { voice: "formal" }
      },
      expected_modified_at: "2026-05-05T09:00:00Z",
      expected_hash: "old-hash"
    });

    expect(response.file.hash).toBe("new-hash");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/page/metadata?path=NPCs%2FCaptain%20Ilyra.md",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            title: "Captain Ilyra Updated",
            type: "npc",
            tags: ["city-watch"],
            aliases: ["Ilyra"],
            fields: { voice: "formal" }
          },
          expected_modified_at: "2026-05-05T09:00:00Z",
          expected_hash: "old-hash"
        })
      }
    );
  });

  it("updates CSV page metadata with frontend payload shape", async () => {
    const responseBody = {
      page: {
        path: "Tables/random-events.csv",
        name: "random-events.csv",
        extension: "csv",
        title: "Random Events",
        page_type: null,
        tags: [],
        aliases: [],
        size: 10,
        modified_at: "2026-05-05T09:01:00Z",
        hash: "csv-hash",
        metadata: { title: "Random Events" },
        fields: {}
      },
      file: {
        path: "Tables/random-events.csv",
        name: "random-events.csv",
        extension: "csv",
        media_kind: "csv",
        content_type: "text/csv",
        size: 10,
        modified_at: "2026-05-05T09:01:00Z",
        hash: "csv-hash",
        content: "result,event\n"
      },
      backup_path: ".virtualscreen/backups/20260505-090100/.virtualscreen/metadata/Tables/random-events.csv.json"
    };
    const fetchMock = vi.fn(() => mockJsonResponse(responseBody));
    vi.stubGlobal("fetch", fetchMock);

    await updatePageMetadata("Tables/random-events.csv", {
      metadata: {
        title: "Random Events",
        type: null,
        tags: [],
        aliases: [],
        fields: {}
      },
      expected_modified_at: "2026-05-05T09:00:00Z",
      expected_hash: "old-csv-hash"
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/page/metadata?path=Tables%2Frandom-events.csv",
      {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metadata: {
            title: "Random Events",
            type: null,
            tags: [],
            aliases: [],
            fields: {}
          },
          expected_modified_at: "2026-05-05T09:00:00Z",
          expected_hash: "old-csv-hash"
        })
      }
    );
  });

  it("fetches outgoing page links with an encoded path", async () => {
    const fetchMock = vi.fn(() =>
      mockJsonResponse([
        {
          source_path: "README.md",
          raw_target: "NPCs/Captain Ilyra",
          label: "Captain Ilyra",
          link_type: "wiki",
          target_path: "NPCs/Captain Ilyra.md",
          target_title: "Captain Ilyra",
          target_kind: "markdown",
          heading: null,
          resolved: true
        }
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const links = await fetchPageLinks("README.md");

    expect(links[0].target_title).toBe("Captain Ilyra");
    expect(fetchMock).toHaveBeenCalledWith("/api/page/links?path=README.md");
  });

  it("fetches backlinks with an encoded path", async () => {
    const fetchMock = vi.fn(() => mockJsonResponse([]));
    vi.stubGlobal("fetch", fetchMock);

    await fetchPageBacklinks("NPCs/Captain Ilyra.md");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/page/backlinks?path=NPCs%2FCaptain%20Ilyra.md"
    );
  });

  it("rebuilds the search index", async () => {
    const fetchMock = vi.fn(() =>
      mockJsonResponse({
        pages_indexed: 2,
        links_indexed: 3,
        rebuilt_at: "2026-05-06T12:00:00Z"
      })
    );
    vi.stubGlobal("fetch", fetchMock);

    const result = await rebuildIndex();

    expect(result.pages_indexed).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith("/api/index/rebuild", { method: "POST" });
  });

  it("searches the world with encoded filters", async () => {
    const fetchMock = vi.fn(() =>
      mockJsonResponse([
        {
          path: "NPCs/Captain Ilyra.md",
          name: "Captain Ilyra.md",
          extension: "md",
          media_kind: "markdown",
          title: "Captain Ilyra",
          page_type: "npc",
          tags: ["city-watch"],
          aliases: ["Ilyra"],
          snippet: "river gate watch",
          match_reason: "title",
          score: 100
        }
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const results = await searchWorld({ q: "city-watch", tag: "city-watch", folder: "NPCs" });

    expect(results[0].title).toBe("Captain Ilyra");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/search?q=city-watch&tag=city-watch&folder=NPCs"
    );
  });

  it("fetches audio library tracks with encoded filters", async () => {
    const fetchMock = vi.fn(() =>
      mockJsonResponse([
        {
          path: ".music/ambient/Tavern/crowd.mp3",
          name: "crowd.mp3",
          title: "crowd",
          bus: "ambient",
          playlist: "Tavern",
          extension: "mp3",
          content_type: "audio/mpeg",
          size: 8,
          modified_at: "2026-05-09T12:00:00Z"
        }
      ])
    );
    vi.stubGlobal("fetch", fetchMock);

    const tracks = await fetchAudioLibrary({ q: "tavern crowd", bus: "ambient" });

    expect(tracks[0].path).toBe(".music/ambient/Tavern/crowd.mp3");
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/audio/library?q=tavern+crowd&bus=ambient"
    );
  });

  it("fetches and saves fast slots", async () => {
    const slots: FastSlot[] = [
      {
        id: "slot-1",
        position: 1,
        label: "Home",
        icon: null,
        action: { kind: "open_file", path: "README.md" }
      }
    ];
    const fetchMock = vi.fn(() => mockJsonResponse(slots));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchFastSlots()).resolves.toEqual(slots);
    await saveFastSlots(slots);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/fast-slots");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/fast-slots", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ slots })
    });
  });

  it("fetches and saves HP tracker rows", async () => {
    const state: HpTrackerState = {
      workspace_id: "default",
      rows: [
        {
          id: "row-1",
          name: "Goblin",
          current_hp: 3,
          max_hp: 7,
          status: "hurt",
          notes: ""
        },
        {
          id: "row-2",
          name: "Wraith",
          current_hp: 12,
          max_hp: null,
          status: "",
          notes: "phasing"
        }
      ],
      updated_at: "2026-05-13T12:00:00Z"
    };
    const fetchMock = vi.fn(() => mockJsonResponse(state));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchHpTracker()).resolves.toEqual(state);
    await expect(saveHpTracker(state.rows)).resolves.toEqual(state);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/workspace/hp");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/workspace/hp", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows: state.rows })
    });
  });

  it("fetches prep health audit results", async () => {
    const state: PrepHealthResponse = {
      checked_at: "2026-05-14T12:00:00Z",
      status: "warning",
      issue_count: 1,
      errors: 0,
      warnings: 1,
      issues: [
        {
          id: "link:README.md:Old Note",
          severity: "warning",
          kind: "dms_parse_error",
          source_path: "README.md",
          source_title: "Home",
          source_kind: "markdown",
          raw_target: "",
          label: null,
          command: null,
          message: "DMS parse error on line 4."
        }
      ]
    };
    const fetchMock = vi.fn(() => mockJsonResponse(state));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPrepHealth()).resolves.toEqual(state);

    expect(fetchMock).toHaveBeenCalledWith("/api/prep-health");
  });

  it("discovers and runs Python scenarios", async () => {
    const scenarios = [
      {
        id: "create-npc",
        name: "Create NPC",
        description: "Generate NPC",
        inputs: [
          {
            name: "name",
            label: "Name",
            input_type: "text",
            required: true,
            default: null,
            options: []
          }
        ]
      }
    ];
    const run = {
      run_id: "run-1",
      scenario_id: "create-npc",
      status: "success",
      output_kind: "markdown",
      output: "# Ilyra\n",
      stderr: "",
      created_at: "2026-05-09T12:00:00Z"
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(scenarios))
      .mockResolvedValueOnce(mockJsonResponse(run))
      .mockResolvedValueOnce(mockJsonResponse([run]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchScenarios()).resolves.toEqual(scenarios);
    await expect(runScenario("create-npc", { name: "Ilyra" })).resolves.toEqual(run);
    await expect(fetchScenarioRuns()).resolves.toEqual([run]);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/scenarios");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/scenarios/create-npc/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inputs: { name: "Ilyra" } })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/scenarios/runs");
  });

  it("fetches and persists shared workspace state", async () => {
    const layout: WorkspaceLayout = {
      mode: "single",
      activePaneId: "main",
      panes: [
        { id: "main", activePath: "README.md" },
        { id: "secondary", activePath: null }
      ],
      splitRatio: 0.5
    };
    const workspace: WorkspaceState = {
      workspaceId: "default",
      workspaceName: "Default",
      tabs: [{ path: "README.md", name: "README.md", title: "Home", mediaKind: "markdown" }],
      activePath: "README.md",
      layout,
      favorites: [],
      recentFiles: []
    };
    const fetchMock = vi.fn(() => mockJsonResponse(workspace));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWorkspace()).resolves.toEqual(workspace);
    await saveWorkspaceTabs(workspace.tabs, workspace.activePath);
    await saveFavorites(workspace.tabs);
    await recordRecent(workspace.tabs[0]);
    await saveRecentFiles(workspace.tabs);
    await saveWorkspaceLayout(layout);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/workspace");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/workspace/tabs", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tabs: workspace.tabs, activePath: "README.md" })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/workspace/favorites", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ favorites: workspace.tabs })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/workspace/recent", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tab: workspace.tabs[0] })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(5, "/api/workspace/recent", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recentFiles: workspace.tabs })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(6, "/api/workspace/layout", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ layout })
    });
  });

  it("fetches, saves, loads, and deletes table state snapshots", async () => {
    const state: TableSnapshotState = {
      display: {
        fullscreen: null,
        popups: [],
        updated_at: "2026-05-13T12:00:00Z"
      },
      map: {
        image_path: null,
        title: null,
        viewport: { center_x: 0.5, center_y: 0.5, zoom: 1 },
        grid: { enabled: false, columns: 10, rows: 10, visible_to_players: false },
        fog_enabled: false,
        reveals: [],
        pins: [],
        presenting: false,
        updated_at: "2026-05-13T12:00:00Z"
      },
      workspace: {
        workspace_id: "default",
        workspace_name: "Default",
        tabs: [],
        activePath: null,
        layout: {
          mode: "single",
          activePaneId: "main",
          panes: [
            { id: "main", activePath: null },
            { id: "secondary", activePath: null }
          ],
          splitRatio: 0.5
        }
      },
      audio: {
        ambient: { track: null, playing: false, loop: true, volume: 0.7 },
        music: { track: null, playing: false, loop: true, volume: 0.7 },
        effect: { track: null, playing: false, loop: false, volume: 0.85 }
      }
    };
    const summary = {
      id: "snapshot-1",
      name: "Before combat",
      updated_at: "2026-05-13T12:00:00Z"
    };
    const snapshot = { ...summary, state };
    const restored = {
      snapshot,
      display: state.display,
      map: state.map,
      workspace: {
        workspaceId: "default",
        workspaceName: "Default",
        tabs: [],
        activePath: null,
        layout: state.workspace.layout,
        favorites: [],
        recentFiles: []
      },
      audio: state.audio
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse([summary]))
      .mockResolvedValueOnce(mockJsonResponse(snapshot))
      .mockResolvedValueOnce(mockJsonResponse(snapshot))
      .mockResolvedValueOnce(mockJsonResponse(restored))
      .mockResolvedValueOnce(mockJsonResponse({ deleted: true }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchTableSnapshots()).resolves.toEqual([summary]);
    await expect(saveTableSnapshot({ name: "Before combat", state })).resolves.toEqual(
      snapshot
    );
    await expect(fetchTableSnapshot("snapshot-1")).resolves.toEqual(snapshot);
    await expect(restoreTableSnapshot("snapshot-1")).resolves.toEqual(restored);
    await expect(deleteTableSnapshot("snapshot-1")).resolves.toEqual({ deleted: true });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/table-snapshots");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/table-snapshots", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Before combat", state })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/table-snapshots/snapshot-1");
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/table-snapshots/snapshot-1/restore", {
      method: "POST"
    });
    expect(fetchMock).toHaveBeenNthCalledWith(5, "/api/table-snapshots/snapshot-1", {
      method: "DELETE"
    });
  });

  it("manages named workspaces", async () => {
    const summaries = [
      {
        id: "default",
        name: "Default",
        is_active: true,
        updated_at: "2026-05-11T12:00:00Z"
      }
    ];
    const workspace: WorkspaceState = {
      workspaceId: "session-2",
      workspaceName: "Session 2",
      tabs: [],
      activePath: null,
      layout: {
        mode: "single",
        activePaneId: "main",
        panes: [
          { id: "main", activePath: null },
          { id: "secondary", activePath: null }
        ],
        splitRatio: 0.5
      },
      favorites: [],
      recentFiles: []
    };
    const renamed = {
      id: "session-2",
      name: "Session Prep",
      is_active: true,
      updated_at: "2026-05-11T12:05:00Z"
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(summaries))
      .mockResolvedValueOnce(mockJsonResponse(workspace))
      .mockResolvedValueOnce(mockJsonResponse(renamed))
      .mockResolvedValueOnce(mockJsonResponse(workspace))
      .mockResolvedValueOnce(mockJsonResponse([{ ...summaries[0] }]));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchWorkspaces()).resolves.toEqual(summaries);
    await expect(createWorkspace("Session 2")).resolves.toEqual(workspace);
    await expect(renameWorkspace("session-2", "Session Prep")).resolves.toEqual(renamed);
    await expect(activateWorkspace("session-2")).resolves.toEqual(workspace);
    await expect(deleteWorkspace("session-2")).resolves.toEqual([{ ...summaries[0] }]);

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/workspaces");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/workspaces", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Session 2" })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/workspaces/session-2", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Session Prep" })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/workspaces/session-2/activate", {
      method: "POST"
    });
    expect(fetchMock).toHaveBeenNthCalledWith(5, "/api/workspaces/session-2", {
      method: "DELETE"
    });
  });

  it("discovers and runs DMS scripts", async () => {
    const scripts = [
      {
        path: "Scripts/hello.dms",
        name: "hello.dms",
        title: "Hello",
        size: 12,
        modified_at: "2026-05-10T12:00:00Z"
      }
    ];
    const run = {
      run_id: "run-1",
      path: "Scripts/hello.dms",
      status: "waiting_for_form",
      form_request: { request_id: "form-0", schema: { name: "text" } },
      outputs: [],
      effects: [],
      stdout: "",
      stderr: "",
      created_at: "2026-05-10T12:00:00Z"
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(mockJsonResponse(scripts))
      .mockResolvedValueOnce(mockJsonResponse(run))
      .mockResolvedValueOnce(mockJsonResponse({ ...run, status: "success", form_request: null }))
      .mockResolvedValueOnce(mockJsonResponse(run))
      .mockResolvedValueOnce(mockJsonResponse({ ...run, status: "cancelled" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchScripts()).resolves.toEqual(scripts);
    await expect(runDmsScript("Scripts/hello.dms")).resolves.toEqual(run);
    await expect(submitDmsForm("run-1", { name: "Ilyra" })).resolves.toMatchObject({
      status: "success"
    });
    await expect(fetchDmsRun("run-1")).resolves.toEqual(run);
    await expect(cancelDmsRun("run-1")).resolves.toMatchObject({ status: "cancelled" });

    expect(fetchMock).toHaveBeenNthCalledWith(1, "/api/scripts");
    expect(fetchMock).toHaveBeenNthCalledWith(2, "/api/scripts/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path: "Scripts/hello.dms" })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(3, "/api/scripts/runs/run-1/form", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values: { name: "Ilyra" } })
    });
    expect(fetchMock).toHaveBeenNthCalledWith(4, "/api/scripts/runs/run-1");
    expect(fetchMock).toHaveBeenNthCalledWith(5, "/api/scripts/runs/run-1/cancel", {
      method: "POST"
    });
  });
});
