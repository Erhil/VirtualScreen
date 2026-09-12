import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  copySampleWorldSeed,
  removeWorldPath,
  resetWorldDirectory
} from "./world-fixtures";

export const currentDir = dirname(fileURLToPath(import.meta.url));
export const repoRoot = resolve(currentDir, "../..");
export const sampleWorld = resolve(repoRoot, "sample-world");
export const e2eWorldsRoot = resolve(repoRoot, ".virtualscreen", "e2e-worlds");
export const e2eWorld = resolve(e2eWorldsRoot, "E2E World");
export const sideWorld = resolve(e2eWorldsRoot, "Side World");
export const tinyGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");
export const tinyMp3 = Buffer.from("SUQzAwAAAAAA", "base64");
export const tinyMp4 = Buffer.from("AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQ==", "base64");
export const tinyOgg = Buffer.from("T2dnUwACAAAA", "base64");
export const tinyPdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
export const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);
export const tinyWav = Buffer.from("UklGRgAAAABXQVZF", "base64");

export function resetE2eWorld() {
  mkdirSync(e2eWorldsRoot, { recursive: true });
  for (const entry of readdirSync(e2eWorldsRoot)) {
    if (entry !== "E2E World" && entry !== "Side World") {
      removeWorldPath(resolve(e2eWorldsRoot, entry));
    }
  }
  resetWorldDirectory(e2eWorld);
  copySampleWorldSeed(sampleWorld, e2eWorld);
  writeFileSync(resolve(e2eWorld, "Media", "animated-map.gif"), tinyGif);
  writeFileSync(resolve(e2eWorld, "Media", "animated-map.mp4"), tinyMp4);
  mkdirSync(resolve(e2eWorld, "Docs"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Cards"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Notes"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Saved"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Tables"), { recursive: true });
  writeFileSync(
    resolve(e2eWorld, "Cards", "Moonlit Key.cs"),
    JSON.stringify(
      {
        version: 1,
        title: "Moonlit Key",
        kind: "Artifact",
        tags: ["e2e-card", "moonlit"],
        fields: [
          {
            name: "Hook",
            value: "The amber spindle phrase is carved under the key."
          },
          {
            name: "Owner",
            value: "[[NPCs/Captain Ilyra]]"
          }
        ]
      },
      null,
      2
    ),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Cards", "Broken Card.cs"),
    "{\n  \"title\": \"Broken Card\",\n  \"kind\": \"Clue\",\n",
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Notes", "link-source.md"),
    "# Link Source\n\nPeek [[../NPCs/Captain Ilyra]] or [the note](link-target.md).\n",
    "utf-8"
  );
  writeFileSync(resolve(e2eWorld, "Notes", "link-target.md"), "# Link Target\n", "utf-8");
  writeFileSync(
    resolve(e2eWorld, "Tables", "dms-events.csv"),
    "result,event,tone\n1,River Gate,warm\n",
    "utf-8"
  );
  writeFileSync(resolve(e2eWorld, "Docs", "session-handout.pdf"), tinyPdf);
  mkdirSync(resolve(e2eWorld, ".music", "ambient", "Tavern"), { recursive: true });
  mkdirSync(resolve(e2eWorld, ".music", "music", "Bard"), { recursive: true });
  mkdirSync(resolve(e2eWorld, ".music", "effects"), { recursive: true });
  mkdirSync(resolve(e2eWorld, ".virtualscreen", "card-templates"), {
    recursive: true
  });
  writeFileSync(
    resolve(e2eWorld, ".virtualscreen", "card-templates", "npc-contact.json"),
    JSON.stringify(
      {
        id: "npc-contact",
        name: "NPC Contact",
        kind: "npc",
        description: "Compact NPC contact card for live table use.",
        card: {
          kind: "npc",
          title: "{{title}}",
          tags: ["npc", "contact"],
          sections: [
            {
              title: "Core",
              fields: {
                Role: "",
                Location: "",
                Need: "world-local-template-hidden-token",
                Leverage: ""
              }
            }
          ]
        }
      },
      null,
      2
    ),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, ".virtualscreen", "card-templates", "basic-character-v2.json"),
    JSON.stringify(
      {
        id: "basic-character-v2",
        name: "Basic Character Sheet V2",
        kind: "character",
        description: "Concise V2 character sheet with grid stats and an attacks table.",
        card: {
          kind: "character",
          title: "{{title}}",
          tags: ["character", "v2"],
          sections: [
            {
              title: "Identity",
              layout: "grid",
              fields: {
                Player: { type: "text", value: "" },
                Class: { type: "text", value: "" },
                Level: { type: "number", value: 1 },
                "Home Base": { type: "world_link", value: "[[README]]" }
              }
            },
            {
              title: "Abilities",
              layout: "grid",
              fields: {
                STR: { type: "number", value: 10 },
                DEX: { type: "number", value: 10 },
                CON: { type: "number", value: 10 },
                WIS: { type: "number", value: 10 }
              }
            },
            {
              title: "Attacks",
              layout: "table",
              rows: [{ Name: "", Bonus: "", Damage: "" }]
            }
          ]
        }
      },
      null,
      2
    ),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, ".virtualscreen", "card-templates", "computed-character-v1.json"),
    JSON.stringify(
      {
        id: "computed-character-v1",
        name: "Computed Character Sheet",
        kind: "character",
        description: "Character card with safe display-only computed bonuses.",
        card: {
          kind: "character",
          title: "{{title}}",
          tags: ["character", "computed"],
          sections: [
            {
              title: "Identity",
              layout: "grid",
              fields: {
                Player: { type: "text", value: "" },
                Class: { type: "text", value: "" },
                "Home Base": { type: "world_link", value: "[[README]]" }
              }
            },
            {
              title: "Abilities",
              layout: "grid",
              fields: {
                STR: { type: "number", value: 10 },
                WIS: { type: "number", value: 16 },
                Perception_flag: { type: "boolean", value: true },
                "WIS Bonus": {
                  type: "computed",
                  formula: "ability_mod(WIS)",
                  format: "signed"
                },
                Perception_bonus: {
                  type: "computed",
                  formula: "ability_mod(WIS) + Perception_flag * 3",
                  format: "signed"
                },
                "STR Plus Three": { type: "computed", formula: "STR + 3" }
              }
            }
          ]
        }
      },
      null,
      2
    ),
    "utf-8"
  );
  writeFileSync(resolve(e2eWorld, ".music", "ambient", "Tavern", "tavern-crowd.mp3"), tinyMp3);
  for (let index = 1; index <= 12; index += 1) {
    writeFileSync(
      resolve(e2eWorld, ".music", "ambient", "Tavern", `tavern-crowd-${index}.mp3`),
      tinyMp3
    );
  }
  writeFileSync(resolve(e2eWorld, ".music", "music", "Bard", "bard-song.ogg"), tinyOgg);
  writeFileSync(resolve(e2eWorld, ".music", "effects", "broken-glass.wav"), tinyWav);
  mkdirSync(resolve(e2eWorld, "Scripts"), { recursive: true });
  writeFileSync(
    resolve(e2eWorld, "Scripts", "effects_demo.dms"),
    [
      "screen_fs('Media/sample-map.svg')",
      "screen_pu('README.md')",
      "audio_play('.music/effects/broken-glass.wav')"
    ].join("\n"),
    "utf-8"
  );
  writeFileSync(resolve(e2eWorld, "Scripts", "slow_cancel.dms"), "import time\ntime.sleep(10)\n", "utf-8");
  writeFileSync(resolve(e2eWorld, "Scripts", "syntax_error.dms"), "render_md('# Before')\nif True\n", "utf-8");
  writeFileSync(
    resolve(e2eWorld, "Scripts", "choose_file_demo.dms"),
    "target = choose_file('Pick a page')\nrender_md(f'# Selected\\n{target}')\n",
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Scripts", "core_commands.dms"),
    [
      "row = table('Tables/dms-events.csv')",
      "value = roll('1d1+2')",
      "render_md(f'# Core Commands\\n{row[\"event\"]}\\n{value}')"
    ].join("\n"),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Scripts", "write_notes.dms"),
    [
      "create_note('Notes/generated-session.md', '# Generated Session')",
      "append_note('README.md', '\\n\\nDMS appended note')",
      "render_md('# Writes Done')"
    ].join("\n"),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Scripts", "create_card_success.dms"),
    [
      "card = card_template('npc', 'DMS Quartermaster')",
      "card['tags'].append('dms-card')",
      "card['sections'][0]['fields']['Hook'] = 'Tracks the silver crate ledger.'",
      "create_card('Cards/DMS Quartermaster.cs', card)"
    ].join("\n"),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Scripts", "create_card_fail.dms"),
    [
      "create_card('Cards/Failed DMS Card.cs', card_template('npc', 'Failed DMS Card'))",
      "raise RuntimeError('card write should roll back')"
    ].join("\n"),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Scripts", "create_computed_card.dms"),
    [
      "card = card_template('computed-character-v1', 'DMS Computed Sentinel')",
      "card['sections'][0]['fields']['Player']['value'] = 'Ilyra'",
      "card['sections'][0]['fields']['Class']['value'] = 'Watcher'",
      "card['sections'][1]['fields']['WIS']['value'] = 18",
      "card['sections'][1]['fields']['Perception_flag']['value'] = False",
      "create_card('Cards/DMS Computed Sentinel.cs', card)"
    ].join("\n"),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Scripts", "map_preset_demo.dms"),
    "map_preset('Session setup', present=True)\nmap_fog(True)\n",
    "utf-8"
  );
  resetWorldDirectory(sideWorld);
  writeFileSync(resolve(sideWorld, "README.md"), "# Side World Home\n", "utf-8");
}

