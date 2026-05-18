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
import { copySampleWorldSeed, resetWorldDirectory } from "./world-fixtures";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../..");
const sampleWorld = resolve(repoRoot, "sample-world");
const e2eWorldsRoot = resolve(repoRoot, ".virtualscreen", "e2e-worlds");
const e2eWorld = resolve(e2eWorldsRoot, "E2E World");
const sideWorld = resolve(e2eWorldsRoot, "Side World");
const tinyGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");
const tinyMp3 = Buffer.from("SUQzAwAAAAAA", "base64");
const tinyMp4 = Buffer.from("AAAAHGZ0eXBpc29tAAACAGlzb21pc28ybXA0MQ==", "base64");
const tinyOgg = Buffer.from("T2dnUwACAAAA", "base64");
const tinyPdf = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Count 0>>endobj\ntrailer<</Root 1 0 R>>\n%%EOF\n");
const tinyPng = Buffer.from(
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/p9sAAAAASUVORK5CYII=",
  "base64"
);
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
  mkdirSync(resolve(e2eWorld, ".virtualscreen", "scenarios", "create-npc"), {
    recursive: true
  });
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
  writeFileSync(
    resolve(e2eWorld, ".virtualscreen", "scenarios", "create-npc", "scenario.json"),
    JSON.stringify({
      id: "create-npc",
      name: "Create NPC",
      description: "Generate a quick NPC",
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
  resetWorldDirectory(sideWorld);
  writeFileSync(resolve(sideWorld, "README.md"), "# Side World Home\n", "utf-8");
}

test.beforeEach(async ({ request }) => {
  resetE2eWorld();
  await request.post("/api/worlds/open", {
    data: { id: "E2E World" }
  });
  await request.post("/api/index/rebuild");
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

function worldTree(page: Page) {
  return page.getByRole("navigation", { name: "World files" });
}

async function openPdfFixture(page: Page) {
  const pdfButton = worldTree(page).getByRole("button", { name: /session-handout/ });
  await expect(worldTree(page).getByRole("button", { name: "Docs", exact: true })).toBeVisible();
  try {
    await expect(pdfButton).toBeVisible({ timeout: 1000 });
  } catch {
    await worldTree(page).getByRole("button", { name: "Docs", exact: true }).click();
    await expect(pdfButton).toBeVisible();
  }
  await pdfButton.click();
}

function captainTreeButton(page: Page) {
  return worldTree(page).getByRole("button", { name: /Captain Ilyra Captain Ilyra\.md/ });
}

async function openNotesFile(page: Page, fileName: string) {
  const fileButton = worldTree(page).getByRole("button", { name: new RegExp(fileName) });
  try {
    await expect(fileButton).toBeVisible({ timeout: 1000 });
  } catch {
    await worldTree(page).getByRole("button", { name: "Notes", exact: true }).click();
    await expect(fileButton).toBeVisible();
  }
  await fileButton.click();
}

async function openCardsFile(page: Page, fileName: string) {
  const fileButton = worldTree(page).getByRole("button", { name: new RegExp(fileName) });
  try {
    await expect(fileButton).toBeVisible({ timeout: 1000 });
  } catch {
    await worldTree(page).getByRole("button", { name: "Cards", exact: true }).click();
    await expect(fileButton).toBeVisible();
  }
  await fileButton.click();
}

async function openScriptsFile(page: Page, fileName: string) {
  const fileButton = worldTree(page).getByRole("button", { name: new RegExp(fileName) });
  try {
    await expect(fileButton).toBeVisible({ timeout: 1000 });
  } catch {
    await worldTree(page).getByRole("button", { name: "Scripts", exact: true }).click();
    await expect(fileButton).toBeVisible();
  }
  await fileButton.click();
}

function toolsPanel(page: Page) {
  return page.getByRole("complementary", { name: "DM Tools" });
}

function workspaceControls(page: Page) {
  return page.getByRole("region", { name: "Workspace controls" });
}

async function openToolSection(
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

async function searchTool(page: Page) {
  const existing = page.getByRole("region", { name: "Global Search" });
  if ((await existing.count()) > 0 && await existing.isVisible()) {
    return existing;
  }
  await workspaceControls(page).getByRole("button", { name: "Search" }).click();
  return existing;
}

async function quickCaptureTool(page: Page) {
  const existing = page.getByRole("region", { name: "Quick Capture" });
  if ((await existing.count()) > 0 && await existing.isVisible()) {
    return existing;
  }
  await workspaceControls(page).getByRole("button", { name: "Capture" }).click();
  return existing;
}

async function chooseCaptureCategory(capture: Locator, label: string) {
  await capture.getByRole("button", { name: label, exact: true }).click();
}

async function hpTool(page: Page) {
  await openToolSection(page, "HP");
  return toolsPanel(page).getByRole("region", { name: "HP Scratchpad" });
}

function metadataTool(page: Page) {
  return toolsPanel(page).locator(".metadata-tool");
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

async function fillCodeEditor(page: Page, name: string | RegExp, value: string) {
  const editor = page.getByRole("textbox", { name });
  await editor.click();
  await page.keyboard.press("ControlOrMeta+A");
  await page.keyboard.press("Backspace");
  await page.keyboard.type(value);
}

async function enterEditMode(page: Page) {
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

async function saveActiveDraft(page: Page) {
  await page.keyboard.press("ControlOrMeta+S");
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);
}

async function toggleMarkdownSplit(page: Page) {
  await page.keyboard.press("ControlOrMeta+Backslash");
}

async function previewCleanDraft(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("region", { name: "Document status" })).toContainText("Preview");
}

async function revertDirtyDraft(page: Page) {
  page.once("dialog", async (dialog) => {
    expect(dialog.message()).toContain("Revert unsaved changes");
    await dialog.accept();
  });
  await page.keyboard.press("Shift+Escape");
  await expect(page.getByRole("region", { name: "Document status" })).toContainText("Preview");
}

async function runActiveScript(page: Page) {
  await page
    .getByRole("region", { name: "Document status" })
    .getByRole("button", { name: "Run", exact: true })
    .click();
}

async function chooseCodeCompletion(page: Page, label: string | RegExp) {
  const option = page.locator(".cm-tooltip-autocomplete li", { hasText: label }).first();
  await expect(option).toBeVisible();
  await option.click();
}

async function gotoWorkspace(page: Page) {
  const workspacesLoaded = page.waitForResponse(
    (response) =>
      response.request().method() === "GET" &&
      response.url().endsWith("/api/workspaces") &&
      response.ok()
  );
  await page.goto("/");
  await workspacesLoaded;
}

async function expectWorkspaceActivePath(page: Page, expectedPath: string) {
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

async function expectViewportFilling(page: Page, selector: string) {
  const locator = page.locator(selector);
  await expect(locator).toBeVisible();
  const box = await locator.boundingBox();
  const viewport = page.viewportSize();
  expect(box?.width ?? 0).toBeGreaterThan((viewport?.width ?? 0) * 0.9);
  expect(box?.height ?? 0).toBeGreaterThan((viewport?.height ?? 0) * 0.9);
}

function screenPathUrl(route: string, path: string) {
  return `${route}?path=${encodeURIComponent(path)}`;
}

async function mapCanvasPoint(map: Locator, xRatio: number, yRatio: number) {
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

async function clickMapCanvas(map: Locator, xRatio: number, yRatio: number) {
  const stage = map.locator(".map-canvas-stage");
  await stage.click({ position: await mapCanvasPoint(map, xRatio, yRatio) });
}

async function dragMapCanvas(
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

test("initial app shell loads @smoke", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByText("VirtualScreen", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Live Output Status" })).toHaveCount(0);
  await expect(toolsPanel(page)).toBeVisible();
  await expect(workspaceControls(page).getByRole("button", { name: "Search" })).toBeVisible();
  await expect(workspaceControls(page).getByRole("button", { name: "Capture" })).toBeVisible();
  await expect(workspaceControls(page).getByRole("button", { name: "Prep Check: Not checked" })).toBeVisible();
  await expect(toolsPanel(page).getByRole("button", { name: /^Search/ })).toHaveCount(0);
  await expect(toolsPanel(page).getByRole("button", { name: /^Capture/ })).toHaveCount(0);
  await expect(toolsPanel(page).getByRole("button", { name: /^Map/ })).toHaveCount(0);
  await expect(toolsPanel(page).getByRole("button", { name: /^Audio/ })).toBeVisible();
  await expect(toolsPanel(page).getByRole("button", { name: /^Screen/ })).toBeVisible();
  await expect(toolsPanel(page).getByRole("button", { name: /^Actions/ })).toBeVisible();
  await expect(toolsPanel(page).getByRole("button", { name: /^Scripts/ })).toBeVisible();
  await expect(toolsPanel(page).getByRole("button", { name: /^HP/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "New File" })).toHaveCount(0);
  await expect(page.getByText("Select a File")).toBeVisible();
});

test("screen state and 1024 layout stay usable without global live strip", async ({ page }) => {
  await page.setViewportSize({ width: 1024, height: 768 });
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /README/ }).click();
  await expect(page.getByRole("region", { name: "Live Output Status" })).toHaveCount(0);

  const screen = await screenTool(page);
  await screen.getByRole("button", { name: /Show Active Fullscreen/ }).click();
  await expect(screen.getByRole("region", { name: "Current Screen" })).toContainText(
    "Sample World Guide"
  );
  await expect(page.getByRole("separator", { name: "Resize tools panel" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Fast slot 1 empty" })).toBeVisible();
});

test("tool sections keep one live tool open unless pinned", async ({ page }) => {
  await page.goto("/");

  await openToolSection(page, "Audio");
  await expect(toolsPanel(page).getByRole("button", { name: /^Audio/ })).toHaveAttribute(
    "aria-expanded",
    "true"
  );
  await openToolSection(page, "HP");
  await expect(toolsPanel(page).getByRole("button", { name: /^Audio/ })).toHaveAttribute(
    "aria-expanded",
    "false"
  );
  await expect(toolsPanel(page).getByRole("button", { name: /^HP/ })).toHaveAttribute(
    "aria-expanded",
    "true"
  );

  await toolsPanel(page).getByRole("button", { name: "Pin HP" }).click();
  await openToolSection(page, "Screen");
  await expect(toolsPanel(page).getByRole("button", { name: /^HP/ })).toHaveAttribute(
    "aria-expanded",
    "true"
  );
  await expect(toolsPanel(page).getByRole("button", { name: /^Screen/ })).toHaveAttribute(
    "aria-expanded",
    "true"
  );
});

test("auth gate locks the workspace until a code is accepted @smoke", async ({ page }) => {
  await page.route("**/api/auth/status", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({ enabled: true, authenticated: false })
    });
  });
  await page.route("**/api/auth/login", async (route) => {
    const body = route.request().postDataJSON() as { token: string };
    await route.fulfill({
      contentType: "application/json",
      status: body.token === "secret" ? 200 : 401,
      body: JSON.stringify({
        enabled: true,
        authenticated: body.token === "secret"
      })
    });
  });

  await page.goto("/");
  await expect(page.getByRole("main", { name: "VirtualScreen Unlock" })).toBeVisible();
  await page.getByLabel("Access code").fill("wrong");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByText("Invalid access code.")).toBeVisible();
});

test("world tree displays sample world folders and files @smoke", async ({ page }) => {
  await page.goto("/");

  await expect(worldTree(page).getByText("Sample World Guide")).toBeVisible();
  await expect(worldTree(page).getByText("README.md")).toBeVisible();
  await expect(worldTree(page).getByRole("button", { name: "Cards", exact: true })).toBeVisible();
  await expect(worldTree(page).getByRole("button", { name: "NPCs", exact: true })).toBeVisible();
  await expect(worldTree(page).getByRole("button", { name: "Tables", exact: true })).toBeVisible();
  await expect(worldTree(page).getByRole("button", { name: "Media", exact: true })).toBeVisible();
  await expect(worldTree(page).getByRole("button", { name: /Harbor Watch Contact/ })).toBeVisible();
  await expect(worldTree(page).getByText(".music")).toHaveCount(0);
});

test("world tree context menu duplicates renames and trashes files", async ({ page }) => {
  await page.goto("/");
  const tree = worldTree(page);
  const moonlit = tree.getByRole("button", { name: /Moonlit Key Moonlit Key\.cs/ });
  await expect(moonlit).toBeVisible();

  await moonlit.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Duplicate" }).click();
  await expect(tree.getByText("Duplicated Cards/Moonlit Key.cs")).toBeVisible();
  const copy = tree.getByRole("button", { name: /Moonlit Key Moonlit Key Copy\.cs/ });
  await expect(copy).toBeVisible();

  await copy.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Rename" }).click();
  const rename = page.getByRole("dialog", { name: "Rename File" });
  await rename.getByLabel("New file path").fill("Cards/Renamed Moonlit Key.cs");
  await rename.getByRole("button", { name: "Rename File", exact: true }).click();
  const renamed = tree.getByRole("button", {
    name: /Moonlit Key Renamed Moonlit Key\.cs/
  });
  await expect(renamed).toBeVisible();

  await renamed.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Move to Trash" }).click();
  await page
    .getByRole("dialog", { name: "Move to Trash" })
    .getByRole("button", { name: "Move to Trash", exact: true })
    .click();
  await expect(renamed).toBeHidden();
});

test("world tree context menu closes accessibly and toggles favorites", async ({ page }) => {
  await page.goto("/");
  const tree = worldTree(page);
  const readme = tree.getByRole("button", { name: /README\.md/ });
  await expect(readme).toBeVisible();

  await readme.click({ button: "right" });
  await expect(page.getByRole("menu")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);
  await expect(readme).toBeFocused();

  await readme.click({ button: "right" });
  await expect(page.getByRole("menu")).toBeVisible();
  await page.getByText("VirtualScreen", { exact: true }).click();
  await expect(page.getByRole("menu")).toHaveCount(0);

  await readme.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Favorite" }).click();
  await expect(page.getByRole("region", { name: "Favorites" })).toContainText("README.md");
  await expect(readme).toContainText("Favorite");

  await readme.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Unfavorite" }).click();
  await expect(page.getByRole("region", { name: "Favorites" })).not.toContainText("README.md");
});

test("world tree context menu duplicates renames and trashes folders recursively", async ({
  page,
  request
}) => {
  await page.goto("/");
  const tree = worldTree(page);
  const notes = tree.getByRole("button", { name: "Notes", exact: true });
  await expect(notes).toBeVisible();

  await notes.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Duplicate" }).click();
  const notesCopy = tree.getByRole("button", { name: "Notes Copy", exact: true });
  await expect(notesCopy).toBeVisible();

  await notesCopy.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Rename" }).click();
  const rename = page.getByRole("dialog", { name: "Rename Folder" });
  await rename.getByLabel("New folder path").fill("Notes Archive");
  await rename.getByRole("button", { name: "Rename Folder", exact: true }).click();
  const archive = tree.getByRole("button", { name: "Notes Archive", exact: true });
  await expect(archive).toBeVisible();
  const nestedResponse = await request.get("/api/world/file?path=Notes%20Archive/link-target.md");
  expect(nestedResponse.ok()).toBeTruthy();

  await archive.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Move to Trash" }).click();
  await page
    .getByRole("dialog", { name: "Move Folder to Trash" })
    .getByRole("button", { name: "Move to Trash", exact: true })
    .click();
  await expect(archive).toBeHidden();
});

test("world tree drag and drop moves files between folders", async ({ page }) => {
  await page.goto("/");
  const tree = worldTree(page);
  const moonlit = tree.getByRole("button", { name: /Moonlit Key Moonlit Key\.cs/ });
  const notes = tree.getByRole("button", { name: "Notes", exact: true });
  await expect(moonlit).toBeVisible();
  await expect(notes).toBeVisible();

  const sourceHandle = await moonlit.elementHandle();
  expect(sourceHandle).not.toBeNull();
  await notes.evaluate((target, source) => {
    const dataTransfer = new DataTransfer();
    source.dispatchEvent(new DragEvent("dragstart", { bubbles: true, dataTransfer }));
    target.dispatchEvent(
      new DragEvent("dragover", { bubbles: true, cancelable: true, dataTransfer })
    );
    target.dispatchEvent(new DragEvent("drop", { bubbles: true, cancelable: true, dataTransfer }));
    source.dispatchEvent(new DragEvent("dragend", { bubbles: true, dataTransfer }));
  }, sourceHandle);
  await expect(tree.getByText("Moved Cards/Moonlit Key.cs to Notes/Moonlit Key.cs.")).toBeVisible();
  await expect(tree.getByRole("button", { name: /Moonlit Key Moonlit Key\.cs/ })).toBeVisible();
});

test("world tree move to trash blocks dirty open files", async ({ page }) => {
  await page.goto("/");
  await worldTree(page).getByRole("button", { name: /README\.md/ }).click();
  await enterEditMode(page);
  await page.locator(".cm-content").click();
  await page.keyboard.type("\nDirty tree edit");

  const readme = worldTree(page).getByRole("button", { name: /README\.md/ });
  await readme.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Move to Trash" }).click();
  await page
    .getByRole("dialog", { name: "Move to Trash" })
    .getByRole("button", { name: "Move to Trash", exact: true })
    .click();
  await expect(
    page.getByText("Save or revert dirty open files before reorganizing this world path.")
  ).toBeVisible();
  await expect(readme).toBeVisible();
});

test("world selector switches worlds and records recent worlds", async ({ page }) => {
  await page.goto("/");

  await page.getByLabel("Select world").selectOption("Side World");

  await expect(worldTree(page).getByRole("button", { name: "Side World", exact: true })).toBeVisible();
  await expect(worldTree(page).getByRole("button", { name: /Side World Home/ })).toBeVisible();

  await page.reload();

  await expect(worldTree(page).getByRole("button", { name: /Side World Home/ })).toBeVisible();
  await expect(page.getByLabel("Select world")).toContainText("Side World");

  await page.getByLabel("Select world").selectOption("E2E World");
  await expect(worldTree(page).getByText("Sample World Guide")).toBeVisible();
});

test("open folder dialog and add new world work from the world library", async ({ page }) => {
  await page.goto("/");

  await page.getByRole("button", { name: "Open Folder" }).click();
  let dialog = page.getByRole("dialog", { name: "Open Folder as World" });
  await expect(dialog.getByRole("button", { name: /^Side World/ })).toBeVisible();
  await dialog.getByRole("button", { name: /^Side World/ }).click();
  await expect(worldTree(page).getByRole("button", { name: /Side World Home/ })).toBeVisible();

  await page.getByRole("button", { name: "New World" }).click();
  dialog = page.getByRole("dialog", { name: "Add New World" });
  await dialog.getByLabel("World name").fill("Fresh Realm");
  await dialog.getByRole("button", { name: "Create World" }).click();

  await expect(worldTree(page).getByRole("button", { name: "Fresh Realm", exact: true })).toBeVisible();
  await expect(page.getByLabel("Select world")).toContainText("Fresh Realm");
});

test("folder add menu creates markdown, csv, and nested folders", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "Add in NPCs" }).click();
  await page.getByRole("button", { name: "New Folder" }).click();
  let dialog = page.getByRole("dialog", { name: "New Folder" });
  await dialog.getByLabel("New folder path").fill("NPCs/Playwright Nest");
  await dialog.getByRole("button", { name: "Create Folder" }).click();
  await expect(
    worldTree(page).getByRole("button", { name: "Playwright Nest", exact: true })
  ).toBeVisible();

  await worldTree(page).getByRole("button", { name: "Add in Playwright Nest" }).click();
  await page.getByRole("button", { name: "New Markdown" }).click();
  dialog = page.getByRole("dialog", { name: "New File" });
  await dialog.getByLabel("New file path").fill("NPCs/Playwright Nest/Rumor.md");
  await dialog.getByRole("button", { name: "Create File" }).click();
  await expect(page.getByRole("tab", { name: "Rumor" })).toBeVisible();
  await expect(worldTree(page).getByText("Rumor.md")).toBeVisible();

  await worldTree(page).getByRole("button", { name: "Add in Playwright Nest" }).click();
  await page.getByRole("button", { name: "New CSV" }).click();
  dialog = page.getByRole("dialog", { name: "New File" });
  await dialog.getByLabel("New file path").fill("NPCs/Playwright Nest/rumors.csv");
  await dialog.getByRole("button", { name: "Create File" }).click();
  await expect(page.getByRole("tab", { name: /rumors/ })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "result" })).toBeVisible();
});

