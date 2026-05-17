import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copySampleWorldSeed, resetWorldDirectory } from "./world-fixtures";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../..");
const sampleWorld = resolve(repoRoot, "sample-world");
const e2eWorldsRoot = resolve(repoRoot, ".virtualscreen", "e2e-worlds");
const e2eWorld = resolve(e2eWorldsRoot, "E2E World");
const tinyGif = Buffer.from("R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==", "base64");

function resetE2eWorld() {
  mkdirSync(e2eWorldsRoot, { recursive: true });
  resetWorldDirectory(e2eWorld);
  copySampleWorldSeed(sampleWorld, e2eWorld);
  mkdirSync(resolve(e2eWorld, "Cards"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Media"), { recursive: true });
  writeFileSync(resolve(e2eWorld, "Media", "animated-map.gif"), tinyGif);
  writeFileSync(
    resolve(e2eWorld, "Cards", "Picker Link Card.cs"),
    JSON.stringify(
      {
        version: 1,
        title: "Picker Link Card",
        kind: "Reference",
        tags: ["picker"],
        sections: [
          {
            title: "Links",
            fields: {
              Handout: { type: "world_link", value: "[[README]]" }
            }
          }
        ]
      },
      null,
      2
    ),
    "utf-8"
  );
}

test.beforeEach(async ({ request }) => {
  resetE2eWorld();
  await request.post("/api/worlds/open", {
    data: { id: "E2E World" }
  });
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
  await request.put("/api/fast-slots", {
    data: { slots: [] }
  });
  await request.post("/api/display/blank");
  const mapStateResponse = await request.get("/api/map/state");
  if (mapStateResponse.ok()) {
    await request.post("/api/map/stop");
    await request.delete("/api/map/reveals");
    await request.put("/api/map/fog", { data: { enabled: false } });
  }
});

function worldTree(page: Page) {
  return page.getByRole("navigation", { name: "World files" });
}

function toolsPanel(page: Page) {
  return page.getByRole("complementary", { name: "DM Tools" });
}

async function openToolSection(page: Page, name: "Actions" | "Screen") {
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

async function actionsTool(page: Page) {
  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByRole("tab", { name: "Slots" }).click();
  return actions.getByRole("region", { name: "Fast Slots" });
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

async function expectPickerTrigger(trigger: Locator) {
  await expect(trigger, "World path picker trigger should be wired.").toHaveCount(1);
  await expect(trigger).toBeVisible();
}

async function chooseWorldPath(page: Page, trigger: Locator, path: string) {
  await expectPickerTrigger(trigger);
  await trigger.click();
  const dialog = page.getByRole("dialog", { name: "Choose World Path" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("searchbox", { name: "Filter world paths" }).fill(path);
  await dialog.getByRole("button", { name: new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")) }).click();
  await dialog.getByRole("button", { name: "Use Selected Path" }).click();
  await expect(dialog).toBeHidden();
}

test.describe("World Path Picker V1", () => {
  test("Screen fullscreen can choose a world path from the picker @smoke", async ({ context, page }) => {
    const player = await context.newPage();
    await player.goto("/screen");
    await page.goto("/");

    const screen = await screenTool(page);
    await chooseWorldPath(
      page,
      screen.getByRole("button", { name: "Choose fullscreen path" }),
      "README.md"
    );
    await expect(screen.getByRole("textbox", { name: "Fullscreen path" })).toHaveValue("README.md");
    await screen.getByRole("button", { name: "Show Path Fullscreen" }).click();

    await expect(player.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
  });

  test("Map source can choose an image path from the picker @smoke", async ({ context, page }) => {
    const player = await context.newPage();
    await player.goto("/screen");
    await page.goto("/");

    const map = await mapTool(page);
    await map.getByRole("tab", { name: "Setup" }).click();
    await chooseWorldPath(
      page,
      map.getByRole("button", { name: "Choose map image path" }),
      "Media/sample-map.svg"
    );
    await expect(map.getByRole("textbox", { name: "Map image path" })).toHaveValue("Media/sample-map.svg");
    const sourceLoaded = page.waitForResponse(
      (response) => response.url().includes("/api/map/source") && response.ok()
    );
    await map.getByRole("button", { name: "Load Map" }).click();
    await sourceLoaded;
    await map.getByRole("tab", { name: "Live" }).click();
    await expect(map.locator(".map-canvas-dm img")).toBeVisible();
    const mapPresented = page.waitForResponse(
      (response) => response.url().includes("/api/map/present") && response.ok()
    );
    await map.getByRole("button", { name: "Present Map" }).click();
    await mapPresented;

    await expect(player.locator(".screen-map")).toBeVisible();
    await expect(player.locator(".screen-map img")).toBeVisible();
  });

  test("Actions fast slot can choose a target path from the picker @smoke", async ({ page }) => {
    await page.goto("/");

    const actions = await actionsTool(page);
    await actions.getByLabel("Action").selectOption("open_file");
    await actions.getByLabel("Label").fill("Picker home");
    await chooseWorldPath(
      page,
      actions.getByRole("button", { name: "Choose fast slot path" }),
      "README.md"
    );
    await expect(actions.getByRole("textbox", { name: /path/i })).toHaveValue("README.md");
    await actions.getByRole("button", { name: "Save Slot" }).click();
    await page.getByRole("button", { name: /Fast slot 1: Picker home/ }).click();

    await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
  });

  test("Card editor world_link fields can choose a world path from the picker @smoke", async ({ page }) => {
    await page.goto("/");

    await openCardsFile(page, "Picker Link Card\\.cs");
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await chooseWorldPath(
      page,
      page.getByRole("button", { name: "Choose field value 1-1 path" }),
      "NPCs/Captain Ilyra.md"
    );
    await expect(page.getByRole("textbox", { name: "Field value 1-1" })).toHaveValue("[[NPCs/Captain Ilyra]]");
    await page.locator(".editor-toolbar").getByRole("button", { name: "Save", exact: true }).click();
    await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);
    await page.locator(".editor-toolbar").getByRole("button", { name: "Preview", exact: true }).click();
    await expect(page.getByRole("link", { name: "Captain Ilyra" })).toBeVisible();
  });

  test("Esc closes the picker and manual typing remains unchanged", async ({ page }) => {
    await page.goto("/");

    const actions = await actionsTool(page);
    await actions.getByLabel("Action").selectOption("open_file");
    await actions.getByRole("textbox", { name: /path/i }).fill("Notes/manual.md");
    const trigger = actions.getByRole("button", { name: "Choose fast slot path" });
    await expectPickerTrigger(trigger);
    await trigger.click();
    await expect(page.getByRole("dialog", { name: "Choose World Path" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog", { name: "Choose World Path" })).toBeHidden();
    await expect(actions.getByRole("textbox", { name: /path/i })).toHaveValue("Notes/manual.md");

    await actions.getByLabel("Label").fill("Manual home");
    await actions.getByRole("textbox", { name: /path/i }).fill("README.md");
    await actions.getByRole("button", { name: "Save Slot" }).click();
    await page.getByRole("button", { name: /Fast slot 1: Manual home/ }).click();
    await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
  });
});