export function useE2eWorld() {
  test.beforeEach(async ({ request }) => {
    resetE2eWorld();
    // Asserted, not fired and forgotten: when one of these does not reach the backend the
    // world is never reopened and the index keeps whatever the last run left, and the test
    // then fails somewhere far away. Both have silently failed through a proxy hiccup.
    const opened = await request.post("/api/worlds/open", {
      data: { id: "E2E World" }
    });
    expect(opened.ok()).toBeTruthy();
    const rebuilt = await request.post("/api/index/rebuild");
    expect(rebuilt.ok()).toBeTruthy();
    const workspacesResponse = await request.get("/api/workspaces");
    if (workspacesResponse.ok()) {
      const workspaces = (await workspacesResponse.json()) as Array<{ id: string; name: string }>;
      const defaultWorkspace = workspaces.find((workspace) => workspace.name === "Default");
      if (defaultWorkspace) {
        await request.post(`/api/workspaces/${encodeURIComponent(defaultWorkspace.id)}/activate`);
      }
      for (const workspace of workspaces) {
        if (workspace.name !== "Default") {
          await request.delete(`/api/workspaces/${encodeURIComponent(workspace.id)}`);
        }
      }
    }
    // Not an arbitrary settle time. resetE2eWorld has just rewritten the whole world, and
    // the backend's watcher reacts to that 500ms after the last write (awatch debounce in
    // core/watcher.py) with a full rebuild of its own. Waiting it out here means that
    // rebuild lands before the test starts instead of partway through it, where it reads
    // - and on Windows holds open - the very files the test is about to change. Removing
    // this looks like a free 100 seconds per run and is not.
    await new Promise((resolveDelay) => setTimeout(resolveDelay, 750));
    await request.put("/api/workspace/tabs", {
      data: { tabs: [], activePath: null }
    });
    await request.put("/api/workspace/layout", {
      data: {
        layout: {
          mode: "single",
          activePaneId: "main",
          panes: [
            { id: "main", activePath: null },
            { id: "secondary", activePath: null }
          ],
          splitRatio: 0.5
        }
      }
    });
    await request.put("/api/workspace/favorites", {
      data: { favorites: [] }
    });
    await request.put("/api/workspace/recent", {
      data: { recentFiles: [] }
    });
    await request.put("/api/workspace/hp", {
      data: { rows: [] }
    });
    await request.put("/api/fast-slots", {
      data: { slots: [] }
    });
    await request.post("/api/display/blank");
    const mapStateResponse = await request.get("/api/map/state");
    if (mapStateResponse.ok()) {
      const mapState = await mapStateResponse.json();
      await request.post("/api/map/stop");
      await request.delete("/api/map/reveals");
      await request.put("/api/map/fog", { data: { enabled: false } });
      await request.put("/api/map/grid", {
        data: { enabled: false, columns: 10, rows: 10, visible_to_players: true }
      });
      for (const pin of mapState.pins ?? []) {
        await request.delete(`/api/map/pins/${encodeURIComponent(pin.id)}`);
      }
    }
    const mapPresetsResponse = await request.get("/api/map/presets");
    if (mapPresetsResponse.ok()) {
      const { presets } = await mapPresetsResponse.json();
      for (const preset of presets ?? []) {
        await request.delete(`/api/map/presets/${encodeURIComponent(preset.id)}`);
      }
    }
  });
}