test("opens markdown in a tab", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();

  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
});

test("opens markdown with read-only metadata panel", async ({ page }) => {
  await page.goto("/");

  await captainTreeButton(page).click();

  await expect(page.getByRole("tab", { name: "Captain Ilyra" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await expect(metadata.getByText("npc", { exact: true })).toBeVisible();
  await expect(metadata.getByText("city-watch, ally")).toBeVisible();
  await expect(metadata.getByText("Ilyra, Watch Captain")).toBeVisible();
  await expect(metadata.getByText("calm and formal")).toBeVisible();
  await expect(metadata.getByText("medium")).toBeVisible();
  await expect(metadata.locator(".metadata-row dt").filter({ hasText: /^Path$/ })).toHaveCount(0);
  await expect(metadata.locator(".metadata-row dt").filter({ hasText: /^Size$/ })).toHaveCount(0);
  await expect(metadata.locator(".metadata-row dt").filter({ hasText: /^Modified$/ })).toHaveCount(0);
});

test("manually closed tool sections stay closed while switching pages", async ({ page }) => {
  await page.goto("/");

  await captainTreeButton(page).click();
  const metadataHeader = toolsPanel(page).getByRole("button", { name: /^Metadata/ });
  await expect(metadataHeader).toHaveAttribute("aria-expanded", "false");

  await metadataHeader.click();
  await expect(metadataHeader).toHaveAttribute("aria-expanded", "true");

  await metadataHeader.click();
  await expect(metadataHeader).toHaveAttribute("aria-expanded", "false");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await expect(metadataHeader).toHaveAttribute("aria-expanded", "false");

  const screenControls = await screenTool(page);
  await screenControls.getByRole("button", { name: "Show Active Fullscreen" }).click();
  const screenHeader = toolsPanel(page).getByRole("button", { name: /^Screen/ });
  await screenHeader.click();
  await expect(screenHeader).toHaveAttribute("aria-expanded", "false");

  await captainTreeButton(page).click();
  await expect(screenHeader).toHaveAttribute("aria-expanded", "false");
});

test("audio tool searches music and plays independent buses @smoke", async ({ page }) => {
  await page.goto("/");

  const audio = await audioTool(page);
  await audio.getByRole("searchbox", { name: "Music Search" }).fill("tavern");
  await expect(audio.getByText(".music/")).toHaveCount(0);
  await expect(audio.getByText(/Ambient \/ Tavern/)).toHaveCount(0);
  const ambientBus = audio.getByRole("region", { name: "Ambient Bus" });
  await expect(ambientBus.getByRole("button", { name: /^Tavern/ })).toHaveAttribute(
    "aria-expanded",
    "true"
  );
  const volume = ambientBus.locator(".audio-volume").first();
  const volumeLabelBox = await volume.getByText("Volume").boundingBox();
  const volumeSliderBox = await volume.getByRole("slider").boundingBox();
  expect(Math.abs((volumeLabelBox?.y ?? 0) - (volumeSliderBox?.y ?? 0))).toBeLessThan(8);
  const trackListMetrics = await ambientBus.locator(".audio-track-list").first().evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight
  }));
  expect(trackListMetrics.scrollHeight).toBeGreaterThan(trackListMetrics.clientHeight);
  await ambientBus
    .getByRole("button", { name: "Queue Ambient Tavern" })
    .click();
  await expect(ambientBus.locator(".audio-queue-line").getByText("Tavern 1/13")).toBeVisible();
  await expect(ambientBus.getByRole("button", { name: "Pause" })).toBeVisible();
  await ambientBus.getByRole("button", { name: "Next" }).click();
  await expect(ambientBus.locator(".audio-queue-line").getByText("Tavern 2/13")).toBeVisible();
  await ambientBus.getByRole("button", { name: "Prev" }).click();
  await expect(ambientBus.locator(".audio-queue-line").getByText("Tavern 1/13")).toBeVisible();
  await audio.getByRole("button", { name: "tavern-crowd", exact: true }).click();
  await expect(ambientBus.locator(".audio-bus-heading").getByText("tavern-crowd")).toBeVisible();
  await ambientBus.getByRole("button", { name: "Play" }).click();
  await expect(ambientBus.getByRole("button", { name: "Pause" })).toBeVisible();
  const ambientPlayer = page.locator('audio[aria-label="Ambient audio"]');
  await expect(ambientPlayer).toHaveCount(1);
  await expect(audio.locator('audio[aria-label="Ambient audio"]')).toHaveCount(0);
  const audioHeader = toolsPanel(page).getByRole("button", { name: /^Audio/ });
  await audioHeader.click();
  await expect(audioHeader).toHaveAttribute("aria-expanded", "false");
  await expect(audioHeader).toContainText("1 playing");
  await expect(ambientPlayer).toHaveCount(1);
  await audioHeader.click();
  await expect(audioHeader).toHaveAttribute("aria-expanded", "true");
  await expect(ambientBus.getByRole("button", { name: "Pause" })).toBeVisible();

  await audio.getByRole("searchbox", { name: "Music Search" }).fill("bard");
  await audio.getByRole("button", { name: /bard-song/ }).click();
  const musicBus = audio.getByRole("region", { name: "Music Bus" });
  await musicBus.getByRole("button", { name: "Play" }).click();
  await musicBus.getByRole("button", { name: "Fade Out" }).click();
  await expect(musicBus.getByRole("button", { name: "Play" })).toBeVisible({ timeout: 4000 });
  await expect(ambientBus.getByRole("button", { name: "Pause" })).toBeVisible();
  await musicBus.getByRole("button", { name: "Fade In" }).click();
  await expect(musicBus.getByRole("button", { name: "Pause" })).toBeVisible();

  await audio.getByRole("searchbox", { name: "Music Search" }).fill("glass");
  await audio.getByRole("button", { name: /broken-glass/ }).click();
  const effectBus = audio.getByRole("region", { name: "Effect Bus" });
  await effectBus.getByRole("button", { name: "Play" }).click();
  await effectBus.getByRole("button", { name: "Stop" }).click();

  await expect(ambientBus.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(musicBus.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(effectBus.getByText("Empty")).toBeVisible();

  await audio.getByRole("button", { name: "Stop All Audio" }).click();
  await expect(ambientBus.getByText("Empty")).toBeVisible();
  await expect(musicBus.getByText("Empty")).toBeVisible();
});

test("fast slots can open files from click and hotkey", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  const actionsHeader = toolsPanel(page).getByRole("button", { name: /^Actions/ });
  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByLabel("Label").fill("Home");
  await actions.getByRole("textbox", { name: "Fast slot path" }).fill("README.md");
  await actions.getByRole("button", { name: "Save Slot" }).click();
  await expect(actionsHeader).toContainText("1 slot");

  await page.getByRole("button", { name: "Close README.md" }).click();
  await expect(page.getByRole("heading", { name: "Select a File" })).toBeVisible();
  await page.getByRole("button", { name: /Fast slot 1: Home/ }).click();
  await expect(page.getByRole("tab", { name: /Sample World Guide/ })).toBeVisible();

  await page.keyboard.press("Alt+1");
  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
});

test("fast screen slots without paths use the current active file", async ({ context, page }) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");
  await expect(page.getByText("Select a File")).toBeVisible();

  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByLabel("Action").selectOption("screen_fullscreen");
  await actions.getByLabel("Label").fill("Show current");
  await actions.getByRole("button", { name: "Save Slot" }).click();

  await captainTreeButton(page).click();
  await page.getByRole("button", { name: /Fast slot 1: Show current/ }).click();
  await expect(screen.getByRole("heading", { name: "Captain Ilyra" })).toBeVisible();

  await openToolSection(page, "Actions");
  const popupActions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await popupActions.getByLabel("Action").selectOption("screen_popup");
  await popupActions.getByLabel("Label").fill("Popup current");
  await popupActions.getByLabel("Popup preset").selectOption("letter");
  await popupActions.getByRole("button", { name: "Save Slot" }).click();
  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await page.getByRole("button", { name: /Fast slot 1: Popup current/ }).click();
  const popup = screen.getByRole("region", { name: "Popup Sample World Guide" });
  await expect(popup).toBeVisible();
  await expect(popup).toHaveClass(/screen-popup-letter/);
});

test("open file fast slot requires an explicit file path", async ({ page }) => {
  await page.goto("/");

  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByLabel("Action").selectOption("open_file");
  await expect(actions.getByLabel("Action")).not.toContainText("Scenario");
  await expect(actions.getByLabel("Action")).not.toContainText("Search query");
  await expect(actions.getByLabel("Action")).toContainText("Run script");
  await actions.getByRole("textbox", { name: "Fast slot path" }).fill("");
  await actions.getByRole("button", { name: "Save Slot" }).click();

  await expect(actions.getByText("Choose a file path for Open file.")).toBeVisible();
});

test("audio fast slot starts the selected track on the Effect bus", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Select a File")).toBeVisible();

  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByLabel("Action").selectOption("audio_track");
  await actions.getByLabel("Label").fill("Crowd effect");
  await actions.getByRole("textbox", { name: "Fast slot path" }).fill(".music/ambient/Tavern/tavern-crowd.mp3");
  await actions.getByRole("button", { name: "Save Slot" }).click();

  const slotButton = page.getByRole("button", { name: /Fast slot 1: Crowd effect/ });
  await expect(slotButton).toBeEnabled();
  await page.keyboard.press("Alt+1");
  const audio = await audioTool(page);
  const ambientBus = audio.getByRole("region", { name: "Ambient Bus" });
  const effectBus = audio.getByRole("region", { name: "Effect Bus" });

  await expect(effectBus.locator(".audio-bus-heading").getByText("tavern-crowd")).toBeVisible();
  await expect(effectBus.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(ambientBus.getByText("Empty")).toBeVisible();
});

test("script fast slot runs a saved DMS file", async ({ page }) => {
  await page.goto("/");

  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByLabel("Action").selectOption("script_run");
  await actions.getByLabel("Label").fill("Core script");
  await actions.getByRole("textbox", { name: "Fast slot path" }).fill("Scripts/core_commands.dms");
  await actions.getByRole("button", { name: "Save Slot" }).click();

  await expect(toolsPanel(page).getByRole("button", { name: /^Actions/ })).toContainText("1 slot");
  const slotButton = page.getByRole("button", { name: /Fast slot 1: Core script/ });
  await expect(slotButton).toBeEnabled();
  await slotButton.click();

  await expect(page.getByRole("heading", { name: "Core Commands" })).toBeVisible();
  await expect(toolsPanel(page).getByRole("button", { name: /^Scripts success/ })).toBeVisible();
});

test("map preset fast slot and DMS command present saved maps", async ({ context, page }) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /sample-map/ }).click();
  const map = await mapTool(page);
  await map.getByRole("button", { name: "Use Active Image" }).click();
  await expect(map.locator(".map-canvas-dm img")).toBeVisible();
  await map.getByRole("tab", { name: "Setup" }).click();
  await map.getByLabel("Preset name").fill("Session setup");
  await map.getByRole("button", { name: "Save Preset" }).click();
  await expect(map.getByRole("button", { name: "Load Session setup" })).toBeVisible();

  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByLabel("Action").selectOption("map_preset");
  await actions.getByLabel("Label").fill("Show map");
  await actions.getByLabel("Map preset", { exact: true }).selectOption({ label: "Session setup" });
  await actions.getByLabel("Present map preset").setChecked(true);
  await actions.getByRole("button", { name: "Save Slot" }).click();

  await page.getByRole("button", { name: /Fast slot 1: Show map/ }).click();
  await expect(screen.locator(".screen-map img")).toBeVisible();

  const mapAfterSlot = await mapTool(page);
  await mapAfterSlot.getByRole("button", { name: "Stop Map" }).click();
  await expect(screen.locator(".screen-map")).toBeHidden();
  await worldTree(page).getByRole("button", { name: /map_preset_demo\.dms/ }).click();
  await runActiveScript(page);

  await expect(screen.locator(".screen-map img")).toBeVisible();
  await expect(screen.locator(".map-canvas-fog-player")).toBeVisible();
});

test("DMS scripts run from editor and scripts tool @smoke", async ({ page }) => {
  await page.goto("/");

  await expect(toolsPanel(page).getByRole("button", { name: /^Scenarios/ })).toHaveCount(0);
  await openScriptsFile(page, "hello_world1\\.dms");
  await runActiveScript(page);
  const form = page.getByRole("dialog", { name: "DMS Script Form" });
  await expect(form).toBeVisible();
  await form.getByLabel("name").fill("Mira");
  await form.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Hello world" })).toBeVisible();
  await expect(page.getByText("Hello Mira.")).toBeVisible();

  await openScriptsFile(page, "hello_world1\\.dms");
  await enterEditMode(page);
  await fillCodeEditor(page, "DMS editor", "render_md('# Draft')\n");
  await expect(page.getByText("Save before running.")).toBeVisible();

  await openToolSection(page, "Scripts");
  const scripts = toolsPanel(page).getByRole("region", { name: "DMS Scripts" });
  await expect(scripts.getByText("Hello World")).toBeVisible();
});

test("DMS scripts can control screen and audio", async ({ page, context }) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /effects_demo\.dms/ }).click();
  await runActiveScript(page);

  await expect(toolsPanel(page).getByRole("button", { name: /Screen sample-map/ })).toBeVisible();
  await screen.reload();
  await expect(screen.locator(".screen-fullscreen img")).toBeVisible();
  await expect(screen.getByRole("region", { name: "Popup Sample World Guide" })).toBeVisible();
  const audio = await audioTool(page);
  const effectBus = audio.getByRole("region", { name: "Effect Bus" });
  await expect(effectBus.locator(".audio-bus-heading").getByText("broken-glass")).toBeVisible();
  await expect(effectBus.getByRole("button", { name: "Pause" })).toBeVisible();
});

