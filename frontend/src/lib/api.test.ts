import { afterEach, describe, expect, it, vi } from "vitest";

import {
  buildMediaUrl,
  buildScreenDisplayBackgroundUrl,
  buildScreenMediaUrl,
  rollDice,
  saveWorldFile,
  searchWorld,
  fetchAudioLibrary,
  fetchWorldFile,
  importSystemPack,
  previewSystemPack,
  type SystemPackImportRequest
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

describe("world API helpers", () => {
  it("encodes a world path the way the backend expects", async () => {
    // Real worlds hold names like "D&D 5E #1.pdf" in Cyrillic folders; an unencoded
    // & or # would cut the query short and fetch the wrong file.
    const fetchMock = vi.fn(() => mockJsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);

    await fetchWorldFile("Книги/D&D 5E #1.pdf");

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/world/file?path=%D0%9A%D0%BD%D0%B8%D0%B3%D0%B8%2FD%26D%205E%20%231.pdf"
    );
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
      expected_hash: "old-hash"
    });

    expect(response.backup_path).toContain("README.md");
    expect(fetchMock).toHaveBeenCalledWith("/api/world/file?path=README.md", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content: "# Updated",
        expected_hash: "old-hash"
      })
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
    expect(buildScreenDisplayBackgroundUrl()).toBe("/api/screen/display/background");
    expect(buildScreenDisplayBackgroundUrl("2026-05-08T12:00:00Z")).toBe(
      "/api/screen/display/background?v=2026-05-08T12%3A00%3A00Z"
    );
  });

  it("throws a useful error when a request fails", async () => {
    vi.stubGlobal("fetch", vi.fn(() => mockJsonResponse({ detail: "Nope" }, false, 415)));

    await expect(fetchWorldFile("roll.bin")).rejects.toThrow(
      "Request failed with 415: /api/world/file?path=roll.bin"
    );
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

  it("posts system pack preview requests as multipart form data", async () => {
    const responseBody = {
      rows: [
        {
          id: "ready:README.md",
          source_path: "README.md",
          target_path: "README.md",
          status: "ready"
        }
      ],
      counts: { ready: 1, conflict: 0, skipped: 0, invalid: 0 }
    };
    const file = new File(["pack"], "starter.zip", { type: "application/zip" });
    const fetchMock = vi.fn(() => mockJsonResponse(responseBody));
    vi.stubGlobal("fetch", fetchMock);

    await expect(previewSystemPack(file)).resolves.toEqual(responseBody);

    const [path, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe("/api/system-packs/preview");
    expect(init).toMatchObject({ method: "POST" });
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("pack")).toBe(file);
  });

  it("posts system pack import requests with conflict decisions as multipart form data", async () => {
    const responseBody = {
      imported: 1,
      overwritten: 1,
      renamed: 1,
      skipped: 0,
      failed: 0,
      files: [
        { source_path: "README.md", target_path: "README.md", status: "imported" },
        { source_path: "NPCs/Ilyra.md", target_path: "NPCs/Ilyra Pack.md", status: "renamed" }
      ]
    };
    const file = new File(["pack"], "starter.zip", { type: "application/zip" });
    const payload: SystemPackImportRequest = {
      file,
      decisions: [
        {
          target_path: "NPCs/Ilyra.md",
          decision: "rename",
          rename_target_path: "NPCs/Ilyra Pack.md"
        }
      ]
    };
    const fetchMock = vi.fn(() => mockJsonResponse(responseBody));
    vi.stubGlobal("fetch", fetchMock);

    await expect(importSystemPack(payload)).resolves.toEqual(responseBody);

    const [path, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit];
    expect(path).toBe("/api/system-packs/import");
    expect(init).toMatchObject({ method: "POST" });
    expect(init.headers).toBeUndefined();
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("pack")).toBe(file);
    expect((init.body as FormData).get("decisions")).toBe(
      JSON.stringify(payload.decisions)
    );
  });

  it("surfaces dice validation details", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        await mockJsonResponse({ detail: "Dice expression must look like 1d20+3." }, false, 400)
      );
    vi.stubGlobal("fetch", fetchMock);

    await expect(rollDice("nope")).rejects.toThrow("Dice expression must look like 1d20+3.");
  });

});