export function worldTree(page: Page) {
  return page.getByRole("navigation", { name: "World files" });
}

export async function ensureTreeFolderOpen(page: Page, folder: string) {
  const folderButton = worldTree(page).getByRole("button", { name: folder, exact: true });
  await expect(folderButton).toBeVisible();
  if ((await folderButton.getAttribute("aria-expanded")) !== "true") {
    await folderButton.click();
  }
}

export async function openTreeFile(page: Page, fileName: string | RegExp, folder?: string) {
  const fileButton = worldTree(page).getByRole("button", {
    name: typeof fileName === "string" ? new RegExp(fileName) : fileName
  });
  if (folder) {
    try {
      await expect(fileButton).toBeVisible({ timeout: 1000 });
    } catch {
      // A collapsed folder keeps its children out of the DOM.
      await ensureTreeFolderOpen(page, folder);
      await expect(fileButton).toBeVisible();
    }
  } else {
    await expect(fileButton).toBeVisible();
  }
  await fileButton.click();
}

export async function openPdfFixture(page: Page) {
  await openTreeFile(page, /session-handout/, "Docs");
}

export function captainTreeButton(page: Page) {
  return worldTree(page).getByRole("button", { name: /Captain Ilyra Captain Ilyra\.md/ });
}

export async function openNotesFile(page: Page, fileName: string) {
  await openTreeFile(page, fileName, "Notes");
}