test("DMS autocomplete inserts commands and world paths", async ({ page, context }) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /effects_demo\.dms/ }).click();
  await enterEditMode(page);
  await fillCodeEditor(page, "DMS editor", "screen_");
  await chooseCodeCompletion(page, "screen_fs");
  await page.keyboard.type('"sample');
  await chooseCodeCompletion(page, "sample-map.svg");
  await page.keyboard.press("Enter");
  await page.keyboard.type("audio_");
  await chooseCodeCompletion(page, "audio_play");
  await page.keyboard.type('"glass');
  await chooseCodeCompletion(page, "broken-glass");

  await saveActiveDraft(page);
  await runActiveScript(page);

  await screen.reload();
  await expect(screen.locator(".screen-fullscreen img")).toBeVisible();
  const audio = await audioTool(page);
  const effectBus = audio.getByRole("region", { name: "Effect Bus" });
  await expect(effectBus.locator(".audio-bus-heading").getByText("broken-glass")).toBeVisible();
});

test("DMS script runs can be cancelled and show line-number errors", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /slow_cancel\.dms/ }).click();
  await runActiveScript(page);
  const latestRun = toolsPanel(page).getByRole("region", { name: "Latest Script Run" });
  await expect(latestRun.getByRole("button", { name: "Cancel" })).toBeVisible();
  await latestRun.getByRole("button", { name: "Cancel" }).click();
  await expect(toolsPanel(page).getByText("Cancelled", { exact: true })).toBeVisible();

  await worldTree(page).getByRole("button", { name: /syntax_error\.dms/ }).click();
  await runActiveScript(page);
  await expect(toolsPanel(page).getByText(/line 2/)).toBeVisible();
  await expect(toolsPanel(page).getByText("Scripts/syntax_error.dms", { exact: true })).toBeVisible();
});

test("DMS file picker and core commands produce temporary output", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /choose_file_demo\.dms/ }).click();
  await runActiveScript(page);
  const form = page.getByRole("dialog", { name: "DMS Script Form" });
  await expect(form).toBeVisible();
  await form.getByLabel("Pick a page").fill("README.md");
  await form.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Selected" })).toBeVisible();
  await expect(page.locator(".markdown-viewer").getByText("README.md", { exact: true })).toBeVisible();

  await worldTree(page).getByRole("button", { name: /core_commands\.dms/ }).click();
  await runActiveScript(page);

  await expect(page.getByRole("heading", { name: "Core Commands" })).toBeVisible();
  await expect(page.locator(".markdown-viewer").getByText(/River Gate\s+3/)).toBeVisible();
});

test("DMS temporary outputs can be saved and write commands refresh the world", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /core_commands\.dms/ }).click();
  await runActiveScript(page);
  await expect(page.getByRole("heading", { name: "Core Commands" })).toBeVisible();
  await page.getByRole("button", { name: "Save As" }).click();
  const saveDialog = page.getByRole("dialog", { name: "Save DMS Output" });
  await expect(saveDialog).toBeVisible();
  await saveDialog.getByLabel("World path").fill("Saved/core-output.md");
  await saveDialog.getByRole("button", { name: "Save", exact: true }).click();

  await expect(page.getByRole("tab", { name: "Core Commands" })).toBeVisible();
  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("core-output");
  await expect(search.getByRole("button", { name: /Saved\/core-output\.md/ })).toBeVisible();
  await page.getByRole("button", { name: "Close Search" }).click();

  await worldTree(page).getByRole("button", { name: /write_notes\.dms/ }).click();
  await runActiveScript(page);
  await expect(page.getByRole("heading", { name: "Writes Done" })).toBeVisible();

  const updatedSearch = await searchTool(page);
  await updatedSearch.getByRole("searchbox", { name: "Search World" }).fill("Generated Session");
  await expect(updatedSearch.getByRole("button", { name: /Generated Session Notes\// })).toBeVisible();
  await page.getByRole("button", { name: "Close Search" }).click();

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await expect(page.locator(".markdown-viewer").getByText("DMS appended note", { exact: true })).toBeVisible();
});

test("DMS card writes create cards only after successful scripts", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /create_card_success\.dms/ }).click();
  await runActiveScript(page);
  await expect(toolsPanel(page).getByRole("button", { name: /^Scripts success/ })).toBeVisible();
  await openCardsFile(page, "DMS Quartermaster\\.cs");
  await expect(page.getByRole("heading", { name: "DMS Quartermaster" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Main viewer pane" })).toContainText(
    "silver crate ledger"
  );

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("silver crate ledger");
  await expect(
    search.getByRole("region", { name: "Cards Results" }).getByRole("button", {
      name: /DMS Quartermaster/
    })
  ).toBeVisible();
  await page.getByRole("button", { name: "Close Search" }).click();

  await worldTree(page).getByRole("button", { name: /create_card_fail\.dms/ }).click();
  await runActiveScript(page);
  await expect(
    toolsPanel(page).getByRole("region", { name: "Latest Script Run" }).getByText("error", {
      exact: true
    })
  ).toBeVisible();
  expect(existsSync(resolve(e2eWorld, "Cards", "Failed DMS Card.cs"))).toBe(false);
});

test("workspace panels scroll independently and keep the side panel fixed", async ({
  page,
  request
}) => {
  const fields = Array.from({ length: 28 }, (_, index) => `  field-${index + 1}: value-${index + 1}`).join(
    "\n"
  );
  const paragraphs = Array.from(
    { length: 80 },
    (_, index) => `Long viewer paragraph ${index + 1} with enough text to make the viewer scroll.`
  ).join("\n\n");
  writeFileSync(
    resolve(e2eWorld, "Long Scroll.md"),
    `---\ntitle: Long Scroll\ntype: note\ntags:\n  - layout\nfields:\n${fields}\n---\n# Long Scroll\n\n${paragraphs}\n`,
    "utf-8"
  );
  await request.post("/api/index/rebuild");
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Long Scroll/ }).click();
  await openToolSection(page, "Audio");
  await openToolSection(page, "Actions");
  await openToolSection(page, "Scripts");
  await openToolSection(page, "Screen");
  const audio = await audioTool(page);
  await audio.getByRole("searchbox", { name: "Music Search" }).fill("tavern");
  await expect(audio.getByRole("button", { name: /^Tavern/ })).toBeVisible();

  await page.evaluate(() => window.scrollTo(0, 300));
  await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);

  const sideBefore = await page.locator(".side-panel").boundingBox();
  await page.locator(".viewer-surface").evaluate((element) => {
    element.scrollTop = 600;
  });
  await expect
    .poll(() => page.locator(".viewer-surface").evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  const viewerScroll = await page.locator(".viewer-surface").evaluate((element) => element.scrollTop);
  const sideAfter = await page.locator(".side-panel").boundingBox();
  expect(Math.round(sideAfter?.y ?? -1)).toBe(Math.round(sideBefore?.y ?? -2));

  await page.locator(".tools-panel").evaluate((element) => {
    element.scrollTop = 500;
  });
  await expect
    .poll(() => page.locator(".tools-panel").evaluate((element) => element.scrollTop))
    .toBeGreaterThan(0);
  await expect(page.locator(".viewer-surface")).toHaveJSProperty("scrollTop", viewerScroll);
});

test("named workspaces isolate tabs and survive rename reload", async ({ page }) => {
  const workspaceName = `Session ${Date.now()}`;
  await gotoWorkspace(page);
  const workspaceControls = page.locator(".workspace-controls");

  await workspaceControls.getByRole("button", { name: "New", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New Workspace" });
  await dialog.getByLabel("Workspace name").fill(workspaceName);
  const createWorkspaceResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "POST" &&
      response.url().endsWith("/api/workspaces")
  );
  await dialog.getByRole("button", { name: "Save" }).click();
  const createdWorkspaceResponse = await createWorkspaceResponse;
  expect(createdWorkspaceResponse.ok()).toBeTruthy();
  const createdWorkspace = (await createdWorkspaceResponse.json()) as { workspaceId: string };
  await expect(page.getByLabel("Select workspace")).toHaveValue(createdWorkspace.workspaceId);
  await expect(page.getByLabel("Select workspace")).toContainText(workspaceName);

  await captainTreeButton(page).click();
  await expect(page.getByRole("tab", { name: "Captain Ilyra" })).toBeVisible();

  await page.getByLabel("Select workspace").selectOption({ label: "Default" });
  await expect(page.getByRole("heading", { name: "Select a File" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Captain Ilyra" })).toHaveCount(0);

  await page.getByLabel("Select workspace").selectOption({ label: workspaceName });
  await expect(page.getByRole("tab", { name: "Captain Ilyra" })).toBeVisible();

  await workspaceControls.getByRole("button", { name: "Rename", exact: true }).click();
  const rename = page.getByRole("dialog", { name: "Rename Workspace" });
  await rename.getByLabel("Workspace name").fill(`${workspaceName} Renamed`);
  const renameWorkspaceResponse = page.waitForResponse(
    (response) =>
      response.request().method() === "PUT" &&
      response.url().includes("/api/workspaces/")
  );
  await rename.getByRole("button", { name: "Save" }).click();
  expect((await renameWorkspaceResponse).ok()).toBeTruthy();
  await page.reload();

  await expect(page.getByLabel("Select workspace")).toContainText(`${workspaceName} Renamed`);
  await expect(page.getByRole("tab", { name: "Captain Ilyra" })).toBeVisible();
});

test("workspace split panes show two files and persist layout", async ({ page }) => {
  await gotoWorkspace(page);
  const workspaceControls = page.locator(".workspace-controls");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await workspaceControls.getByRole("button", { name: "Split", exact: true }).click();
  await page.getByRole("region", { name: "Secondary viewer pane" }).click();
  await worldTree(page).getByRole("button", { name: "random-events.csv" }).click();

  await expect(page.getByRole("region", { name: "Main viewer pane" })).toContainText(
    "Sample World Guide"
  );
  await expect(page.getByRole("region", { name: "Secondary viewer pane" })).toContainText(
    "result"
  );
  await expect(page.getByRole("separator", { name: "Resize workspace panes" })).toBeVisible();

  const resizer = page.getByRole("separator", { name: "Resize workspace panes" });
  const box = await resizer.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move((box?.x ?? 0) + 3, (box?.y ?? 0) + 20);
  await page.mouse.down();
  await page.mouse.move((box?.x ?? 0) - 80, (box?.y ?? 0) + 20);
  await page.mouse.up();
  await page.waitForTimeout(400);
  await page.reload();

  await expect(workspaceControls.getByRole("button", { name: "Split", exact: true })).toHaveAttribute(
    "aria-pressed",
    "true"
  );
  await expect(page.getByRole("region", { name: "Main viewer pane" })).toContainText(
    "Sample World Guide"
  );
  await expect(page.getByRole("region", { name: "Secondary viewer pane" })).toContainText(
    "result"
  );
});

test("tools panel can be resized and remembers local width", async ({ page }) => {
  await page.goto("/");

  const before = await toolsPanel(page).boundingBox();
  const resizer = page.getByRole("separator", { name: "Resize tools panel" });
  const resizerBox = await resizer.boundingBox();
  expect(before).not.toBeNull();
  expect(resizerBox).not.toBeNull();

  await page.mouse.move((resizerBox?.x ?? 0) + 3, (resizerBox?.y ?? 0) + 20);
  await page.mouse.down();
  await page.mouse.move((resizerBox?.x ?? 0) - 120, (resizerBox?.y ?? 0) + 20);
  await page.mouse.up();

  const resized = await toolsPanel(page).boundingBox();
  expect(resized?.width ?? 0).toBeGreaterThan((before?.width ?? 0) + 80);

  await page.reload();
  const afterReload = await toolsPanel(page).boundingBox();
  expect(afterReload?.width ?? 0).toBeGreaterThan((before?.width ?? 0) + 80);
});

test("edits metadata title and refreshes tab tree and search", async ({ page }) => {
  await page.goto("/");

  await captainTreeButton(page).click();
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await metadata.getByRole("textbox", { name: "Metadata title" }).fill("Captain Ilyra Prime");
  await metadata.getByRole("button", { name: "Save Metadata" }).click();

  await expect(page.getByRole("tab", { name: "Captain Ilyra Prime" })).toBeVisible();
  await expect(worldTree(page).getByText("Captain Ilyra Prime")).toBeVisible();
  await expect(metadata.getByText("Captain Ilyra Prime")).toBeVisible();

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("Ilyra Prime");
  await expect(search.getByRole("button", { name: /Captain Ilyra Prime/ })).toBeVisible();
});

test("edits metadata tags and aliases and persists after reload", async ({ page }) => {
  await page.goto("/");

  await captainTreeButton(page).click();
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await metadata
    .getByRole("textbox", { name: "Metadata tags" })
    .fill("city-watch, ally, quest-hook");
  await metadata
    .getByRole("textbox", { name: "Metadata aliases" })
    .fill("Ilyra, Watch Captain, Gate Captain");
  await metadata.getByRole("button", { name: "Save Metadata" }).click();
  await page.waitForTimeout(300);
  await page.reload();
  await openToolSection(page, "Metadata");

  await expect(metadata.getByText("city-watch, ally, quest-hook")).toBeVisible();
  await expect(metadata.getByText("Ilyra, Watch Captain, Gate Captain")).toBeVisible();
});

test("adds and removes custom metadata fields", async ({ page }) => {
  await page.goto("/");

  await captainTreeButton(page).click();
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await expect(metadata.getByRole("textbox", { name: "Field 3 value" })).toHaveValue("medium");
  await metadata.getByRole("button", { name: "Remove field 3" }).click();
  await metadata.getByRole("button", { name: "Add Field" }).click();
  await metadata.getByRole("textbox", { name: "Field 4 key" }).pressSequentially("agenda");
  await metadata.getByRole("textbox", { name: "Field 4 value" }).fill("protect the gate");
  await metadata.getByRole("button", { name: "Save Metadata" }).click();

  await expect(metadata.getByText("protect the gate")).toBeVisible();
  await expect(metadata.getByText("medium")).toBeHidden();
});

test("shows metadata conflict and keeps unsaved values visible", async ({ page, request }) => {
  await page.goto("/");

  await captainTreeButton(page).click();
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await metadata
    .getByRole("textbox", { name: "Metadata title" })
    .fill("Unsaved Metadata Title");

  const current = await (
    await request.get("/api/world/file?path=NPCs%2FCaptain%20Ilyra.md")
  ).json();
  await request.put("/api/world/file?path=NPCs%2FCaptain%20Ilyra.md", {
    data: {
      content: `${current.content}\nExternal metadata conflict`,
      expected_modified_at: current.modified_at,
      expected_hash: current.hash
    }
  });

  await metadata.getByRole("button", { name: "Save Metadata" }).click();

  await expect(metadata.getByText("World file changed on disk.")).toBeVisible();
  await expect(metadata.getByRole("textbox", { name: "Metadata title" })).toHaveValue(
    "Unsaved Metadata Title"
  );
});

test("opens wiki-link targets from markdown content", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await page.locator(".markdown-viewer").getByRole("link", { name: "Captain Ilyra" }).click();

  await expect(page.getByRole("tab", { name: "Captain Ilyra" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Captain Ilyra" })).toBeVisible();

  await page.locator(".markdown-viewer").getByRole("link", { name: "Home" }).click();

  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
});

test("Markdown autocomplete inserts wiki and @ links", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await enterEditMode(page);
  await fillCodeEditor(page, "Markdown editor", "# Autocomplete Links\n\nMeet [[Ily");
  await chooseCodeCompletion(page, "Ilyra");
  await page.getByRole("textbox", { name: "Markdown editor" }).click();
  await page.keyboard.press("End");
  await page.keyboard.type("\n\nUse @Moonlit");
  await page.keyboard.press("End");
  await page.keyboard.press("Control+Space");
  await chooseCodeCompletion(page, "Moonlit Key");

  await saveActiveDraft(page);
  await expect(page.getByRole("region", { name: "Document status" })).toContainText(/Saved|Clean/);

  await openToolSection(page, "Metadata");
  await page
    .getByRole("region", { name: "Outgoing Links" })
    .getByRole("button", { name: /Moonlit Key/ })
    .click();
  await expect(page.getByRole("heading", { name: "Moonlit Key" })).toBeVisible();
});

test("shows outgoing links and backlinks in metadata panel", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await openToolSection(page, "Metadata");
  const outgoing = page.getByRole("region", { name: "Outgoing Links" });
  await expect(outgoing.getByRole("button", { name: "Captain Ilyra" })).toBeVisible();
  await expect(outgoing.getByRole("button", { name: "random-events.csv" })).toBeVisible();

  await outgoing.getByRole("button", { name: "random-events.csv" }).click();
  await expect(page.getByRole("tab", { name: "random-events.csv" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "result" })).toBeVisible();

  await captainTreeButton(page).click();
  await openToolSection(page, "Metadata");
  const backlinks = page.getByRole("region", { name: "Backlinks" });
  await expect(backlinks.getByRole("button", { name: "Sample World Guide" })).toBeVisible();
});

test("opens CSV as a table", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "random-events.csv" }).click();

  await expect(page.getByRole("tab", { name: "random-events.csv" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "result" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "event" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "tone" })).toBeVisible();
  await openToolSection(page, "Metadata");
  await expect(page.getByRole("button", { name: "Edit Metadata" })).toBeVisible();
  await expect(metadataTool(page).locator(".metadata-row dd").filter({ hasText: /^random-events$/ })).toBeVisible();
  await expect(metadataTool(page).locator(".metadata-row dt").filter({ hasText: /^Path$/ })).toHaveCount(0);
});

test("opens links from CSV cells", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "random-events.csv" }).click();
  await page.locator(".table-wrap").getByRole("link", { name: "Home" }).first().click();

  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
});

