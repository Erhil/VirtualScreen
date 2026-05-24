import { expect, test } from "@playwright/test";
import type { APIRequestContext, Locator, Page, Route } from "@playwright/test";
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  copySampleWorldSeed,
  createSystemPackArchive,
  resetWorldDirectory
} from "./world-fixtures";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../..");
const sampleWorld = resolve(repoRoot, "sample-world");
const e2eWorldsRoot = resolve(repoRoot, ".virtualscreen", "e2e-worlds");
const e2eWorld = resolve(e2eWorldsRoot, "E2E World");
const sideWorld = resolve(e2eWorldsRoot, "Side World");
const packDir = resolve(e2eWorldsRoot, "packs");
const tinyMp3 = Buffer.from("SUQzAwAAAAAA", "base64");
const tinyOgg = Buffer.from("T2dnUwACAAAA", "base64");
const tinyWav = Buffer.from("UklGRgAAAABXQVZF", "base64");

function resetE2eWorld() {
  mkdirSync(e2eWorldsRoot, { recursive: true });
  for (const entry of readdirSync(e2eWorldsRoot)) {
    if (entry !== "E2E World" && entry !== "Side World") {
      rmSync(resolve(e2eWorldsRoot, entry), { force: true, recursive: true });
    }
  }

  resetWorldDirectory(e2eWorld);
  copySampleWorldSeed(sampleWorld, e2eWorld);
  mkdirSync(resolve(e2eWorld, "Cards"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Notes"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Scripts"), { recursive: true });
  mkdirSync(resolve(e2eWorld, ".music", "ambient", "Tavern"), { recursive: true });
  mkdirSync(resolve(e2eWorld, ".music", "music", "Bard"), { recursive: true });
  mkdirSync(resolve(e2eWorld, ".music", "effects"), { recursive: true });
  mkdirSync(resolve(e2eWorld, ".virtualscreen", "scenarios", "create-npc"), {
    recursive: true
  });

  writeFileSync(resolve(e2eWorld, ".music", "ambient", "Tavern", "tavern-crowd.mp3"), tinyMp3);
  writeFileSync(resolve(e2eWorld, ".music", "music", "Bard", "bard-song.ogg"), tinyOgg);
  writeFileSync(resolve(e2eWorld, ".music", "effects", "broken-glass.wav"), tinyWav);
  writeFileSync(
    resolve(e2eWorld, "Scripts", "trust_gate.dms"),
    "render_md('# Trusted Gate Output')\n",
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, ".virtualscreen", "scenarios", "create-npc", "scenario.json"),
    JSON.stringify({
      id: "create-npc",
      name: "Create NPC",
      description: "Legacy scenario fixture for release regression tests.",
      script: "main.py",
      timeout_seconds: 5,
      output_kind: "markdown",
      inputs: [
        {
          name: "name",
          label: "Name",
          input_type: "text",
          required: true,
          default: "Ilyra",
          options: []
        }
      ]
    }),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, ".virtualscreen", "scenarios", "create-npc", "main.py"),
    "import json, sys\ninputs = json.load(sys.stdin)\nprint('# ' + inputs.get('name', 'NPC'))\n",
    "utf-8"
  );

  for (let index = 1; index <= 12; index += 1) {
    const padded = String(index).padStart(2, "0");
    writeFileSync(
      resolve(e2eWorld, "Notes", `overflow-tab-${padded}-very-long-session-reference.md`),
      `# Overflow Tab ${padded}\n\nLong tab fixture ${padded}.\n`,
      "utf-8"
    );
  }

  resetWorldDirectory(sideWorld);
  writeFileSync(resolve(sideWorld, "README.md"), "# Side World Home\n", "utf-8");
}

async function resetRuntimeState(request: APIRequestContext) {
  resetE2eWorld();
  await request.post("/api/worlds/open", { data: { id: "E2E World" } });
  await request.post("/api/index/rebuild");
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
  await request.put("/api/workspace/favorites", { data: { favorites: [] } });
  await request.put("/api/workspace/recent", { data: { recentFiles: [] } });
  await request.put("/api/fast-slots", { data: { slots: [] } });
  await request.put("/api/audio/playlists", { data: { playlists: [] } });
  await request.post("/api/display/blank");
  await request.post("/api/map/stop");
  await request.delete("/api/map/reveals");
  await request.put("/api/map/fog", { data: { enabled: false } });
  await request.put("/api/map/grid", {
    data: { enabled: false, columns: 10, rows: 10, visible_to_players: true }
  });

  const mapStateResponse = await request.get("/api/map/state");
  if (mapStateResponse.ok()) {
    const mapState = await mapStateResponse.json();
    for (const pin of mapState.pins ?? []) {
      await request.delete(`/api/map/pins/${encodeURIComponent(pin.id)}`);
    }
  }
}