export async function openCardsFile(page: Page, fileName: string) {
  await openTreeFile(page, fileName, "Cards");
}

export async function openScriptsFile(page: Page, fileName: string) {
  await openTreeFile(page, fileName, "Scripts");
}

export function toolsPanel(page: Page) {
  return page.getByRole("complementary", { name: "DM Tools" });
}

export function workspaceControls(page: Page) {
  return page.getByRole("region", { name: "Workspace controls" });
}

export async function openToolSection(
  page: Page,
  name:
    | "Metadata"
    | "Screen"
    | "Audio"
    | "Actions"
    | "Scripts"
    | "HP"
) {
  const button = toolsPanel(page).getByRole("button", { name: new RegExp(`^${name}`) });
  if ((await button.getAttribute("aria-expanded")) === "true") {
    return;
  }
  await button.click();
  try {
    await expect(button).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
    return;
  } catch {
    if ((await button.getAttribute("aria-expanded")) !== "true") {
      await button.click();
    }
  }
  await expect(button).toHaveAttribute("aria-expanded", "true");
}

export async function searchTool(page: Page) {
  const existing = page.getByRole("region", { name: "Global Search" });
  if ((await existing.count()) > 0 && await existing.isVisible()) {
    return existing;
  }
  await workspaceControls(page).getByRole("button", { name: "Search" }).click();
  return existing;
}

export async function quickCaptureTool(page: Page) {
  const existing = page.getByRole("region", { name: "Capture" });
  if ((await existing.count()) > 0 && await existing.isVisible()) {
    return existing;
  }
  await workspaceControls(page).getByRole("button", { name: "Capture" }).click();
  await expect(existing).toBeVisible();
  return existing;
}

export async function chooseCaptureCategory(capture: Locator, label: string) {
  await capture.getByRole("button", { name: label, exact: true }).click();
}

export async function hpTool(page: Page) {
  await openToolSection(page, "HP");
  return toolsPanel(page).getByRole("region", { name: "HP Scratchpad" });
}

export function metadataTool(page: Page) {
  return toolsPanel(page).locator(".metadata-tool");
}

export async function screenTool(page: Page) {
  await openToolSection(page, "Screen");
  const screen = toolsPanel(page).getByRole("region", { name: "Screen Control" });
  await screen.getByRole("tab", { name: "Display" }).click();
  return screen;
}

export async function mapTool(page: Page) {
  await openToolSection(page, "Screen");
  const screen = toolsPanel(page).getByRole("region", { name: "Screen Control" });
  await screen.getByRole("tab", { name: "Map" }).click();
  return toolsPanel(page).getByRole("region", { name: "Map Control" });
}

export async function audioTool(page: Page) {
  await openToolSection(page, "Audio");
  return toolsPanel(page).getByRole("region", { name: "Audio Control" });
}

export async function fillCodeEditor(page: Page, name: string | RegExp, value: string) {
  const editor = page.getByRole("textbox", { name });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(value);
}