test("renders LaTeX and sanitized HTML in markdown", async ({ page, request }) => {
  const title = `Render Check ${Date.now()}`;
  const createResponse = await request.post("/api/world/file", {
    data: {
      path: `${title}.md`,
      file_type: "markdown",
      content: [
        `# ${title}`,
        "",
        "Inline $x^2$ formula.",
        "",
        "$$d20 + 4$$",
        "",
        "<details><summary>Difficulty</summary><table><tr><td>15</td></tr></table></details>",
        "",
        "<img src=\"x\" onerror=\"window.__unsafeHtml = true\"><script>window.__unsafeHtml = true</script>"
      ].join("\n")
    }
  });
  expect(createResponse.ok()).toBeTruthy();

  await page.goto("/");
  await worldTree(page).getByRole("button", { name: title }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.locator(".katex").first()).toBeVisible();
  await expect(page.locator("details").getByText("Difficulty")).toBeVisible();
  await expect(page.locator(".markdown-viewer script")).toHaveCount(0);
  await expect(page.locator(".markdown-viewer img[onerror]")).toHaveCount(0);
  await expect(page.evaluate(() => (window as unknown as { __unsafeHtml?: boolean }).__unsafeHtml)).resolves.toBeFalsy();
});

test("renders LaTeX and clickable wiki-links inside CSV cells", async ({ page, request }) => {
  await request.post("/api/world/file", {
    data: {
      path: "Tables/render-cells.csv",
      file_type: "csv",
      content: "result,event\n1,\"Return [[../README|Home]] with $1d20$\"\n"
    }
  });

  await page.goto("/");
  await worldTree(page).getByRole("button", { name: "render-cells.csv" }).click();

  await expect(page.locator(".table-wrap .katex").first()).toBeVisible();
  await page.locator(".table-wrap").getByRole("link", { name: "Home" }).click();
  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toBeVisible();
});

test("opens externally added unicode markdown and resolves outgoing links", async ({
  page,
  request
}) => {
  await request.get("/api/pages");
  const externalDir = resolve(e2eWorld, "NPCs", "Tavern");
  const externalFilename = "External \u2014 \u043a\u043e\u043f\u0438\u044f.md";
  mkdirSync(externalDir, { recursive: true });
  writeFileSync(
    resolve(externalDir, externalFilename),
    [
      "---",
      "title: External Tavern Copy",
      "tags:",
      "- external",
      "---",
      "",
      "# External Tavern Copy",
      "",
      "Return to [[../../README|Home]]."
    ].join("\n"),
    "utf-8"
  );

  await request.get("/api/pages");
  await page.goto("/");
  const externalButton = worldTree(page).getByRole("button", { name: /External Tavern Copy/ });
  await expect(externalButton).toBeVisible({ timeout: 10_000 });
  await externalButton.click();

  await expect(page.getByRole("tab", { name: "External Tavern Copy" })).toBeVisible();
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await expect(metadata.getByText("external", { exact: true })).toBeVisible();
  const outgoing = page.getByRole("region", { name: "Outgoing Links" });
  await expect(outgoing.getByRole("button", { name: "Sample World Guide" })).toBeVisible();

  await page.locator(".markdown-viewer").getByRole("link", { name: "Home" }).click();
  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toBeVisible();
});

test("live sync adds external markdown with metadata and links without reload", async ({
  page
}) => {
  await page.goto("/");

  const externalPath = resolve(e2eWorld, "Live Portal.md");
  writeFileSync(
    externalPath,
    [
      "---",
      "title: Live Portal",
      "tags:",
      "- live-sync",
      "---",
      "",
      "# Live Portal",
      "",
      "Back to [[README|Home]]."
    ].join("\n"),
    "utf-8"
  );

  await expect(worldTree(page).getByRole("button", { name: /Live Portal/ })).toBeVisible({
    timeout: 10_000
  });
  await worldTree(page).getByRole("button", { name: /Live Portal/ }).click();

  await expect(page.getByRole("tab", { name: "Live Portal" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Live Portal" })).toBeVisible();
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await expect(metadata.getByText("live-sync", { exact: true })).toBeVisible();
  await expect(page.getByRole("region", { name: "Outgoing Links" }).getByRole("button")).toBeVisible();

  await page.locator(".markdown-viewer").getByRole("link", { name: "Home" }).click();
  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toBeVisible();
});

test("live sync refreshes an open clean markdown file", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  const readmePath = resolve(e2eWorld, "README.md");
  const current = readFileSync(readmePath, "utf-8");
  writeFileSync(
    readmePath,
    current.replace("\n# Sample World Guide", "\n# Live Refreshed Home"),
    "utf-8"
  );

  await expect(page.getByRole("heading", { name: "Live Refreshed Home" })).toBeVisible({
    timeout: 10_000
  });
});

test("live sync protects dirty markdown drafts from external changes", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await enterEditMode(page);
  const editor = page.getByRole("textbox", { name: "Markdown editor" });
  await fillCodeEditor(page, "Markdown editor", "# Local Draft Kept");

  const readmePath = resolve(e2eWorld, "README.md");
  const current = readFileSync(readmePath, "utf-8");
  writeFileSync(
    readmePath,
    current.replace("\n# Sample World Guide", "\n# Disk Changed Home"),
    "utf-8"
  );

  await expect(page.locator(".editor-status")).toHaveText("Changed on disk", {
    timeout: 10_000
  });
  await expect(editor).toContainText("# Local Draft Kept");
  await expect(
    page.getByRole("region", { name: "Document status" }).getByRole("button", { name: "Save" })
  ).toHaveCount(0);
});

test("live sync shows a clear state when an open file is deleted externally", async ({
  page
}) => {
  await page.goto("/");

  const externalPath = resolve(e2eWorld, "Live Delete.md");
  writeFileSync(externalPath, "# Live Delete\n", "utf-8");
  await expect(worldTree(page).getByRole("button", { name: /Live Delete/ })).toBeVisible({
    timeout: 10_000
  });
  await worldTree(page).getByRole("button", { name: /Live Delete/ }).click();
  await expect(page.getByRole("heading", { name: "Live Delete" })).toBeVisible();

  if (existsSync(externalPath)) {
    unlinkSync(externalPath);
  }

  await expect(page.getByRole("heading", { name: "File Removed" })).toBeVisible({
    timeout: 10_000
  });
  await expect(page.getByText("File removed from disk.")).toBeVisible();
});

test("edits metadata for CSV and media files", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "random-events.csv" }).click();
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await metadata.getByRole("textbox", { name: "Metadata title" }).fill("Random Event Table");
  await metadata.getByRole("textbox", { name: "Metadata tags" }).fill("tables, session");
  await metadata.getByRole("button", { name: "Save Metadata" }).click();

  await expect(page.getByRole("tab", { name: "Random Event Table" })).toBeVisible();
  await expect(worldTree(page).getByText("Random Event Table")).toBeVisible();
  await expect(metadata.getByText("tables, session")).toBeVisible();

  await worldTree(page).getByRole("button", { name: "sample-map.svg" }).click();
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await metadata.getByRole("textbox", { name: "Metadata title" }).fill("Tavern District Map");
  await metadata.getByRole("button", { name: "Save Metadata" }).click();

  await expect(page.getByRole("tab", { name: "Tavern District Map" })).toBeVisible();
  await expect(metadata.getByText("Tavern District Map")).toBeVisible();
});

test("opens SVG media visibly", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "sample-map.svg" }).click();

  await expect(page.getByRole("tab", { name: "sample-map.svg" })).toBeVisible();
  await expect(page.getByRole("img", { name: "sample-map.svg" })).toBeVisible();
});

test("opens MP4 media in a video tab", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "animated-map.mp4" }).click();

  await expect(page.getByRole("tab", { name: /animated-map/ })).toBeVisible();
  await expect(page.locator('video[aria-label="animated-map.mp4"]')).toBeVisible();
});

test("opens searches and persists PDF materials", async ({ page }) => {
  await page.goto("/");

  await openPdfFixture(page);

  await expect(page.getByRole("tab", { name: "session-handout.pdf" })).toBeVisible();
  await expect(page.locator('iframe[aria-label="session-handout.pdf"]')).toBeVisible();

  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await metadata.getByRole("textbox", { name: "Metadata title" }).fill("Session Handout");
  await metadata.getByRole("textbox", { name: "Metadata tags" }).fill("handout, pdf");
  await metadata.getByRole("button", { name: "Save Metadata" }).click();
  await expect(page.getByRole("tab", { name: "Session Handout" })).toBeVisible();

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("Session Handout");
  await expect(search.getByRole("button", { name: /Session Handout/ })).toBeVisible();
  await page.getByRole("button", { name: "Close Search" }).click();

  const handout = worldTree(page).getByRole("button", { name: /session-handout\.pdf/ });
  await handout.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Favorite" }).click();
  await page.reload();
  await expect(page.getByRole("tab", { name: "Session Handout" })).toBeVisible();
  await expect(page.getByRole("button", { name: /Session Handout/ }).first()).toBeVisible();
});

test("player screen shows fullscreen media and DM-controlled popups @smoke", async ({
  context,
  page
}) => {
  const screen = await context.newPage();
  await screen.goto("/screen");

  await page.goto("/");
  let controls = await screenTool(page);
  await controls.getByRole("button", { name: "Clear Popups" }).click();
  await controls.getByRole("button", { name: "Blank Screen" }).click();
  await expect(screen.getByText("Blank Screen")).toBeVisible();

  await worldTree(page).getByRole("button", { name: "animated-map.gif" }).click();
  controls = await screenTool(page);
  await controls.getByRole("button", { name: "Show Active Fullscreen" }).click();
  await expect(screen.getByRole("img", { name: "animated-map" })).toBeVisible();

  await worldTree(page).getByRole("button", { name: "animated-map.mp4" }).click();
  controls = await screenTool(page);
  await controls.getByRole("button", { name: "Show Active Fullscreen" }).click();
  const video = screen.getByLabel("animated-map");
  await expect(video).toBeVisible();
  await expect(video).toHaveAttribute("loop", "");
  await expect(video).toHaveJSProperty("muted", true);

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  controls = await screenTool(page);
  await controls.getByLabel("Popup preset").selectOption("letter");
  await controls.getByRole("button", { name: "Open Active as Popup" }).click();
  const homePopup = screen.getByRole("region", { name: "Popup Sample World Guide" });
  await expect(homePopup).toBeVisible();
  await expect(homePopup).toHaveClass(/screen-popup-letter/);

  await captainTreeButton(page).click();
  controls = await screenTool(page);
  await controls.getByLabel("Popup preset").selectOption("plain");
  await controls.getByRole("button", { name: "Open Active as Popup" }).click();
  const captainPopup = screen.getByRole("region", { name: "Popup Captain Ilyra" });
  await expect(captainPopup).toBeVisible();
  await expect(captainPopup).toHaveClass(/screen-popup-plain/);
  await controls
    .locator(".screen-popup-item")
    .filter({ hasText: "Sample World Guide" })
    .first()
    .getByRole("button", { name: "Close", exact: true })
    .click();
  await expect(screen.getByRole("region", { name: "Popup Sample World Guide" })).toBeHidden();
  await expect(screen.getByRole("region", { name: "Popup Captain Ilyra" })).toBeVisible();

  await controls.getByRole("button", { name: "Clear Popups" }).click();
  await expect(screen.getByRole("region", { name: "Popup Captain Ilyra" })).toBeHidden();

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  controls = await screenTool(page);
  await controls.getByRole("button", { name: "Open Active as Popup" }).click();
  await expect(screen.getByRole("region", { name: "Popup Sample World Guide" })).toBeVisible();
  await captainTreeButton(page).click();
  controls = await screenTool(page);
  await controls.getByRole("button", { name: /Clear \+ Show/ }).click();
  await expect(screen.getByRole("heading", { name: "Captain Ilyra" })).toBeVisible();
  await expect(screen.getByRole("region", { name: "Popup Sample World Guide" })).toBeHidden();

  await captainTreeButton(page).click();
  controls = await screenTool(page);
  await controls.getByRole("button", { name: "Open Active as Popup" }).click();
  await expect(screen.getByRole("region", { name: "Popup Captain Ilyra" })).toBeVisible();
  await controls.getByRole("button", { name: "Blank Screen" }).click();
  await expect(screen.getByText("Blank Screen")).toBeVisible();
  await expect(screen.getByRole("region", { name: "Popup Captain Ilyra" })).toBeHidden();
});

test("staged active popup stays hidden until shown from DM controls", async ({
  context,
  page
}) => {
  const screen = await context.newPage();
  await screen.goto("/screen");

  await page.goto("/");
  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  const controls = await screenTool(page);
  await controls.getByRole("button", { name: "Clear Popups" }).click();
  await controls.getByRole("button", { name: "Blank Screen" }).click();
  await controls.getByLabel("Popup preset").selectOption("letter");
  await controls.getByRole("button", { name: "Stage Active as Popup" }).click();

  const popupItem = controls.locator(".screen-popup-item").filter({ hasText: "Sample World Guide" });
  await expect(controls.getByRole("heading", { name: "Staged" })).toBeVisible();
  await expect(popupItem).toContainText("letter");
  await expect(screen.getByRole("region", { name: "Popup Sample World Guide" })).toBeHidden();

  await popupItem.getByRole("button", { name: "Show", exact: true }).click();
  const screenPopup = screen.getByRole("region", { name: "Popup Sample World Guide" });
  await expect(screenPopup).toBeVisible();
  await expect(screenPopup).toHaveClass(/screen-popup-letter/);

  await popupItem.getByRole("button", { name: "Hide", exact: true }).click();
  await expect(screen.getByRole("region", { name: "Popup Sample World Guide" })).toBeHidden();
});