test.beforeEach(async ({ request }) => {
  await resetRuntimeState(request);
});

function worldTree(page: Page) {
  return page.getByRole("navigation", { name: "World files" });
}

function toolsPanel(page: Page) {
  return page.getByRole("complementary", { name: "DM Tools" });
}

async function openToolSection(
  page: Page,
  name: "Actions" | "Assistant" | "Audio" | "Screen" | "Scripts"
) {
  const button = toolsPanel(page).getByRole("button", { name: new RegExp(`^${name}`) });
  if ((await button.getAttribute("aria-expanded")) !== "true") {
    await button.click();
  }
  await expect(button).toHaveAttribute("aria-expanded", "true");
}

async function screenTool(page: Page) {
  await openToolSection(page, "Screen");
  const screen = toolsPanel(page).getByRole("region", { name: "Screen Control" });
  await screen.getByRole("tab", { name: "Display" }).click();
  return screen;
}

async function mapTool(page: Page) {
  await openToolSection(page, "Screen");
  const screen = toolsPanel(page).getByRole("region", { name: "Screen Control" });
  await screen.getByRole("tab", { name: "Map" }).click();
  return toolsPanel(page).getByRole("region", { name: "Map Control" });
}

async function audioTool(page: Page) {
  await openToolSection(page, "Audio");
  return toolsPanel(page).getByRole("region", { name: "Audio Control" });
}

async function actionsTool(page: Page) {
  await openToolSection(page, "Actions");
  return toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
}

async function scriptsTool(page: Page) {
  await openToolSection(page, "Scripts");
  return toolsPanel(page).getByRole("region", { name: "DMS Scripts" });
}

async function assistantTool(page: Page) {
  await openToolSection(page, "Assistant");
  return toolsPanel(page).getByRole("region", { name: "Assistant" });
}

async function openWorldFile(page: Page, fileName: string | RegExp, folder?: string) {
  const fileButton = worldTree(page).getByRole("button", { name: fileName });
  try {
    await expect(fileButton).toBeVisible({ timeout: 1000 });
  } catch {
    if (folder) {
      const folderButton = worldTree(page).getByRole("button", { name: folder, exact: true });
      if ((await folderButton.count()) > 0) {
        await folderButton.click();
      }
    }
    await expect(fileButton).toBeVisible();
  }
  await fileButton.click();
}

async function presentSampleMap(page: Page) {
  await openWorldFile(page, /sample-map/, "Media");
  const map = await mapTool(page);
  await map.getByRole("button", { name: "Use Active Image" }).click();
  await expect(map.locator(".map-canvas-dm img")).toBeVisible();
  await map.getByRole("button", { name: "Present Map" }).click();
  await expect(map.getByRole("button", { name: "Stop Map" })).toBeEnabled();
  return map;
}

async function fillCodeEditor(page: Page, name: string | RegExp, value: string) {
  const editor = page.getByRole("textbox", { name });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(value);
}

async function enterEditMode(page: Page) {
  const mainPane = page.getByRole("region", { name: "Main viewer pane" });
  await mainPane.locator(".markdown-viewer, .text-viewer, .code-editor, h1, p").first().dblclick({
    position: { x: 8, y: 8 }
  });
  await expect(page.getByRole("region", { name: "Document status" })).toContainText("Editing");
}

test("Ctrl+S saves focused editor content and dirty tab close requires confirmation", async ({
  page
}) => {
  await page.goto("/");
  await openWorldFile(page, /Sample World Guide/);
  await enterEditMode(page);

  await fillCodeEditor(page, "Markdown editor", "# Ctrl Save Regression\n\nSaved from focused editor.");
  await page.keyboard.press("ControlOrMeta+S");
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Ctrl Save Regression" })).toBeVisible();

  await enterEditMode(page);
  await fillCodeEditor(page, "Markdown editor", "# Unsaved Close Guard\n\nDo not lose this silently.");
  await expect(page.getByRole("tab", { name: /Sample World Guide \*/ })).toBeVisible();

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("without saving changes");
    await dialog.dismiss();
  });
  await page.getByRole("button", { name: "Close README.md" }).click();
  await expect(page.getByRole("tab", { name: /Sample World Guide \*/ })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Markdown editor" })).toContainText(
    "Unsaved Close Guard"
  );

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("without saving changes");
    await dialog.accept();
  });
  await page.getByRole("button", { name: "Close README.md" }).click();
  await expect(page.getByRole("tab", { name: /Sample World Guide/ })).toBeHidden();
});