export async function enterEditMode(page: Page) {
  await expect(page.getByRole("region", { name: "Document status" })).toBeVisible();
  const mainPane = page.getByRole("region", { name: "Main viewer pane" });
  const previewTarget = mainPane
    .locator(".markdown-viewer, .card-surface, .table-wrap, .text-viewer, h1, h2, p, pre, td, th, article, table")
    .first();
  if (
    await previewTarget
      .waitFor({ state: "visible", timeout: 5_000 })
      .then(() => true)
      .catch(() => false)
  ) {
    await previewTarget.dblclick({ position: { x: 8, y: 8 } });
  } else {
    await page.getByRole("region", { name: "Document status" }).dblclick();
  }
  await expect(page.getByRole("region", { name: "Document status" })).toContainText("Editing");
}

export async function saveActiveDraft(page: Page) {
  await page.keyboard.press("ControlOrMeta+S");
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);
}

export async function toggleMarkdownSplit(page: Page) {
  await page.keyboard.press("ControlOrMeta+Backslash");
}

export async function previewCleanDraft(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Document status" })).toContainText("Preview");
}

export async function revertDirtyDraft(page: Page) {
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Discard unsaved changes");
    await dialog.accept();
  });
  await page.keyboard.press("Shift+Escape");
  await expect(page.getByRole("region", { name: "Document status" })).toContainText("Preview");
}

export async function runActiveScript(page: Page) {
  await page
    .getByRole("region", { name: "Document status" })
    .getByRole("button", { name: "Run Active Script", exact: true })
    .click();
  await confirmDmsTrustIfVisible(page);
}

export async function confirmDmsTrustIfVisible(page: Page, expectedPath?: string) {
  const dialog = page.getByRole("dialog", { name: "Trust DMS Scripts" });
  if (
    !(await dialog
      .waitFor({ state: "visible", timeout: 1000 })
      .then(() => true)
      .catch(() => false))
  ) {
    return;
  }
  await expect(dialog).toContainText("DMS scripts are trusted local Python run by the backend.");
  if (expectedPath) {
    await expect(dialog.getByText(expectedPath, { exact: true })).toBeVisible();
  }
  await dialog.getByRole("button", { name: "Trust and Run Script" }).click();
  await expect(dialog).toBeHidden();
}

export async function chooseCodeCompletion(page: Page, label: string | RegExp) {
  const option = page.locator(".cm-tooltip-autocomplete li", { hasText: label }).first();
  await expect(option).toBeVisible();
  await option.click();
}

export async function gotoWorkspace(page: Page) {
  const workspacesLoaded = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().endsWith("/api/workspaces") &&
      response.ok()
  );
  await page.goto("/");
  await workspacesLoaded;
}

export async function expectWorkspaceActivePath(page: Page, expectedPath: string) {
  await expect
    .poll(
      async () => {
        const response = await page.request.get("/api/workspace");
        if (!response.ok()) {
          return null;
        }
        const workspace = (await response.json()) as { activePath: string | null };
        return workspace.activePath;
      },
      { timeout: 5000 }
    )
    .toBe(expectedPath);
}

export async function expectViewportFilling(page: Page, selector: string) {
  const locator = page.locator(selector);
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box?.width ?? 0).toBeGreaterThan((viewport?.width ?? 0) * 0.9);
  expect(box?.height ?? 0).toBeGreaterThan((viewport?.height ?? 0) * 0.9);
}

export function screenPathUrl(route: string, path: string) {
  return `${route}?path=${encodeURIComponent(path)}`;
}

export async function mapCanvasPoint(map: Locator, xRatio: number, yRatio: number) {
  const stage = map.locator(".map-canvas-stage");
  const world = map.locator(".map-canvas-world");
  await stage.scrollIntoViewIfNeeded();
  const stageBox = await stage.boundingBox();
  const worldBox = await world.boundingBox();
  expect(stageBox).not.toBeNull();
  expect(worldBox).not.toBeNull();
  if (!stageBox || !worldBox) {
    throw new Error("Map canvas is not ready.");
  }
  return {
    x: worldBox.x - stageBox.x + worldBox.width * xRatio,
    y: worldBox.y - stageBox.y + worldBox.height * yRatio
  };
}

export async function clickMapCanvas(map: Locator, xRatio: number, yRatio: number) {
  const stage = map.locator(".map-canvas-stage");
  await stage.click({ position: await mapCanvasPoint(map, xRatio, yRatio) });
}

export async function dragMapCanvas(
  map: Locator,
  startXRatio: number,
  startYRatio: number,
  endXRatio: number,
  endYRatio: number
) {
  const stage = map.locator(".map-canvas-stage");
  await stage.dragTo(stage, {
    sourcePosition: await mapCanvasPoint(map, startXRatio, startYRatio),
    targetPosition: await mapCanvasPoint(map, endXRatio, endYRatio)
  });
}