test("middle-clicking a resolved wiki link opens a local peek without switching tabs", async ({
  page
}) => {
  await page.goto("/");
  await openNotesFile(page, "link-source\\.md");
  const sourceTab = page.getByRole("tab", { name: /Link Source|link-source/ });
  await expect(sourceTab).toHaveAttribute("aria-selected", "true");

  await page.getByRole("link", { name: "Captain Ilyra" }).click({ button: "middle" });

  await expect(page.getByRole("dialog", { name: "Peek Captain Ilyra" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Captain Ilyra" })).toBeVisible();
  await expect(sourceTab).toHaveAttribute("aria-selected", "true");
});

test("resolved Markdown link context menu offers peek and screen actions", async ({ page }) => {
  await page.goto("/");
  await openNotesFile(page, "link-source\\.md");

  await openToolSection(page, "Metadata");
  await expect(
    metadataTool(page).getByRole("button", { name: "Link Target" })
  ).toBeVisible();
  await page
    .getByRole("region", { name: "Main viewer pane" })
    .getByRole("link", { name: "the note" })
    .click({ button: "right" });

  const menu = page.getByRole("menu");
  await expect(menu.getByRole("button", { name: "Peek", exact: true })).toBeEnabled();
  await expect(menu.getByRole("button", { name: "Stage on Screen" })).toBeEnabled();
  await expect(menu.getByRole("button", { name: "Show on Screen" })).toBeEnabled();
});

test("player screen applies popup preset classes", async ({ context, request }) => {
  const presets = ["plain", "note", "letter", "portrait", "clue"];
  await request.post("/api/display/blank");
  for (const preset of presets) {
    await request.post("/api/display/popup", {
      data: { path: "README.md", preset }
    });
  }

  const screen = await context.newPage();
  await screen.goto("/screen");

  for (const preset of presets) {
    const popup = screen.locator(`.screen-popup-${preset}`);
    await expect(popup).toHaveCount(1);
    await expect(popup).toBeVisible();
  }

  await expect(screen.locator(".screen-fullscreen")).not.toHaveClass(/screen-popup-/);

  const backgroundColors = await Promise.all(
    presets.map((preset) =>
      screen.locator(`.screen-popup-${preset}`).evaluate((element) => {
        return getComputedStyle(element).backgroundColor;
      })
    )
  );
  expect(new Set(backgroundColors).size).toBeGreaterThan(1);
});

test("player screen displays PDFs as fullscreen and popups", async ({ context, page, request }) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");

  expect(
    (await request.get(screenPathUrl("/api/screen/world/media", "Docs/session-handout.pdf"))).status()
  ).toBe(403);

  await openPdfFixture(page);
  const controls = await screenTool(page);
  await controls.getByRole("button", { name: "Show Active Fullscreen" }).click();
  await expect(screen.getByLabel(/session-handout/)).toBeVisible();
  expect(
    (await request.get(screenPathUrl("/api/screen/world/media", "Docs/session-handout.pdf"))).status()
  ).toBe(200);

  await controls.getByRole("button", { name: "Open Active as Popup" }).click();
  await expect(screen.getByRole("region", { name: /Popup session-handout/ })).toBeVisible();
});

test("player screen fills the viewport for markdown and CSV fullscreen content", async ({
  context,
  page
}) => {
  const screen = await context.newPage();
  await screen.goto("/screen");

  await page.goto("/");
  let controls = await screenTool(page);
  await controls.getByRole("button", { name: "Clear Popups" }).click();
  await controls.getByRole("button", { name: "Blank Screen" }).click();

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  controls = await screenTool(page);
  await controls.getByRole("button", { name: "Show Active Fullscreen" }).click();
  await expectViewportFilling(screen, ".screen-fullscreen .screen-markdown");

  await controls.getByRole("button", { name: "Open Active as Popup" }).click();
  const popup = screen.getByRole("region", { name: "Popup Sample World Guide" });
  await expect(popup).toBeVisible();
  const popupBox = await popup.boundingBox();
  const viewport = screen.viewportSize();
  expect(popupBox?.width ?? 0).toBeLessThan((viewport?.width ?? 0) * 0.9);

  await worldTree(page).getByRole("button", { name: "random-events.csv" }).click();
  controls = await screenTool(page);
  await controls.getByRole("button", { name: "Show Active Fullscreen" }).click();
  await expectViewportFilling(screen, ".screen-fullscreen .screen-table-wrap");
});

test("interactive map presents image maps with fog reveals and pins on player screen @smoke", async ({
  context,
  page,
  request
}) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /sample-map/ }).click();
  const map = await mapTool(page);
  await map.getByRole("button", { name: "Use Active Image" }).click();
  await expect(map.locator(".map-canvas-dm img")).toBeVisible();
  const previewWorld = map.locator(".map-canvas-world");
  await expect(async () => {
    const worldBox = await previewWorld.boundingBox();
    expect(worldBox).not.toBeNull();
    if (worldBox) {
      expect(worldBox.width / worldBox.height).toBeGreaterThan(1.55);
      expect(worldBox.width / worldBox.height).toBeLessThan(1.65);
    }
  }).toPass();
  await map.getByRole("button", { name: "Present Map" }).click();

  await expect(screen.locator(".screen-map")).toBeVisible();
  await expect(screen.locator(".screen-map img")).toBeVisible();
  await expect(
    request.get(screenPathUrl("/api/screen/map/media", "Media/sample-map.svg")).then((response) =>
      response.status()
    )
  ).resolves.toBe(200);
  await expect(
    request.get(screenPathUrl("/api/screen/map/media", "Media/animated-map.gif")).then((response) =>
      response.status()
    )
  ).resolves.toBe(403);

  await map.getByLabel("Fog enabled").click();
  await expect(map.getByLabel("Fog enabled")).toBeChecked();
  await expect(map.locator(".map-canvas-fog-dm")).toBeVisible();
  await expect(screen.locator(".map-canvas-fog-player")).toBeVisible();
  await expect(async () => {
    const dmFogFill = await map.locator(".map-canvas-fog-dm .map-fog-overlay").evaluate((node) =>
      getComputedStyle(node).fill
    );
    const playerFogFill = await screen
      .locator(".map-canvas-fog-player .map-fog-overlay")
      .evaluate((node) => getComputedStyle(node).fill);
    expect(dmFogFill.replace(/\s/g, "")).toBe("rgba(0,0,0,0.7)");
    expect(playerFogFill).toBe("rgb(0, 0, 0)");
  }).toPass();
  await map.getByRole("button", { name: "Reveal Mode" }).click();
  const canvas = map.locator(".map-canvas-stage");
  await dragMapCanvas(map, 0.2, 0.2, 0.55, 0.55);
  await expect(screen.locator(".map-fog-hole")).toHaveCount(1);
  await expect(canvas).toBeFocused();
  await dragMapCanvas(map, 0.58, 0.18, 0.72, 0.34);
  await expect(screen.locator(".map-fog-hole")).toHaveCount(2);
  await expect(canvas).toBeFocused();

  let viewportRequests = 0;
  await page.route("**/api/map/viewport", async (route) => {
    viewportRequests += 1;
    await route.continue();
  });
  const panMode = map.getByRole("button", { name: "Pan Mode" });
  await panMode.click();
  await expect(panMode).toHaveAttribute("aria-pressed", "true");
  const worldTransformBefore = await previewWorld.evaluate((node) => getComputedStyle(node).transform);
  const panBox = await canvas.boundingBox();
  expect(panBox).not.toBeNull();
  if (panBox) {
    await page.mouse.move(panBox.x + panBox.width * 0.5, panBox.y + panBox.height * 0.5);
    await page.mouse.down();
    await page.mouse.move(panBox.x + panBox.width * 0.54, panBox.y + panBox.height * 0.5);
    await page.mouse.move(panBox.x + panBox.width * 0.58, panBox.y + panBox.height * 0.5);
    await page.mouse.move(panBox.x + panBox.width * 0.62, panBox.y + panBox.height * 0.5);
    await page.mouse.up();
  }
  await expect.poll(() => previewWorld.evaluate((node) => getComputedStyle(node).transform)).not.toBe(
    worldTransformBefore
  );
  expect(viewportRequests).toBeLessThanOrEqual(2);
  await page.unroute("**/api/map/viewport");

  const pinMode = map.getByRole("button", { name: "Pin Mode" });
  await pinMode.click();
  await expect(pinMode).toHaveAttribute("aria-pressed", "true");
  await map.getByLabel("Pin label").fill("River Gate");
  await clickMapCanvas(map, 0.65, 0.45);
  await expect(screen.getByText("River Gate")).toBeVisible();
  await expect(canvas).toBeFocused();

  await map.getByRole("button", { name: "Stop Map" }).click();
  await expect(screen.locator(".screen-map")).toBeHidden();
});

test("map tool ignores stale blank refresh after loading and presenting a map", async ({
  context,
  page
}) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");
  await expect(worldTree(page).getByRole("button", { name: /sample-map/ })).toBeVisible();

  let releaseStaleMapState: (() => void) | null = null;
  let staleMapStateRequested = false;
  const staleMapState = {
    image_path: null,
    title: null,
    viewport: { center_x: 0.5, center_y: 0.5, zoom: 1 },
    grid: { enabled: false, columns: 10, rows: 10, visible_to_players: true },
    fog_enabled: false,
    reveals: [],
    pins: [],
    presenting: false,
    updated_at: "2000-01-01T00:00:00Z"
  };
  await page.route("**/api/map/state", async (route) => {
    if (route.request().method() === "GET" && !staleMapStateRequested) {
      staleMapStateRequested = true;
      await new Promise<void>((resolve) => {
        releaseStaleMapState = resolve;
      });
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(staleMapState)
      });
      return;
    }
    await route.continue();
  });

  await worldTree(page).getByRole("button", { name: /sample-map/ }).click();
  const map = await mapTool(page);
  await expect.poll(() => staleMapStateRequested).toBe(true);
  await map.getByRole("button", { name: "Use Active Image" }).click();
  await expect(map.getByText(/Current map:/)).toBeVisible();
  await expect(map.locator(".map-canvas-dm img")).toBeVisible();

  releaseStaleMapState?.();
  await expect(map.locator(".map-canvas-dm img")).toBeVisible();
  await map.getByRole("button", { name: "Present Map" }).click();
  await expect(screen.locator(".screen-map img")).toBeVisible();
});

test("map tool explains blank map state and keeps present disabled", async ({ page }) => {
  const blankMapState = {
    image_path: null,
    title: null,
    viewport: { center_x: 0.5, center_y: 0.5, zoom: 1 },
    grid: { enabled: false, columns: 10, rows: 10, visible_to_players: true },
    fog_enabled: false,
    reveals: [],
    pins: [],
    presenting: false,
    updated_at: "2026-05-11T12:00:00Z"
  };
  await page.route("**/api/map/state", async (route) => {
    if (route.request().method() === "GET") {
      await route.fulfill({
        contentType: "application/json",
        body: JSON.stringify(blankMapState)
      });
      return;
    }
    await route.continue();
  });
  await page.goto("/");

  const map = await mapTool(page);
  await expect(map.getByText("No map loaded")).toBeVisible();
  await expect(map.getByRole("button", { name: "Present Map" })).toBeDisabled();
});

test("interactive map supports grid visibility dm pins reveal undo and measure mode", async ({
  context,
  page
}) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /sample-map/ }).click();
  const map = await mapTool(page);
  await map.getByRole("button", { name: "Use Active Image" }).click();
  await expect(map.locator(".map-canvas-dm img")).toBeVisible();

  await map.getByRole("tab", { name: "Setup" }).click();
  await map.getByLabel("Grid enabled").click();
  await expect(map.getByLabel("Grid enabled")).toBeChecked();
  await map.getByLabel("Grid columns").fill("8");
  await map.getByLabel("Grid rows").fill("6");
  await map.getByRole("tab", { name: "Live" }).click();
  await expect(map.locator(".map-canvas-grid")).toBeVisible();
  await map.getByRole("button", { name: "Present Map" }).click();
  await expect(screen.locator(".screen-map")).toBeVisible();
  await expect(screen.locator(".map-canvas-grid")).toBeVisible();

  await map.getByRole("tab", { name: "Setup" }).click();
  await map.getByLabel("Grid visible to players").click();
  await expect(map.getByLabel("Grid visible to players")).not.toBeChecked();
  await map.getByRole("tab", { name: "Live" }).click();
  await expect(map.locator(".map-canvas-grid")).toBeVisible();
  await expect(screen.locator(".map-canvas-grid")).toHaveCount(0);

  const canvas = map.locator(".map-canvas-stage");
  const pinMode = map.getByRole("button", { name: "Pin Mode" });
  await pinMode.click();
  await expect(pinMode).toHaveAttribute("aria-pressed", "true");
  await map.getByLabel("Pin label").fill("Visible Gate");
  await map.getByLabel("Pin visibility").selectOption("player");
  await clickMapCanvas(map, 0.3, 0.35);

  await map.getByLabel("Pin label").fill("Hidden Trap");
  await map.getByLabel("Pin visibility").selectOption("dm");
  await clickMapCanvas(map, 0.7, 0.55);
  await expect(map.locator(".map-canvas-pin", { hasText: "Visible Gate" })).toBeVisible();
  await expect(map.locator(".map-canvas-pin", { hasText: "Hidden Trap" })).toBeVisible();
  await expect(map.locator(".map-canvas-pin-dm-only")).toHaveCount(1);
  await expect(screen.getByText("Visible Gate")).toBeVisible();
  await expect(screen.getByText("Hidden Trap")).toHaveCount(0);

  await map.getByLabel("Fog enabled").click();
  await expect(map.getByLabel("Fog enabled")).toBeChecked();
  await map.getByRole("button", { name: "Reveal Mode" }).click();
  await dragMapCanvas(map, 0.15, 0.15, 0.35, 0.35);
  await dragMapCanvas(map, 0.5, 0.5, 0.75, 0.75);
  await expect(screen.locator(".map-fog-hole")).toHaveCount(2);
  await map.getByRole("button", { name: "Undo Reveal" }).click();
  await expect(screen.locator(".map-fog-hole")).toHaveCount(1);

  await map.getByRole("button", { name: "Measure Mode" }).click();
  const stage = map.locator(".map-canvas-stage");
  await stage.dragTo(stage, {
    sourcePosition: await mapCanvasPoint(map, 0.2, 0.6),
    targetPosition: await mapCanvasPoint(map, 0.45, 0.6),
    trial: true
  });
  await stage.hover({ position: await mapCanvasPoint(map, 0.2, 0.6) });
  await page.mouse.down();
  await stage.hover({ position: await mapCanvasPoint(map, 0.45, 0.6) });
  await expect(map.locator(".map-canvas-measurement-label")).toBeVisible();
  await expect(screen.locator(".map-canvas-measurement-label")).toHaveCount(0);
  await page.mouse.up();
});

test("interactive map keeps canvas focus and can save and load presets", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /sample-map/ }).click();
  const map = await mapTool(page);
  await map.getByRole("button", { name: "Use Active Image" }).click();
  await expect(map.locator(".map-canvas-dm img")).toBeVisible();

  await map.getByRole("tab", { name: "Setup" }).click();
  await map.getByLabel("Grid enabled").click();
  await map.getByLabel("Grid columns").fill("9");
  await map.getByLabel("Grid rows").fill("7");
  await map.getByRole("tab", { name: "Live" }).click();
  await map.getByLabel("Fog enabled").click();
  await map.getByRole("button", { name: "Reveal Mode" }).click();
  await dragMapCanvas(map, 0.2, 0.2, 0.4, 0.4);
  await expect(map.locator(".map-canvas-stage")).toBeFocused();

  await map.getByRole("button", { name: "Pin Mode" }).click();
  await map.getByLabel("Pin label").fill("Saved Gate");
  await clickMapCanvas(map, 0.55, 0.45);
  await expect(map.locator(".map-canvas-stage")).toBeFocused();

  await map.getByRole("tab", { name: "Setup" }).click();
  await map.getByLabel("Preset name").fill("Session setup");
  await map.getByRole("button", { name: "Save Preset" }).click();
  await expect(map.getByRole("button", { name: "Load Session setup" })).toBeVisible();

  await map.getByRole("tab", { name: "Live" }).click();
  await map.getByRole("button", { name: "Clear Reveals" }).click();
  await map.locator(".map-pin-row", { hasText: "Saved Gate" }).getByRole("button", { name: "Remove" }).click();
  await map.getByRole("tab", { name: "Setup" }).click();
  await map.getByLabel("Grid enabled").click();
  await map.getByRole("tab", { name: "Live" }).click();
  await expect(map.locator(".map-canvas-pin", { hasText: "Saved Gate" })).toHaveCount(0);
  await expect(map.locator(".map-canvas-grid")).toHaveCount(0);
  await expect(map.locator(".map-fog-hole")).toHaveCount(0);

  await map.getByRole("tab", { name: "Setup" }).click();
  await map.getByRole("button", { name: /Load Session setup/ }).click();
  await map.getByRole("tab", { name: "Live" }).click();
  await expect(map.locator(".map-canvas-pin", { hasText: "Saved Gate" })).toBeVisible();
  await expect(map.locator(".map-canvas-grid")).toBeVisible();
  await expect(map.locator(".map-fog-hole")).toHaveCount(1);
});

test("public screen routes only expose displayed content and embeds", async ({
  context,
  page,
  request
}) => {
  expect((await request.get(screenPathUrl("/api/screen/world/file", "README.md"))).status()).toBe(
    403
  );
  expect(
    (await request.get(screenPathUrl("/api/screen/world/media", "Media/animated-map.gif"))).status()
  ).toBe(403);

  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");
  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  const controls = await screenTool(page);
  await controls.getByRole("button", { name: "Show Active Fullscreen" }).click();

  await expect(screen.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
  await expect(screen.getByRole("img", { name: "Sample Map" })).toBeVisible();

  expect((await request.get(screenPathUrl("/api/screen/world/file", "README.md"))).status()).toBe(
    200
  );
  expect(
    (await request.get(screenPathUrl("/api/screen/page/links", "README.md"))).status()
  ).toBe(200);
  expect(
    (await request.get(screenPathUrl("/api/screen/world/media", "Media/sample-map.svg"))).status()
  ).toBe(200);
  expect(
    (
      await request.get(screenPathUrl("/api/screen/world/file", "NPCs/Captain Ilyra.md"))
    ).status()
  ).toBe(403);
  expect(
    (await request.get(screenPathUrl("/api/screen/world/media", "Media/animated-map.gif"))).status()
  ).toBe(403);
});

test("blank player screen uses optional world background image", async ({ context, page, request }) => {
  mkdirSync(resolve(e2eWorld, ".virtualscreen"), { recursive: true });
  writeFileSync(resolve(e2eWorld, ".virtualscreen", "screen-background.png"), tinyPng);

  const backgroundResponse = await request.get("/api/screen/display/background");
  expect(backgroundResponse.status()).toBe(200);

  const screen = await context.newPage();
  await screen.goto("/screen");

  await page.goto("/");
  const controls = await screenTool(page);
  await controls.getByRole("button", { name: "Blank Screen" }).click();

  const blankSurface = screen.locator(".screen-fullscreen-blank");
  await expect(blankSurface).toBeVisible();
  await expect(blankSurface).toHaveCSS("background-image", /api\/screen\/display\/background/);
});

test("player screen has no DM-only controls", async ({ page }) => {
  await page.goto("/screen");

  await expect(page.getByRole("button", { name: "Search" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Edit" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Trash" })).toHaveCount(0);
});

test("shows unsupported file state", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "roll.bin" }).click();

  await expect(page.getByRole("tab", { name: "roll.bin" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unsupported File" })).toBeVisible();
});

test("opens multiple tabs, switches, and closes the active tab", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await worldTree(page).getByRole("button", { name: "random-events.csv" }).click();
  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "random-events.csv" })).toBeVisible();

  await page.getByRole("tab", { name: "Sample World Guide" }).click();
  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();

  await page.getByRole("button", { name: "Close README.md" }).click();
  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toBeHidden();
  await expect(page.getByRole("columnheader", { name: "result" })).toBeVisible();
});