test("middle-click dirty tab close uses the same discard confirmation", async ({ page }) => {
  await page.goto("/");
  await openWorldFile(page, /Sample World Guide/);
  await enterEditMode(page);
  await fillCodeEditor(page, "Markdown editor", "# Dirty Middle Click\n\nKeep this draft.");

  const tab = page.getByRole("tab", { name: /Sample World Guide \*/ });
  await expect(tab).toBeVisible();
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("without saving changes");
    await dialog.dismiss();
  });
  await tab.click({ button: "middle" });
  await expect(page.getByRole("tab", { name: /Sample World Guide \*/ })).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Markdown editor" })).toContainText(
    "Dirty Middle Click"
  );

  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("without saving changes");
    await dialog.accept();
  });
  await tab.click({ button: "middle" });
  await expect(page.getByRole("tab", { name: /Sample World Guide/ })).toBeHidden();
});

async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Settings" }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function switchToRussian(page: Page) {
  const dialog = await openSettings(page);
  await dialog.getByLabel("Language").selectOption("ru");
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
}

async function mockAssistantApi(page: Page) {
  const card = {
    version: 1,
    title: "Assistant Card Regression",
    kind: "NPC",
    fields: [{ name: "Hook", value: "Saved from explicit assistant output." }]
  };
  await page.route("**/api/llm/config", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        enabled: true,
        configured: true,
        provider: "mock",
        base_url: "http://127.0.0.1/mock",
        model: "mock-assistant-model",
        max_input_chars: 10000,
        max_output_tokens: 1000,
        temperature: 0.2,
        timeout_seconds: 5
      }
    });
  });
  await page.route("**/api/llm/generate", async (route: Route) => {
    await route.fulfill({
      contentType: "application/json",
      json: {
        text: JSON.stringify(card, null, 2),
        provider: "mock",
        model: "mock-assistant-model",
        created_at: "2026-05-22T00:00:00Z",
        usage: null
      }
    });
  });
}

test("screen blank clears presented map and visible popups", async ({ context, page }) => {
  const player = await context.newPage();
  await player.goto("/screen");
  await page.goto("/");

  await presentSampleMap(page);
  await openWorldFile(page, /Captain Ilyra/, "NPCs");
  const controls = await screenTool(page);
  await controls.getByLabel("Popup preset").selectOption("letter");
  await controls.getByRole("button", { name: "Open Active as Popup" }).click();
  await expect(player.locator(".screen-map")).toBeVisible();
  await expect(player.getByRole("region", { name: "Popup Captain Ilyra" })).toBeVisible();

  await controls.getByRole("button", { name: "Blank Screen" }).click();

  await expect(player.locator(".screen-fullscreen-blank")).toBeVisible();
  await expect(player.locator(".screen-map")).toBeHidden();
  await expect(player.getByRole("region", { name: "Popup Captain Ilyra" })).toHaveCount(0);
});

test("screen fullscreen replaces a presented map as the primary surface", async ({
  context,
  page
}) => {
  const player = await context.newPage();
  await player.goto("/screen");
  await page.goto("/");

  await presentSampleMap(page);
  await openWorldFile(page, /README\.md|Sample World Guide/);
  const controls = await screenTool(page);
  await controls.getByRole("button", { name: "Show Active Fullscreen" }).click();

  await expect(player.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
  await expect(player.locator(".screen-map")).toBeHidden();
});

test("screen map can replace fullscreen while keeping a visible popup", async ({ context, page }) => {
  const player = await context.newPage();
  await player.goto("/screen");
  await page.goto("/");

  await openWorldFile(page, /README\.md|Sample World Guide/);
  let controls = await screenTool(page);
  await controls.getByRole("button", { name: "Show Active Fullscreen" }).click();
  await expect(player.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();

  await presentSampleMap(page);
  await expect(player.locator(".screen-map")).toBeVisible();
  await expect(player.getByRole("heading", { name: "Sample World Guide" })).toHaveCount(0);

  await openWorldFile(page, /Captain Ilyra/, "NPCs");
  controls = await screenTool(page);
  await controls.getByRole("button", { name: "Open Active as Popup" }).click();

  await expect(player.locator(".screen-map")).toBeVisible();
  await expect(player.getByRole("region", { name: "Popup Captain Ilyra" })).toBeVisible();
});

test("Search Escape closes the dialog and restores focus to Search", async ({ page }) => {
  await page.goto("/");

  const searchButton = page.getByRole("button", { name: "Search" });
  await searchButton.click();
  const dialog = page.getByRole("dialog", { name: "Global Search" });
  const input = dialog.getByRole("searchbox", { name: "Search World" });
  await expect(input).toBeFocused();

  await input.fill("Ilyra");
  await page.keyboard.press("Escape");

  await expect(dialog).toHaveCount(0);
  await expect(searchButton).toBeFocused();
});

test("Search close button restores focus to Search", async ({ page }) => {
  await page.goto("/");

  const searchButton = page.getByRole("button", { name: "Search" });
  await searchButton.click();
  const dialog = page.getByRole("dialog", { name: "Global Search" });
  await expect(dialog.getByRole("searchbox", { name: "Search World" })).toBeFocused();

  await dialog.getByRole("button", { name: "Close Search" }).click();

  await expect(dialog).toHaveCount(0);
  await expect(searchButton).toBeFocused();
});

test("DMS run flow has a trust gate and labels scripts as DMS", async ({ page }) => {
  await page.goto("/");

  await openWorldFile(page, /trust_gate\.dms/, "Scripts");
  await page
    .getByRole("region", { name: "Document status" })
    .getByRole("button", { name: "Run Active Script", exact: true })
    .click();

  const trust = page.getByRole("dialog", { name: "Trust DMS Script" });
  await expect(trust).toBeVisible();
  await expect(trust).toContainText("Scripts/trust_gate.dms");
  await expect(trust).toContainText(/trusted local Python/i);
  await expect(page.getByRole("heading", { name: "Trusted Gate Output" })).toHaveCount(0);
  await trust.getByRole("button", { name: "Run Trusted Script" }).click();
  await expect(page.getByRole("heading", { name: "Trusted Gate Output" })).toBeVisible();

  await openWorldFile(page, /trust_gate\.dms/, "Scripts");
  await enterEditMode(page);
  await fillCodeEditor(page, "DMS editor", "render_md('# Unsaved trusted edit')\n");
  const status = page.getByRole("region", { name: "Document status" });
  await expect(status).toContainText("Save before running.");
  await expect(status.getByRole("button", { name: "Run Active Script", exact: true })).toBeDisabled();

  const scripts = await scriptsTool(page);
  await expect(toolsPanel(page).getByRole("button", { name: /^Scenarios/ })).toHaveCount(0);
  await expect(scripts.getByText("Trust Gate")).toBeVisible();
  await expect(scripts.getByText("Scripts/trust_gate.dms")).toBeVisible();
});

test("legacy scenario fast slots stay hidden while scenarios are disabled", async ({
  page,
  request
}) => {
  const scenariosResponse = await request.get("/api/scenarios");
  expect(scenariosResponse.status()).toBe(404);

  const saveResponse = await request.put("/api/fast-slots", {
    data: {
      slots: [
        {
          id: "slot-1",
          position: 1,
          label: "Legacy scenario",
          icon: null,
          action: { kind: "scenario", scenario_id: "create-npc", inputs: { name: "Mira" } }
        }
      ]
    }
  });
  expect(saveResponse.ok()).toBe(false);

  await page.goto("/");
  await expect(page.getByRole("button", { name: "Fast slot 1 empty" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Legacy scenario/ })).toHaveCount(0);
  const actions = await actionsTool(page);
  await expect(actions.getByLabel("Action")).not.toContainText("Scenario");
});

test("system-pack import success disables repeated import", async ({ page }) => {
  const archivePath = resolve(packDir, "repeat-system-pack.zip");
  mkdirSync(packDir, { recursive: true });
  createSystemPackArchive(archivePath);

  await page.goto("/");
  const dialog = await openSettings(page);
  await dialog.locator("input[type='file']").setInputFiles(archivePath);
  const importButton = dialog.getByRole("button", { name: "Import" });
  await expect(importButton).toBeEnabled();

  await importButton.click();

  await expect(dialog.locator(".settings-pack-summary")).toBeVisible();
  await expect(importButton).toBeDisabled();
});

test("map stop status matches hidden player map state", async ({ context, page }) => {
  const player = await context.newPage();
  await player.goto("/screen");
  await page.goto("/");

  const map = await presentSampleMap(page);
  await expect(player.locator(".screen-map")).toBeVisible();

  await map.getByRole("button", { name: "Stop Map" }).click();

  await expect(map.getByText("Map stopped.")).toBeVisible();
  await expect(map.getByRole("button", { name: "Stop Map" })).toBeDisabled();
  await expect(player.locator(".screen-map")).toBeHidden();
  await expect(player.locator(".screen-fullscreen-blank")).toBeVisible();
});

test("audio saved playlist shows current bus queue status clearly", async ({ page }) => {
  await page.goto("/");

  const audio = await audioTool(page);
  const saved = audio.getByRole("region", { name: "Saved Playlists" });
  await saved.getByLabel("Saved playlist name").fill("Cue List");
  await saved.locator(".audio-saved-create-row").getByLabel("Bus").selectOption("music");
  await saved.getByRole("button", { name: "New" }).click();

  const playlist = saved.getByRole("region", { name: "Saved playlist Cue List" });
  await expect(playlist).toBeVisible();
  await playlist.getByLabel("Track path for Cue List").fill(".music/music/Bard/bard-song.ogg");
  await playlist.getByRole("button", { name: "+ Track" }).click();
  await playlist.getByLabel("Track path for Cue List").fill(".music/ambient/Tavern/tavern-crowd.mp3");
  await playlist.getByRole("button", { name: "+ Track" }).click();
  await playlist.getByRole("button", { name: "Load Saved Playlist" }).click();

  const musicBus = audio.getByRole("region", { name: "Music Bus" });
  const ambientBus = audio.getByRole("region", { name: "Ambient Bus" });
  const effectBus = audio.getByRole("region", { name: "Effect Bus" });
  await expect(musicBus.locator(".audio-queue-line")).toContainText("Cue List 1/2");
  await expect(musicBus.locator(".audio-bus-heading")).toContainText("bard-song");
  await expect(ambientBus.getByText("Empty")).toBeVisible();
  await expect(effectBus.getByText("Empty")).toBeVisible();

  await musicBus.getByRole("button", { name: "Next" }).click();
  await expect(musicBus.locator(".audio-queue-line")).toContainText("Cue List 2/2");
  await expect(musicBus.locator(".audio-bus-heading")).toContainText("tavern-crowd");
});

test("Russian layout has no targeted English leftovers or clipped shell labels", async ({
  page
}) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.goto("/");
  await switchToRussian(page);

  const shellText = await page.locator(".app-shell").innerText();

  for (const leftover of [
    "World files",
    "DM Tools",
    "Settings",
    "Screen Control",
    "Audio Control",
    "Fast Slot Configuration",
    "Select a File"
  ]) {
    expect(shellText).not.toContain(leftover);
  }
  expect(shellText).not.toContain("\uFFFD");

  const overflowingLabels = await page
    .locator(".panel-actions-row .panel-action, .tool-section-header")
    .evaluateAll((elements) =>
      elements
        .filter((element) => element.scrollWidth > element.clientWidth + 1)
        .map((element) => element.textContent?.trim() ?? "")
    );
  expect(overflowingLabels).toEqual([]);
});

test("tab strip exposes horizontal overflow without clipping the active tab", async ({ page }) => {
  await page.setViewportSize({ width: 900, height: 700 });
  await page.goto("/");

  for (let index = 1; index <= 12; index += 1) {
    const padded = String(index).padStart(2, "0");
    await openWorldFile(page, new RegExp(`overflow-tab-${padded}`), "Notes");
  }

  const strip = page.locator(".tab-strip");
  await expect(strip).toBeVisible();
  const overflow = await strip.evaluate((element) => ({
    clientWidth: element.clientWidth,
    overflowX: window.getComputedStyle(element).overflowX,
    scrollWidth: element.scrollWidth
  }));
  expect(overflow.scrollWidth).toBeGreaterThan(overflow.clientWidth);
  expect(["auto", "scroll"]).toContain(overflow.overflowX);

  await strip.evaluate((element) => {
    element.scrollLeft = element.scrollWidth;
  });
  await expect(page.getByRole("tab", { name: /Overflow Tab 12/ })).toBeVisible();
});

test("large worlds keep tree filtering search and opening usable", async ({ page, request }) => {
  const largeRoot = resolve(e2eWorld, "Large World");
  for (let folderIndex = 1; folderIndex <= 32; folderIndex += 1) {
    const folder = resolve(largeRoot, `Folder ${String(folderIndex).padStart(2, "0")}`);
    mkdirSync(folder, { recursive: true });
    for (let noteIndex = 1; noteIndex <= 25; noteIndex += 1) {
      const noteName = `note-${String(noteIndex).padStart(2, "0")}.md`;
      writeFileSync(
        resolve(folder, noteName),
        `# Large Note ${folderIndex}-${noteIndex}\n\nBackground fixture ${folderIndex}-${noteIndex}.\n`,
        "utf-8"
      );
    }
  }
  writeFileSync(
    resolve(largeRoot, "Folder 32", "zz-target-large-world.md"),
    "# Large World Target\n\ncrimson-index-needle\n",
    "utf-8"
  );
  await request.post("/api/index/rebuild");

  await page.goto("/");
  await page.getByLabel("Filter world tree").fill("zz-target-large-world");
  const target = worldTree(page).getByRole("button", { name: /zz-target-large-world/ });
  await expect(target).toBeVisible();
  await target.click();
  await expect(page.getByRole("heading", { name: "Large World Target" })).toBeVisible();

  const searchButton = page.getByRole("button", { name: "Search" });
  await searchButton.click();
  const dialog = page.getByRole("dialog", { name: "Global Search" });
  await dialog.getByRole("searchbox", { name: "Search World" }).fill("crimson-index-needle");
  await expect(dialog.getByRole("button", { name: /Large World Target/ })).toBeVisible();
});

test("world selector does not expose duplicate recent and library labels", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator(".world-selector select")).toBeEnabled();
  await expect(
    page.locator(".world-selector select option").filter({ hasText: "E2E World" }).first()
  ).toHaveCount(1);
  const labels = await page.locator(".world-selector select option").evaluateAll((options) =>
    options.map((option) => option.textContent?.trim() ?? "").filter(Boolean)
  );
  expect(labels).toContain("E2E World");
  const duplicatedLabels = labels.filter((label, index) => labels.indexOf(label) !== index);

  expect(duplicatedLabels).toEqual([]);
});