test("search hotkey opens search and navigates to a result", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Select a File")).toBeVisible();
  await page.locator("body").click();

  await page.keyboard.press("Control+K");
  const search = page.getByRole("region", { name: "Global Search" });
  await expect(search).toBeVisible();

  await search.getByRole("searchbox", { name: "Search World" }).fill("Ilyra");
  await search
    .getByRole("button", { name: /^Captain Ilyra\s+NPCs\/Captain Ilyra\.md/ })
    .click();

  await expect(page.getByRole("tab", { name: "Captain Ilyra" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Captain Ilyra" })).toBeVisible();
});

test("search finds aliases and tags", async ({ page }) => {
  await page.goto("/");

  let search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("Home");
  await expect(search.getByRole("button", { name: /Sample World Guide/ })).toBeVisible();

  search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("city-watch");
  await expect(
    search.getByRole("button", { name: /^Captain Ilyra\s+NPCs\/Captain Ilyra\.md/ })
  ).toBeVisible();
});

test("capture dialog stays closed until opened", async ({ page }) => {
  await page.goto("/");

  await expect(workspaceControls(page).getByRole("button", { name: "Capture" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Quick Capture" })).toBeHidden();
});

test("HP tool stays closed until opened", async ({ page }) => {
  await page.goto("/");

  const hpHeader = toolsPanel(page).getByRole("button", { name: /^HP/ });
  await expect(hpHeader).toBeVisible();
  await expect(hpHeader).toHaveAttribute("aria-expanded", "false");
  await expect(toolsPanel(page).getByRole("region", { name: "HP Scratchpad" })).toBeHidden();
});

test("HP scratchpad saves rows, reloads, and isolates workspaces", async ({ page }) => {
  await page.goto("/");

  let hp = await hpTool(page);
  await hp.getByRole("button", { name: "Add", exact: true }).click();
  let firstRow = hp.locator(".hp-row").first();
  await firstRow.getByPlaceholder("Name").fill("Goblin");
  await firstRow.getByLabel(/Current HP/).fill("9");
  await firstRow.getByLabel(/Max HP/).fill("12");
  await firstRow.getByPlaceholder("Status").fill("hurt");
  await firstRow.getByPlaceholder("Status").blur();
  firstRow = hp.locator(".hp-row").first();
  await expect(firstRow.getByRole("button", { name: "-5" })).toBeEnabled();
  await firstRow.getByRole("button", { name: "-5" }).click();
  await expect(firstRow.getByLabel(/Current HP/)).toHaveValue("4");

  await hp.getByRole("button", { name: "Add", exact: true }).click();
  await expect(toolsPanel(page).getByRole("button", { name: /^HP/ })).toContainText(
    "2 rows, 1 down"
  );

  await page.reload();
  hp = await hpTool(page);
  firstRow = hp.locator(".hp-row").first();
  await expect(firstRow.getByPlaceholder("Name")).toHaveValue("Goblin");
  await expect(firstRow.getByLabel(/Current HP/)).toHaveValue("4");

  const workspaceName = `HP ${Date.now()}`;
  const workspaceControls = page.locator(".workspace-controls");
  await workspaceControls.getByRole("button", { name: "New", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "New Workspace" });
  await dialog.getByLabel("Workspace name").fill(workspaceName);
  await dialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.getByLabel("Select workspace")).toContainText(workspaceName);
  hp = await hpTool(page);
  await expect(hp.locator(".hp-row")).toHaveCount(0);

  await hp.getByRole("button", { name: "Add", exact: true }).click();
  await hp.locator(".hp-row").first().getByPlaceholder("Name").fill("Ogre");
  await hp.locator(".hp-row").first().getByRole("button", { name: "+5" }).click();

  await page.getByLabel("Select workspace").selectOption({ label: "Default" });
  hp = await hpTool(page);
  await expect(hp.locator(".hp-row").first().getByPlaceholder("Name")).toHaveValue("Goblin");

  await page.getByLabel("Select workspace").selectOption({ label: workspaceName });
  hp = await hpTool(page);
  await expect(hp.locator(".hp-row").first().getByPlaceholder("Name")).toHaveValue("Ogre");

  await hp.getByRole("button", { name: "Clear", exact: true }).click();
  await hp.getByRole("button", { name: "Confirm Clear", exact: true }).click();
  await expect(hp.locator(".hp-row")).toHaveCount(0);
});

test("capture tool saves an Idea and adds the log to the tree", async ({ page }) => {
  await page.goto("/");

  const capture = await quickCaptureTool(page);
  await chooseCaptureCategory(capture, "Idea");
  await capture.getByLabel("Capture text").fill("Idea: the locked observatory hums at midnight.");
  await capture.getByRole("button", { name: "Save Capture" }).click();

  await expect(
    worldTree(page).getByRole("button", { name: /Session Log .*\.md/ }).last()
  ).toBeVisible();
});

test("capture Open Log opens markdown tab with captured text", async ({ page }) => {
  await page.goto("/");

  const capturedText = "The brass key only turns while the moon is reflected.";
  const capture = await quickCaptureTool(page);
  await chooseCaptureCategory(capture, "Idea");
  await capture.getByLabel("Capture text").fill(capturedText);
  await capture.getByRole("button", { name: "Save Capture" }).click();
  await capture.getByRole("button", { name: "Open Log" }).click();

  await expect(page.getByRole("tab", { name: /Session Log/ })).toBeVisible();
  await expect(page.getByRole("region", { name: "Main viewer pane" })).toContainText(capturedText);
});

test("capture log keeps separate sections for two saved categories", async ({ page }) => {
  await page.goto("/");

  const capture = await quickCaptureTool(page);
  await chooseCaptureCategory(capture, "Idea");
  await capture.getByLabel("Capture text").fill("First category entry.");
  const firstCaptureSaved = page.waitForResponse(
    (response) =>
      response.url().includes("/api/capture") &&
      response.request().method() === "POST"
  );
  await capture.getByRole("button", { name: "Save Capture" }).click();
  await firstCaptureSaved;

  await chooseCaptureCategory(capture, "Todo");
  await capture.getByLabel("Capture text").fill("Second category entry.");
  const secondCaptureSaved = page.waitForResponse(
    (response) =>
      response.url().includes("/api/capture") &&
      response.request().method() === "POST"
  );
  await capture.getByRole("button", { name: "Save Capture" }).click();
  await secondCaptureSaved;
  await capture.getByRole("button", { name: "Open Log" }).click();

  await expect(page.getByRole("heading", { name: "Ideas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Todos" })).toBeVisible();
});

test("capture saves with Ctrl+Enter", async ({ page }) => {
  await page.goto("/");

  const capturedText = "Ctrl Enter capture from the council chamber.";
  const capture = await quickCaptureTool(page);
  await chooseCaptureCategory(capture, "Idea");
  await capture.getByLabel("Capture text").fill(capturedText);
  await page.keyboard.press("Control+Enter");
  await capture.getByRole("button", { name: "Open Log" }).click();

  await expect(page.getByRole("region", { name: "Main viewer pane" })).toContainText(capturedText);
});

test("capture unsaved draft survives reload locally", async ({ page }) => {
  await page.goto("/");

  const draftText = "Unsaved capture draft before the door opens.";
  let capture = await quickCaptureTool(page);
  await chooseCaptureCategory(capture, "Idea");
  await capture.getByLabel("Capture text").fill(draftText);

  await page.reload();

  capture = await quickCaptureTool(page);
  await expect(capture.getByLabel("Capture text")).toHaveValue(draftText);
});

test("search finds saved capture text", async ({ page }) => {
  await page.goto("/");

  const capturedText = "Searchable capture phrase violet hourglass.";
  const capture = await quickCaptureTool(page);
  await chooseCaptureCategory(capture, "Idea");
  await capture.getByLabel("Capture text").fill(capturedText);
  const captureSaved = page.waitForResponse(
    (response) =>
      response.url().includes("/api/capture") &&
      response.request().method() === "POST"
  );
  await capture.getByRole("button", { name: "Save Capture" }).click();
  await captureSaved;
  await expect(capture.locator(".capture-status")).toContainText("Saved to");
  await page.getByRole("button", { name: "Close Capture" }).click();

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill(capturedText);
  await expect(search).toContainText(capturedText);
});

test("Prep Check reports broken links embeds cards and DMS references @smoke", async ({ page }) => {
  writeFileSync(
    resolve(e2eWorld, "Notes", "prep-broken.md"),
    "# Prep Broken\n\n[[Missing Prep Target]]\n\n![[Media/missing-prep.png]]\n",
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Cards", "Prep Broken.cs"),
    JSON.stringify(
      {
        kind: "npc",
        title: "Prep Broken Card",
        tags: [],
        sections: [
          {
            title: "Core",
            fields: {
              Hook: "[[Missing Card Prep]]"
            }
          }
        ]
      },
      null,
      2
    ),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Scripts", "prep_missing.dms"),
    [
      "screen_fs('Missing/screen.md')",
      "audio_play('.music/effects/missing-prep.wav')"
    ].join("\n"),
    "utf-8"
  );

  await page.goto("/");
  await workspaceControls(page).getByRole("button", { name: "Prep Check" }).click();
  const dialog = page.getByRole("dialog", { name: "Prep Check" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Run Check" }).click();

  await expect(dialog).toContainText("6 issues found.");
  await expect(dialog).toContainText("Missing Prep Target");
  await expect(dialog).toContainText("Missing embedded reference: Media/missing-prep.png");
  await expect(dialog).toContainText("Missing Card Prep");
  await expect(dialog).toContainText("screen_fs");
  await expect(dialog).toContainText("audio_play");
  await expect(toolsPanel(page).getByRole("button", { name: /Prep|Health/ })).toHaveCount(0);
});

test("Prep Check opens issue sources and drops fixed issues on rerun", async ({ page }) => {
  writeFileSync(
    resolve(e2eWorld, "Notes", "prep-source.md"),
    "# Prep Source\n\n[[Missing Later]]\n",
    "utf-8"
  );

  await page.goto("/");
  await workspaceControls(page).getByRole("button", { name: "Prep Check" }).click();
  const dialog = page.getByRole("dialog", { name: "Prep Check" });
  await dialog.getByRole("button", { name: "Run Check" }).click();
  await expect(dialog).toContainText("2 issues found.");

  const issue = dialog.locator(".prep-health-issue", { hasText: "Missing Later" });
  await issue.getByRole("button", { name: "Open Source" }).click();
  await expect(page.getByRole("tab", { name: /Prep Source/ })).toBeVisible();

  writeFileSync(resolve(e2eWorld, "Missing Later.md"), "# Missing Later\n", "utf-8");
  await dialog.getByRole("button", { name: "Run Check" }).click();
  await expect(dialog).toContainText("1 issue found.");
  await dialog.getByRole("tab", { name: "Errors" }).click();
  await expect(dialog).toContainText("No issues in this filter.");
});

test("opening files creates recents", async ({ page }) => {
  await page.goto("/");

  await captainTreeButton(page).click();

  const recent = page.getByRole("region", { name: "Recent" });
  await recent.getByRole("button", { name: /Recent/ }).click();
  await expect(recent.getByRole("button", { name: /Captain Ilyra/ })).toBeVisible();
});

test("favorites survive reload", async ({ page }) => {
  await page.goto("/");

  const captain = await captainTreeButton(page);
  await captain.click();
  await captain.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Favorite" }).click();

  const favorites = page.getByRole("region", { name: "Favorites" });
  await expect(favorites.getByRole("button", { name: /Captain Ilyra/ })).toBeVisible();

  await page.waitForTimeout(300);
  await page.reload();

  await expect(favorites.getByRole("button", { name: /Captain Ilyra/ })).toBeVisible();
});

test("open tabs and active tab survive reload", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await worldTree(page).getByRole("button", { name: "random-events.csv" }).click();
  await page.getByRole("tab", { name: "Sample World Guide" }).click();

  await page.waitForTimeout(300);
  await page.reload();

  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(page.getByRole("tab", { name: "random-events.csv" })).toBeVisible();
});

test("edits markdown, saves, reloads, and shows persisted content", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await enterEditMode(page);
  await expect(page.getByRole("textbox", { name: "Markdown editor" })).not.toContainText("---");
  await fillCodeEditor(page, "Markdown editor", "# Edited Home\n\nSaved during e2e.");
  await toggleMarkdownSplit(page);
  await expect(page.getByRole("region", { name: "Markdown preview pane" })).toContainText(
    "Edited Home"
  );
  await expect(page.getByRole("tab", { name: /Sample World Guide \*/ })).toBeVisible();

  await saveActiveDraft(page);
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);
  await page.waitForTimeout(300);
  await page.reload();

  await expect(page.getByRole("heading", { name: "Edited Home" })).toBeVisible();
});

test("reverts markdown changes before save", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await enterEditMode(page);
  await fillCodeEditor(page, "Markdown editor", "# Not Saved");
  await revertDirtyDraft(page);

  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
  await expect(page.getByText("Not Saved")).toBeHidden();
});

test("edits a CSV cell, saves, reloads, and shows persisted value", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "random-events.csv" }).click();
  await enterEditMode(page);
  await page.getByRole("textbox", { name: "Cell 1-2" }).fill("A fog bank rolls in");
  await saveActiveDraft(page);
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);
  await page.waitForTimeout(300);
  await page.reload();

  await expect(page.getByText("A fog bank rolls in")).toBeVisible();
});

test("adds a CSV row and column, saves, and previews the new shape", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "random-events.csv" }).click();
  await enterEditMode(page);
  const addColumn = page.getByRole("button", { name: "Add Column" });
  const addRow = page.getByRole("button", { name: "Add Row" });
  const lastHeader = page.getByRole("textbox", { name: "Header 3" });
  const lastBodyRow = page.locator(".csv-editor tbody tr").last();
  await expect(async () => {
    const addColumnBox = await addColumn.boundingBox();
    const addRowBox = await addRow.boundingBox();
    const headerBox = await lastHeader.boundingBox();
    const rowBox = await lastBodyRow.boundingBox();
    expect(addColumnBox).not.toBeNull();
    expect(addRowBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(rowBox).not.toBeNull();
    expect(addColumnBox?.x ?? 0).toBeGreaterThan((headerBox?.x ?? 0) + (headerBox?.width ?? 0) - 1);
    expect(addRowBox?.y ?? 0).toBeGreaterThan((rowBox?.y ?? 0) + (rowBox?.height ?? 0) - 1);
  }).toPass();

  await addColumn.click();
  await addRow.click();
  await page.getByRole("textbox", { name: "Header 4" }).fill("secret");
  await page.getByRole("textbox", { name: "Cell 5-4" }).fill("hidden door");
  await saveActiveDraft(page);
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);
  await previewCleanDraft(page);

  await expect(page.getByRole("columnheader", { name: "secret" })).toBeVisible();
  await expect(page.getByText("hidden door")).toBeVisible();
});

test.describe("table state snapshots V1", () => {
  test("saves restores and deletes the current table state from Actions", async ({
    context,
    page
  }) => {
    const snapshotName = `Opening table ${Date.now()}`;
    const screen = await context.newPage();
    await screen.goto("/screen");
    await page.goto("/");

    await worldTree(page).getByRole("button", { name: /effects_demo\.dms/ }).click();
    await runActiveScript(page);
    await expect(toolsPanel(page).getByRole("button", { name: /Screen sample-map/ })).toBeVisible();
    const audio = await audioTool(page);
    const effectBus = audio.getByRole("region", { name: "Effect Bus" });
    await expect(effectBus.locator(".audio-bus-heading").getByText("broken-glass")).toBeVisible();
    await expect(effectBus.getByRole("button", { name: "Pause" })).toBeVisible();

    await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
    let screenControls = await screenTool(page);
    await screenControls.getByRole("tab", { name: "Display" }).click();
    await screenControls.getByRole("button", { name: "Blank Screen" }).click();
    await screenControls.getByRole("button", { name: "Show Active Fullscreen" }).click();

    await captainTreeButton(page).click();
    screenControls = await screenTool(page);
    await screenControls.getByLabel("Popup preset").selectOption("letter");
    await screenControls.getByRole("button", { name: "Open Active as Popup" }).click();

    await worldTree(page).getByRole("button", { name: /random-events\.csv/ }).click();
    screenControls = await screenTool(page);
    await screenControls.getByRole("button", { name: "Stage Active as Popup" }).click();

    await worldTree(page).getByRole("button", { name: /sample-map/ }).click();
    const map = await mapTool(page);
    const sourceLoaded = page.waitForResponse((response) =>
      response.url().includes("/api/map/source")
    );
    await map.getByRole("button", { name: "Use Active Image" }).click();
    await sourceLoaded;
    await expect(map.locator(".map-canvas-dm img")).toBeVisible();
    const mapPresented = page.waitForResponse((response) =>
      response.url().includes("/api/map/present")
    );
    await map.getByRole("button", { name: "Present Map" }).click();
    await mapPresented;
    await expect(map.getByRole("button", { name: "Stop Map" })).toBeEnabled();
    await expect(screen.locator(".screen-map")).toBeVisible();

    await openToolSection(page, "Actions");
    const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
    await actions.getByRole("tab", { name: "State" }).click();
    const tableState = actions.getByRole("region", { name: "Table State Snapshots" });
    await tableState.getByLabel("Title").fill(snapshotName);
    await actions.getByRole("button", { name: "Save Current" }).click();
    await expect(actions.getByText(`Saved ${snapshotName}`)).toBeVisible();

    screenControls = await screenTool(page);
    await screenControls.getByRole("tab", { name: "Display" }).click();
    await screenControls.getByRole("button", { name: "Blank Screen" }).click();
    const mapAfterSnapshot = await mapTool(page);
    await mapAfterSnapshot.getByRole("button", { name: "Stop Map" }).click();
    await expect(screen.locator(".screen-map")).toBeHidden();
    await expect(screen.getByRole("region", { name: "Popup Captain Ilyra" })).toBeHidden();
    const audioAfterChanges = await audioTool(page);
    const effectBusAfterChanges = audioAfterChanges.getByRole("region", { name: "Effect Bus" });
    await audioAfterChanges.getByRole("button", { name: "Stop All Audio" }).click();
    await expect(effectBusAfterChanges.getByRole("button", { name: "Play" })).toBeVisible();

    await openToolSection(page, "Actions");
    const actionsAfterChanges = toolsPanel(page).getByRole("region", {
      name: "Fast Slot Configuration"
    });
    await actionsAfterChanges.getByRole("tab", { name: "State" }).click();
    await actionsAfterChanges.getByRole("button", { name: "Load" }).click();
    await actionsAfterChanges.getByRole("button", { name: "Confirm Load" }).click();
    await expect(actionsAfterChanges.getByText(`Loaded ${snapshotName}`)).toBeVisible();

    await expect(screen.locator(".screen-map")).toBeVisible();
    await expect(screen.getByRole("region", { name: "Popup Captain Ilyra" })).toBeVisible();
    await expect(screen.getByRole("region", { name: /Popup Random Events/ })).toBeHidden();
    const restoredAudio = await audioTool(page);
    const restoredEffectBus = restoredAudio.getByRole("region", { name: "Effect Bus" });
    await expect(
      restoredEffectBus.locator(".audio-bus-heading").getByText("broken-glass")
    ).toBeVisible();
    await expect(restoredEffectBus.getByRole("button", { name: "Pause" })).toBeVisible();
    await expect(page.getByRole("tab", { name: /sample-map/ })).toBeVisible();

    await openToolSection(page, "Actions");
    const actionsAfterRestore = toolsPanel(page).getByRole("region", {
      name: "Fast Slot Configuration"
    });
    await actionsAfterRestore.getByRole("tab", { name: "State" }).click();
    await actionsAfterRestore.getByRole("button", { name: "Delete" }).click();
    await actionsAfterRestore.getByRole("button", { name: "Confirm Delete" }).click();
    await expect(actionsAfterRestore.getByText("Deleted table state.")).toBeVisible();
  });
});

test("shows live conflict state and keeps unsaved markdown visible", async ({
  page,
  request
}) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await enterEditMode(page);
  await fillCodeEditor(page, "Markdown editor", "# Unsaved Conflict Text");

  const current = await (await request.get("/api/world/file?path=README.md")).json();
  await request.put("/api/world/file?path=README.md", {
    data: {
      content: "# External Change",
      expected_modified_at: current.modified_at,
      expected_hash: current.hash
    }
  });

  await expect(page.locator(".editor-status")).toHaveText("Changed on disk", {
    timeout: 10_000
  });
  await expect(page.getByRole("textbox", { name: "Markdown editor" })).toContainText(
    "# Unsaved Conflict Text"
  );
  await expect(
    page.getByRole("region", { name: "Document status" }).getByRole("button", { name: "Save" })
  ).toHaveCount(0);
});

test("creates markdown note, opens it, and indexes it for search", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "Add in world" }).click();
  await page.getByRole("button", { name: "New Markdown" }).click();
  const dialog = page.getByRole("dialog", { name: "New File" });
  await dialog.getByLabel("New file path").fill("Session Clue.md");
  await dialog.getByRole("button", { name: "Create File" }).click();

  await expect(page.getByRole("tab", { name: "Session Clue" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Session Clue" })).toBeVisible();
  await expect(worldTree(page).getByText("Session Clue.md")).toBeVisible();

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("Session Clue");
  await expect(search.getByRole("button", { name: /Session Clue/ })).toBeVisible();
});

test("creates CSV table and opens editable grid", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "Add in world" }).click();
  await page.getByRole("button", { name: "New CSV" }).click();
  const dialog = page.getByRole("dialog", { name: "New File" });
  await dialog.getByLabel("New file path").fill("custom-rolls.csv");
  await dialog.getByRole("button", { name: "Create File" }).click();

  await expect(page.getByRole("tab", { name: /custom-rolls/ })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "result" })).toBeVisible();
  await enterEditMode(page);
  await expect(page.getByRole("textbox", { name: "Header 1" })).toHaveValue("result");
  await expect(page.getByRole("textbox", { name: "Header 2" })).toHaveValue("event");
});

test("creates edits and searches DMS scripts", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "Add in world" }).click();
  await page.getByRole("button", { name: "New Script" }).click();
  const dialog = page.getByRole("dialog", { name: "New File" });
  await dialog.getByLabel("New file path").fill("hello_world.dms");
  await dialog.getByRole("button", { name: "Create File" }).click();

  await expect(page.getByRole("tab", { name: "hello_world" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Main viewer pane" }).locator(".text-viewer")).toContainText(
    "Write DMS script here"
  );

  await enterEditMode(page);
  await fillCodeEditor(page, "DMS editor", "render_md('# Hello DMS')\n");
  await saveActiveDraft(page);
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("Hello DMS");
  await expect(search.getByRole("region", { name: "Scripts Results" })).toContainText(
    "hello_world"
  );
});

test("folder add menu creates a structured card and opens it", async ({ page }) => {
  await page.goto("/");

  await expect(worldTree(page).getByRole("button", { name: "Cards", exact: true })).toBeVisible();
  await worldTree(page).getByRole("button", { name: "Add in Cards" }).click();
  const newCardButton = worldTree(page)
    .getByRole("menu")
    .getByRole("button", { name: "New Card", exact: true });
  await expect(newCardButton).toBeVisible();
  await newCardButton.click();
  const dialog = page.getByRole("dialog", { name: /New (File|Card)/ });
  await dialog.getByLabel(/New (file|card) path/i).fill("Cards/Playwright Sigil.cs");
  await dialog.getByRole("button", { name: /Create (File|Card)/ }).click();

  await expect(page.getByRole("tab", { name: "Playwright Sigil" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Playwright Sigil" })).toBeVisible();
  await expect(worldTree(page).getByText("Playwright Sigil.cs")).toBeVisible();
});

test("world-local card templates stay hidden from tree and search", async ({ page }) => {
  await page.goto("/");

  await expect(worldTree(page).getByRole("button", { name: ".virtualscreen" })).toBeHidden();
  await expect(worldTree(page).getByText("card-templates")).toBeHidden();
  await expect(worldTree(page).getByText("npc-contact.json")).toBeHidden();

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("world-local-template-hidden-token");
  await expect(search.getByText("No results.")).toBeVisible();
});

test("workspace New Card can use a world-local card template", async ({ page }) => {
  await page.goto("/");

  await workspaceControls(page).getByRole("button", { name: "New Card" }).click();
  const dialog = page.getByRole("dialog", { name: "New Card" });
  const templateSelect = dialog.getByLabel("Card template");
  const worldLocalOption = templateSelect.locator("option", {
    hasText: /NPC Contact.*world/i
  });
  await expect(worldLocalOption).toHaveCount(1);
  const worldLocalValue = await worldLocalOption.first().getAttribute("value");
  expect(worldLocalValue).toBeTruthy();
  await templateSelect.selectOption(worldLocalValue ?? "");
  await dialog.getByLabel("Card title").fill("Playwright Contact");
  await dialog.getByLabel(/New (file|card) path/i).fill("Cards/Playwright Contact.cs");
  await dialog.getByRole("button", { name: "Create Card" }).click();

  await expect(page.getByRole("tab", { name: "Playwright Contact" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Playwright Contact" })).toBeVisible();
  await expect(page.getByText("Leverage", { exact: true })).toBeVisible();
});

test("workspace New Card can create and edit a V2 layout card", async ({ page }) => {
  await page.goto("/");

  await workspaceControls(page).getByRole("button", { name: "New Card" }).click();
  const dialog = page.getByRole("dialog", { name: "New Card" });
  const templateSelect = dialog.getByLabel("Card template");
  const v2Option = templateSelect.locator("option", {
    hasText: /Basic Character Sheet V2.*world/i
  });
  await expect(v2Option).toHaveCount(1);
  const v2Value = await v2Option.first().getAttribute("value");
  expect(v2Value).toBeTruthy();
  await templateSelect.selectOption(v2Value ?? "");
  await dialog.getByLabel("Card title").fill("Playwright V2 Hero");
  await dialog.getByLabel(/New (file|card) path/i).fill("Cards/Playwright V2 Hero.cs");
  await dialog.getByRole("button", { name: "Create Card" }).click();

  const mainPane = page.getByRole("region", { name: "Main viewer pane" });
  await expect(page.getByRole("heading", { name: "Playwright V2 Hero" })).toBeVisible();
  await expectWorkspaceActivePath(page, "Cards/Playwright V2 Hero.cs");
  await expect(mainPane).toContainText("Identity");
  await expect(mainPane).toContainText("Abilities");
  await expect(mainPane).toContainText("Attacks");

  await enterEditMode(page);
  await page.getByLabel("Card title").fill("Playwright V2 Hero Revised");
  await page.getByLabel("Card tags").fill("character, v2, e2e-v2");
  await page.getByLabel("Field value 1-1").fill("Morgan");
  await page.getByLabel("Field value 1-2").fill("Wizard");
  await page.getByLabel("Field value 1-3").fill("5");
  await saveActiveDraft(page);
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);
  await expectWorkspaceActivePath(page, "Cards/Playwright V2 Hero.cs");

  await page.reload();
  await expect(page.getByRole("heading", { name: "Playwright V2 Hero Revised" })).toBeVisible();
  await expect(mainPane).toContainText("Morgan");
  await expect(mainPane).toContainText("Wizard");
  await expect(mainPane).toContainText("5");

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("Morgan");
  await expect(search.getByRole("button", { name: /Playwright V2 Hero Revised/ })).toBeVisible();
});

test("V2 sample cards render layouts and participate in search", async ({ page }) => {
  await page.goto("/");

  await openCardsFile(page, "Monster Stat Card\\.cs");
  let mainPane = page.getByRole("region", { name: "Main viewer pane" });
  await expect(page.getByRole("heading", { name: "Monster Stat Card" })).toBeVisible();
  await expect(mainPane).toContainText("Clockwork scout");
  await expect(mainPane).toContainText("Saltwater locks its wing joints.");

  await openCardsFile(page, "Item Reference Table\\.cs");
  mainPane = page.getByRole("region", { name: "Main viewer pane" });
  await expect(page.getByRole("heading", { name: "Item Reference Table" })).toBeVisible();
  await expect(mainPane).toContainText("Moonlit Compass");
  await expect(mainPane.getByRole("link", { name: "Moonlit Compass" })).toBeVisible();

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("Saltwater locks");
  await expect(search.getByRole("button", { name: /Monster Stat Card/ })).toBeVisible();
  await search.getByRole("searchbox", { name: "Search World" }).fill("Tideglass Token");
  await expect(search.getByRole("button", { name: /Item Reference Table/ })).toBeVisible();
});

test("card table add controls sit at the table edges", async ({ page }) => {
  await page.goto("/");

  await openCardsFile(page, "Item Reference Table\\.cs");
  await enterEditMode(page);
  const addColumn = page.getByRole("button", { name: "Add table column 1" });
  const addRow = page.getByRole("button", { name: "Add table row 1" });
  const lastHeader = page.getByRole("textbox", { name: "Table column 1-4" });
  const lastBodyRow = page.locator(".card-editor-table-grid tbody tr").last();
  await expect(async () => {
    const addColumnBox = await addColumn.boundingBox();
    const addRowBox = await addRow.boundingBox();
    const headerBox = await lastHeader.boundingBox();
    const rowBox = await lastBodyRow.boundingBox();
    expect(addColumnBox).not.toBeNull();
    expect(addRowBox).not.toBeNull();
    expect(headerBox).not.toBeNull();
    expect(rowBox).not.toBeNull();
    expect(addColumnBox?.x ?? 0).toBeGreaterThan((headerBox?.x ?? 0) + (headerBox?.width ?? 0) - 1);
    expect(addRowBox?.y ?? 0).toBeGreaterThan((rowBox?.y ?? 0) + (rowBox?.height ?? 0) - 1);
  }).toPass();

  await addColumn.click();
  await addRow.click();
  await page.getByRole("textbox", { name: "Table column 1-5" }).fill("GM");
  await page.getByRole("textbox", { name: "Table cell 1-3-5" }).fill("Secret shelf");
  await saveActiveDraft(page);
  await previewCleanDraft(page);
  await expect(page.getByRole("columnheader", { name: "GM" })).toBeVisible();
  await expect(page.getByText("Secret shelf")).toBeVisible();
});

test("computed sample card renders formulas and updates when source fields change", async ({
  page
}) => {
  await page.goto("/");

  await openCardsFile(page, "Computed Character Sheet\\.cs");
  const mainPane = page.getByRole("region", { name: "Main viewer pane" });
  await expect(page.getByRole("heading", { name: "Computed Character Sheet" })).toBeVisible();
  await expectWorkspaceActivePath(page, "Cards/Computed Character Sheet.cs");
  await expect(mainPane.locator(".card-field-row", { hasText: "WIS Bonus" })).toContainText("+3");
  await expect(mainPane.locator(".card-field-row", { hasText: "Perception_bonus" })).toContainText(
    "+6"
  );
  await expect(mainPane.locator(".card-field-row", { hasText: "STR Plus Three" })).toContainText(
    "13"
  );

  await enterEditMode(page);
  await page.getByLabel("Field value 2-2").fill("8");
  await saveActiveDraft(page);
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);
  await expectWorkspaceActivePath(page, "Cards/Computed Character Sheet.cs");
  await page.reload();
  await expect(mainPane.locator(".card-field-row", { hasText: "WIS Bonus" })).toContainText("-1");
  await expect(mainPane.locator(".card-field-row", { hasText: "Perception_bonus" })).toContainText(
    "+2"
  );

  await enterEditMode(page);
  await page.getByLabel("Field value 2-3").selectOption("false");
  await saveActiveDraft(page);
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);
  await expectWorkspaceActivePath(page, "Cards/Computed Character Sheet.cs");
  await page.reload();
  await expect(mainPane.locator(".card-field-row", { hasText: "Perception_bonus" })).toContainText(
    "-1"
  );
});

test("computed card editor shows invalid formula errors inline", async ({ page }) => {
  await page.goto("/");

  await openCardsFile(page, "Computed Character Sheet\\.cs");
  await enterEditMode(page);
  await page.getByLabel("Field formula 2-5").fill("Missing + 1");
  await saveActiveDraft(page);
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);
  await previewCleanDraft(page);

  const mainPane = page.getByRole("region", { name: "Main viewer pane" });
  await expect(mainPane.locator(".card-field-row", { hasText: "Perception_bonus" })).toContainText(
    /Unknown field Missing|Formula error|formula/i
  );
});

test("Card Creator can create a computed card from a world-local template", async ({ page }) => {
  await page.goto("/");

  await workspaceControls(page).getByRole("button", { name: "New Card" }).click();
  const dialog = page.getByRole("dialog", { name: "New Card" });
  const templateSelect = dialog.getByLabel("Card template");
  const computedOption = templateSelect.locator("option", {
    hasText: /Computed Character Sheet.*world/i
  });
  await expect(computedOption).toHaveCount(1);
  const computedValue = await computedOption.first().getAttribute("value");
  expect(computedValue).toBeTruthy();
  await templateSelect.selectOption(computedValue ?? "");
  await dialog.getByLabel("Card title").fill("Playwright Computed Hero");
  await dialog.getByLabel(/New (file|card) path/i).fill("Cards/Playwright Computed Hero.cs");
  await dialog.getByRole("button", { name: "Create Card" }).click();

  const mainPane = page.getByRole("region", { name: "Main viewer pane" });
  await expect(page.getByRole("heading", { name: "Playwright Computed Hero" })).toBeVisible();
  await expect(mainPane.locator(".card-field-row", { hasText: "WIS Bonus" })).toContainText("+3");
  await expect(mainPane.locator(".card-field-row", { hasText: "Perception_bonus" })).toContainText(
    "+6"
  );
});

test("DMS card_template can create a computed card from a world-local template", async ({
  page
}) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /create_computed_card\.dms/ }).click();
  await runActiveScript(page);

  await expect(worldTree(page).getByRole("button", { name: /DMS Computed Sentinel\.cs/ })).toBeVisible(
    { timeout: 10000 }
  );
  expect(existsSync(resolve(e2eWorld, "Cards", "DMS Computed Sentinel.cs"))).toBe(true);
  await openCardsFile(page, "DMS Computed Sentinel\\.cs");
  const mainPane = page.getByRole("region", { name: "Main viewer pane" });
  await expect(page.getByRole("heading", { name: "DMS Computed Sentinel" })).toBeVisible();
  await expect(mainPane.locator(".card-field-row", { hasText: "WIS Bonus" })).toContainText("+4");
  await expect(mainPane.locator(".card-field-row", { hasText: "Perception_bonus" })).toContainText(
    "+4"
  );

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("DMS Computed Sentinel");
  await expect(
    search.getByRole("button", { name: /^DMS Computed Sentinel\s+Cards\// })
  ).toBeVisible();
});

test("computed cards work with search, peek, and player screen display", async ({
  context,
  page
}) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("ability_mod(WIS)");
  await search.getByRole("button", { name: /Computed Character Sheet/ }).click();

  const mainPane = page.getByRole("region", { name: "Main viewer pane" });
  await expect(page.getByRole("heading", { name: "Computed Character Sheet" })).toBeVisible();
  await expect(mainPane.locator(".card-field-row", { hasText: "WIS Bonus" })).toContainText("+3");

  const controls = await screenTool(page);
  await controls.getByRole("button", { name: "Show Active Fullscreen" }).click();
  await expect(screen.getByRole("heading", { name: "Computed Character Sheet" })).toBeVisible();
  await expect(screen.locator(".card-field-row", { hasText: "Perception_bonus" })).toContainText(
    "+6"
  );

  const homeLink = mainPane.getByRole("link", { name: "README" });
  await expect(homeLink).toBeVisible();
  await homeLink.click({ button: "middle" });
  await expect(page.getByRole("dialog", { name: "Peek Sample World Guide" })).toBeVisible();
  await page.getByRole("button", { name: "Close peek" }).click();
  await expect(page.locator(".peek-overlay")).toBeHidden();
});