test("assistant Save as Card creates a reviewed card file only after explicit save", async ({
  page
}) => {
  await mockAssistantApi(page);
  await page.goto("/");

  const assistant = await assistantTool(page);
  await expect(assistant.locator(".assistant-provider")).toContainText("mock-assistant-model");
  await assistant.locator("select").first().selectOption("draft-card");
  await assistant.getByLabel("Name").fill("Assistant Card Regression");
  await assistant.getByLabel("Details").fill("Keep this as a reviewed card save regression.");
  await assistant.getByRole("button", { name: "Generate" }).click();
  await expect(assistant.getByRole("region", { name: "Temporary Result" })).toContainText(
    "Assistant Card Regression"
  );

  const cardPath = resolve(e2eWorld, "Cards", "Assistant Card Regression.cs");
  expect(existsSync(cardPath)).toBe(false);
  await expect(assistant.locator(".assistant-save-grid select").first()).toHaveValue("card");
  await assistant.locator(".assistant-save-grid input").fill("Cards/Assistant Card Regression.cs");
  await assistant.getByRole("button", { name: "Save Card" }).click();

  await expect.poll(() => existsSync(cardPath)).toBe(true);
  const saved = readFileSync(cardPath, "utf-8");
  expect(saved).toContain("Assistant Card Regression");
  expect(saved).toContain("Saved from explicit assistant output.");
  expect(existsSync(resolve(e2eWorld, "Notes", "Assistant Card Regression.md"))).toBe(false);
});

test("/screen is isolated from DM-only shell and only exposes displayed content", async ({
  page,
  request
}) => {
  await request.put("/api/display/fullscreen", { data: { path: "README.md" } });

  await page.goto("/screen");

  await expect(page.getByRole("main", { name: "Player Screen" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "World files" })).toHaveCount(0);
  await expect(page.getByRole("complementary", { name: "DM Tools" })).toHaveCount(0);
  await expect(page.getByLabel("Select world")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Search" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Fast slot/ })).toHaveCount(0);

  expect((await request.get("/api/screen/world/file?path=README.md")).status()).toBe(200);
  expect((await request.get("/api/screen/world/file?path=NPCs/Captain%20Ilyra.md")).status()).toBe(
    403
  );
});