test("DMS card_template can create a card from a world-local template", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /create_card_success\.dms/ }).click();
  await enterEditMode(page);
  await fillCodeEditor(
    page,
    "DMS editor",
    [
      "card = card_template('npc-contact', 'DMS Contact')",
      "card['sections'][0]['fields']['Need'] = 'Find the lighthouse key.'",
      "create_card('Cards/DMS Contact.cs', card)"
    ].join("\n")
  );
  await saveActiveDraft(page);
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);
  await runActiveScript(page);

  await expect(worldTree(page).getByRole("button", { name: /DMS Contact\.cs/ })).toBeVisible({
    timeout: 10000
  });
  await openCardsFile(page, "DMS Contact\\.cs");
  await expect(page.getByRole("heading", { name: "DMS Contact" })).toBeVisible();
  await expect(page.getByText("Find the lighthouse key.")).toBeVisible();
});

test("DMS card_template can create a V2 card from a world-local template", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /create_card_success\.dms/ }).click();
  await enterEditMode(page);
  await fillCodeEditor(
    page,
    "DMS editor",
    [
      "card = card_template('basic-character-v2', 'DMS V2 Scout')",
      "card['sections'][0]['fields']['Player']['value'] = 'Ilyra'",
      "card['sections'][0]['fields']['Class']['value'] = 'Scout'",
      "card['sections'][2]['rows'][0]['Name'] = 'Signal Dagger'",
      "card['sections'][2]['rows'][0]['Bonus'] = '+4'",
      "card['sections'][2]['rows'][0]['Damage'] = '1d4+2'",
      "create_card('Cards/DMS V2 Scout.cs', card)"
    ].join("\n")
  );
  await saveActiveDraft(page);
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);
  await runActiveScript(page);

  await expect(worldTree(page).getByRole("button", { name: /DMS V2 Scout\.cs/ })).toBeVisible({
    timeout: 10000
  });
  expect(existsSync(resolve(e2eWorld, "Cards", "DMS V2 Scout.cs"))).toBe(true);
  await openCardsFile(page, "DMS V2 Scout\\.cs");
  await expect(page.getByRole("heading", { name: "DMS V2 Scout" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Main viewer pane" })).toContainText(
    "Signal Dagger"
  );

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("Signal Dagger");
  await expect(search.getByRole("button", { name: /DMS V2 Scout/ })).toBeVisible();
});

test("edits structured card data, saves, reloads, and indexes card text", async ({ page }) => {
  await page.goto("/");

  await openCardsFile(page, "Moonlit Key\\.cs");
  await expect(page.getByRole("heading", { name: "Moonlit Key" })).toBeVisible();

  await enterEditMode(page);
  await expect(page.getByLabel("Card title")).toBeVisible();
  await page.getByLabel("Card title").fill("Moonlit Key Revised");
  await page.getByLabel("Card kind").fill("Relic");
  await page.getByLabel("Card tags").fill("e2e-card, moonlit-revised");
  await page.getByRole("button", { name: "Add Field" }).click();
  await page.getByLabel(/Field (name|label)/i).last().fill("Secret");
  await page.getByLabel(/Field value/i).last().fill("Crimson glass field text");
  await saveActiveDraft(page);
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);

  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByRole("heading", { name: "Moonlit Key Revised" })).toBeVisible();
  const mainPane = page.getByLabel("Main viewer pane");
  await expect(mainPane.getByText("Relic", { exact: true })).toBeVisible();
  await expect(mainPane.getByText("moonlit-revised")).toBeVisible();
  await expect(mainPane.getByText("Secret", { exact: true })).toBeVisible();
  await expect(mainPane.getByText("Crimson glass field text")).toBeVisible();

  const searchQueries = [
    "Moonlit Key Revised",
    "moonlit-revised",
    "Relic",
    "Crimson glass field text"
  ];
  for (const query of searchQueries) {
    const search = await searchTool(page);
    await search.getByRole("searchbox", { name: "Search World" }).fill(query);
    await expect(search.getByRole("button", { name: /Moonlit Key Revised/ })).toBeVisible();
  }
});

test("structured card links open pages and support peek context actions", async ({ page }) => {
  await page.goto("/");

  await openCardsFile(page, "Moonlit Key\\.cs");
  const cardTab = page.getByRole("tab", { name: "Moonlit Key" });
  const cardPane = page.getByRole("region", { name: "Main viewer pane" });
  await expect(cardTab).toHaveAttribute("aria-selected", "true");

  const captainLink = cardPane.getByRole("link", { name: "Captain Ilyra" });
  await expect(captainLink).toBeVisible();
  await captainLink.click();
  await expect(page.getByRole("heading", { name: "Captain Ilyra" })).toBeVisible();

  await cardTab.click();
  await expect(cardTab).toHaveAttribute("aria-selected", "true");
  await captainLink.click({ button: "right" });
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("button", { name: "Peek", exact: true })).toBeEnabled();
  await expect(menu.getByRole("button", { name: "Stage on Screen" })).toBeEnabled();
  await expect(menu.getByRole("button", { name: "Show on Screen" })).toBeEnabled();
  await page.keyboard.press("Escape");
  await expect(menu).toBeHidden();

  await captainLink.click({ button: "middle" });
  await expect(page.getByRole("dialog", { name: "Peek Captain Ilyra" })).toBeVisible();
  await expect(cardTab).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Close peek" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".peek-overlay")).toHaveCount(0);
});

test("V2 card links support open, peek, context screen actions, and player display", async ({
  context,
  page
}) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");

  await openCardsFile(page, "Basic Character Sheet\\.cs");
  const cardTab = page.getByRole("tab", { name: "Basic Character Sheet" });
  const cardPane = page.getByRole("region", { name: "Main viewer pane" });
  const homeLink = cardPane.getByRole("link", { name: "README" });
  await expect(homeLink).toBeVisible();

  await homeLink.click();
  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();

  await cardTab.click();
  await expect(cardTab).toHaveAttribute("aria-selected", "true");
  await homeLink.click({ button: "middle" });
  await expect(page.getByRole("dialog", { name: "Peek Sample World Guide" })).toBeVisible();
  await expect(cardTab).toHaveAttribute("aria-selected", "true");
  await page.getByRole("button", { name: "Close peek" }).click();
  await page.keyboard.press("Escape");
  await expect(page.locator(".peek-overlay")).toHaveCount(0);

  await homeLink.click({ button: "right" });
  const menu = page.getByRole("menu");
  await expect(menu.getByRole("button", { name: "Peek", exact: true })).toBeEnabled();
  await expect(menu.getByRole("button", { name: "Stage on Screen" })).toBeEnabled();
  await expect(menu.getByRole("button", { name: "Show on Screen" })).toBeEnabled();
  await menu.getByRole("button", { name: "Show on Screen" }).click();
  await expect(screen.getByRole("region", { name: "Popup Sample World Guide" })).toContainText(
    "Captain Ilyra"
  );
});

test("structured cards participate in favorites, recents, and workspace restore @smoke", async ({
  page
}) => {
  await gotoWorkspace(page);

  await openCardsFile(page, "Moonlit Key\\.cs");
  const moonlit = worldTree(page).getByRole("button", { name: /Moonlit Key Moonlit Key\.cs/ });
  await moonlit.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Favorite" }).click();

  const favorites = page.getByRole("region", { name: "Favorites" });
  await expect(favorites.getByRole("button", { name: /Moonlit Key/ })).toBeVisible();
  const recent = page.getByRole("region", { name: "Recent" });
  await recent.getByRole("button", { name: /Recent/ }).click();
  await expect(recent.getByRole("button", { name: /Moonlit Key/ })).toBeVisible();

  await page.waitForTimeout(300);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Moonlit Key" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(page.getByRole("heading", { name: "Moonlit Key" })).toBeVisible();
  await expect(
    page.getByRole("region", { name: "Favorites" }).getByRole("button", { name: /Moonlit Key/ })
  ).toBeVisible();
});

test("structured cards can be sent fullscreen and as popups to the player screen", async ({
  context,
  page
}) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");

  await openCardsFile(page, "Moonlit Key\\.cs");
  const controls = await screenTool(page);
  await controls.getByRole("button", { name: "Clear Popups" }).click();
  await controls.getByRole("button", { name: "Blank Screen" }).click();
  await controls.getByRole("button", { name: "Show Active Fullscreen" }).click();
  await expect(screen.getByRole("heading", { name: "Moonlit Key" })).toBeVisible();
  await expect(screen.getByText("amber spindle phrase")).toBeVisible();

  await controls.getByLabel("Popup preset").selectOption("clue");
  await controls.getByRole("button", { name: "Open Active as Popup" }).click();
  const popup = screen.getByRole("region", { name: "Popup Moonlit Key" });
  await expect(popup).toBeVisible();
  await expect(popup).toHaveClass(/screen-popup-clue/);
  await expect(popup).toContainText("Captain Ilyra");
});

test("fast slots can open and screen-send structured cards", async ({ context, page }) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");

  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByLabel("Action").selectOption("open_file");
  await actions.getByLabel("Label").fill("Open card");
  await actions.getByRole("textbox", { name: "Fast slot path" }).fill("Cards/Moonlit Key.cs");
  await actions.getByRole("button", { name: "Save Slot" }).click();

  await page.getByRole("button", { name: /Fast slot 1: Open card/ }).click();
  await expect(page.getByRole("heading", { name: "Moonlit Key" })).toBeVisible();

  await actions.getByLabel("Action").selectOption("screen_fullscreen");
  await actions.getByLabel("Label").fill("Show card");
  await actions.getByRole("textbox", { name: "Fast slot path" }).fill("Cards/Moonlit Key.cs");
  await actions.getByRole("button", { name: "Save Slot" }).click();
  await page.getByRole("button", { name: /Fast slot 1: Show card/ }).click();

  await expect(screen.getByRole("heading", { name: "Moonlit Key" })).toBeVisible();
  await expect(screen.getByText("amber spindle phrase")).toBeVisible();
});

test("invalid structured card JSON shows an invalid card state", async ({ page }) => {
  await page.goto("/");

  await openCardsFile(page, "Broken Card\\.cs");

  await expect(page.getByRole("tab", { name: /Broken Card/ })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Invalid Card" })).toBeVisible();
  await expect(page.getByRole("region", { name: "Main viewer pane" })).toContainText(
    /Invalid card JSON|Could not parse card|Unexpected end/
  );
});

test("renames markdown and keeps the tab at the new path", async ({ page }) => {
  await page.goto("/");

  const readme = worldTree(page).getByRole("button", { name: /README\.md/ });
  await readme.click();
  await readme.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Rename" }).click();
  const dialog = page.getByRole("dialog", { name: "Rename File" });
  await dialog.getByLabel("New file path").fill("Renamed Home.md");
  await dialog.getByRole("button", { name: "Rename File", exact: true }).click();

  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(worldTree(page).getByRole("button", { name: /Renamed Home\.md/ })).toBeVisible();
  await expect(worldTree(page).getByRole("button", { name: /README\.md/ })).toBeHidden();
});

test("moves CSV to trash and removes it from tree and search", async ({ page }) => {
  await page.goto("/");

  const csv = worldTree(page).getByRole("button", { name: "random-events.csv" });
  await csv.click();
  await csv.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Move to Trash" }).click();
  const dialog = page.getByRole("dialog", { name: "Move to Trash" });
  await dialog.getByRole("button", { name: "Move to Trash", exact: true }).click();

  await expect(page.getByRole("tab", { name: "random-events.csv" })).toBeHidden();
  await expect(worldTree(page).getByRole("button", { name: "random-events.csv" })).toBeHidden();

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("bridge toll");
  await expect(search.getByText("No results.")).toBeVisible();
});

test("trash manager restores and permanently deletes trashed files", async ({ page }) => {
  await page.goto("/");

  let csv = worldTree(page).getByRole("button", { name: "random-events.csv" });
  await csv.click();
  await csv.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Move to Trash" }).click();
  let dialog = page.getByRole("dialog", { name: "Move to Trash" });
  await dialog.getByRole("button", { name: "Move to Trash", exact: true }).click();

  await page.getByRole("button", { name: "Trash", exact: true }).click();
  let trash = page.getByRole("dialog", { name: "Trash" });
  await expect(trash.getByText("random-events.csv", { exact: true })).toBeVisible();
  await trash.getByRole("button", { name: "Restore" }).click();
  await expect(worldTree(page).getByRole("button", { name: "random-events.csv" })).toBeVisible();
  await trash.getByRole("button", { name: "Close Trash" }).click();

  csv = worldTree(page).getByRole("button", { name: "random-events.csv" });
  await csv.click();
  await csv.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Move to Trash" }).click();
  dialog = page.getByRole("dialog", { name: "Move to Trash" });
  await dialog.getByRole("button", { name: "Move to Trash", exact: true }).click();

  await page.getByRole("button", { name: "Trash", exact: true }).click();
  trash = page.getByRole("dialog", { name: "Trash" });
  await trash.getByRole("button", { name: "Delete Forever" }).click();
  await trash.getByRole("button", { name: "Confirm Delete Forever" }).click();
  await expect(trash.getByText("Trash is empty.")).toBeVisible();
});

test("renames after live external save refreshes preconditions", async ({
  page,
  request
}) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  const current = await (await request.get("/api/world/file?path=README.md")).json();
  await request.put("/api/world/file?path=README.md", {
    data: {
      content: "# External Rename Conflict",
      expected_modified_at: current.modified_at,
      expected_hash: current.hash
    }
  });

  await expect(page.getByRole("heading", { name: "External Rename Conflict" })).toBeVisible({
    timeout: 10_000
  });
  const readme = worldTree(page).getByRole("button", { name: /README\.md/ });
  await readme.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Rename" }).click();
  const dialog = page.getByRole("dialog", { name: "Rename File" });
  await dialog.getByLabel("New file path").fill("Conflict Home.md");
  await dialog.getByRole("button", { name: "Rename File", exact: true }).click();

  await expect(dialog).toBeHidden();
  await expect(worldTree(page).getByRole("button", { name: /Conflict Home\.md/ })).toBeVisible();
});

test("media and unsupported files stay read-only", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "sample-map.svg" }).click();
  await expect(page.locator(".editor-toolbar")).toHaveCount(0);
  await expect(page.locator("img[alt='sample-map.svg']")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Markdown editor" })).toHaveCount(0);
  await openToolSection(page, "Metadata");
  await expect(page.getByRole("button", { name: "Edit Metadata" })).toBeVisible();

  await worldTree(page).getByRole("button", { name: "roll.bin" }).click();
  await expect(page.getByRole("heading", { name: "Unsupported File" })).toBeVisible();
  await expect(page.locator(".editor-toolbar")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Markdown editor" })).toHaveCount(0);
  await openToolSection(page, "Metadata");
  await expect(page.getByRole("button", { name: "Edit Metadata" })).toBeVisible();
});
