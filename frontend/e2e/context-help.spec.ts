import { expect, test } from "@playwright/test";
import type { APIRequestContext, Page } from "@playwright/test";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copySampleWorldSeed, resetWorldDirectory } from "./world-fixtures";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../..");
const sampleWorld = resolve(repoRoot, "sample-world");
const e2eWorldsRoot = resolve(repoRoot, ".virtualscreen", "e2e-worlds");
const e2eWorld = resolve(e2eWorldsRoot, "E2E World");

function resetE2eWorld() {
  mkdirSync(e2eWorldsRoot, { recursive: true });
  for (const entry of readdirSync(e2eWorldsRoot)) {
    if (entry !== "E2E World") {
      rmSync(resolve(e2eWorldsRoot, entry), { force: true, recursive: true });
    }
  }
  resetWorldDirectory(e2eWorld);
  copySampleWorldSeed(sampleWorld, e2eWorld);
  mkdirSync(resolve(e2eWorld, "Cards"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Scripts"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Tables"), { recursive: true });
  writeFileSync(resolve(e2eWorld, "README.md"), "# E2E World\n\nOpen the context help here.\n", "utf-8");
  writeFileSync(resolve(e2eWorld, "Tables", "context-help.csv"), "Name,Note\nIlyra,Signal\n", "utf-8");
  writeFileSync(resolve(e2eWorld, "Scripts", "context-help.dms"), "render_md('# Help')\n", "utf-8");
  writeFileSync(
    resolve(e2eWorld, "Cards", "Context Card.cs"),
    JSON.stringify(
      {
        kind: "custom",
        title: "Context Card",
        tags: ["help"],
        sections: [{ title: "Core", fields: { Hook: "Context help test" } }]
      },
      null,
      2
    ),
    "utf-8"
  );
}

async function openE2eWorld(request: APIRequestContext) {
  resetE2eWorld();
  await request.post("/api/worlds/open", { data: { id: "E2E World" } });
  await request.post("/api/index/rebuild");
}

async function expectHelpTitle(page: Page, title: string) {
  await expect(page.getByRole("dialog", { name: "Context Help" })).toBeVisible();
  await expect(page.locator(".context-help-dialog h2")).toHaveText(title);
}

async function closeHelp(page: Page) {
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Context Help" })).toHaveCount(0);
}

async function openTool(page: Page, name: string) {
  await page.locator(".tool-section-header").filter({ hasText: name }).click();
}

function treeFile(page: Page, text: string) {
  return page.locator(".file-item").filter({ hasText: text }).first();
}

test.beforeEach(async ({ request }) => {
  await openE2eWorld(request);
});

test("F1 opens document-specific and tool-specific context help @smoke", async ({ page }) => {
  await page.goto("/");

  await expect(page.getByRole("navigation", { name: "World files" })).toBeVisible();
  const readmeButton = treeFile(page, "README.md");
  await expect(readmeButton).toBeVisible();
  await readmeButton.focus();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "World Files Help");
  await closeHelp(page);
  await expect(readmeButton).toBeFocused();

  await readmeButton.click();
  await page.locator(".markdown-viewer").focus();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Markdown Help");
  await closeHelp(page);

  await treeFile(page, "context-help.csv").click();
  await page.locator("[data-help-context='document-csv']").first().focus();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Table Help");
  await closeHelp(page);

  await treeFile(page, "Context Card").click();
  await page.locator("[data-help-context='document-card']").focus();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Card Help");
  await closeHelp(page);

  await treeFile(page, "context-help.dms").click();
  await page.locator("[data-help-context='document-dms']").focus();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "DMS Script Help");
  await closeHelp(page);

  await openTool(page, "Audio");
  await page.getByLabel("Music Search").focus();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Audio Help");
  await closeHelp(page);

  await openTool(page, "HP");
  await page.locator(".hp-tool").getByRole("button", { name: "Add", exact: true }).focus();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "HP Help");
  await closeHelp(page);
});

test("Context help covers dialogs, action tabs, and screen tabs @smoke", async ({ page }) => {
  await page.goto("/");

  await openTool(page, "Actions");
  await page.getByRole("tab", { name: "Slots" }).focus();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Fast Slots Help");
  await closeHelp(page);

  await page.getByRole("tab", { name: "State" }).click();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Snapshot Help");
  await closeHelp(page);

  await page.getByRole("tab", { name: "Keys" }).click();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Keyboard Bindings Help");
  await closeHelp(page);

  await page.getByRole("tab", { name: "MIDI" }).click();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "MIDI Help");
  await closeHelp(page);

  await openTool(page, "Screen");
  await page.getByRole("textbox", { name: "Fullscreen path" }).focus();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Screen Display Help");
  await closeHelp(page);

  await page.getByRole("tab", { name: "Map" }).click();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Map Help");
  await closeHelp(page);

  await page.getByRole("button", { name: "Search" }).click();
  await page.locator("#world-search").fill("README");
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Search Help");
  await closeHelp(page);
  await page.getByRole("button", { name: "Close Search" }).click();

  await page.getByRole("button", { name: "Capture" }).click();
  await page.getByLabel(/Capture text/).focus();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Capture Help");
  await closeHelp(page);
  await page.getByRole("button", { name: "Close Capture" }).click();

  await page.getByRole("button", { name: /Prep Check/ }).click();
  await page.getByRole("button", { name: "Run Check" }).focus();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Prep Check Help");
  await closeHelp(page);
  await page.getByRole("button", { name: "Close Prep Check" }).click();

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Language").focus();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Settings Help");
  await closeHelp(page);
  await page.keyboard.press("Escape");
});

test("path picker and Russian help remain usable without leaking to player screen @smoke", async ({ page }) => {
  await page.goto("/");

  await openTool(page, "Screen");
  await page.getByRole("button", { name: "Choose fullscreen path" }).click();
  await page.getByLabel("Filter world paths").focus();
  await page.keyboard.press("F1");
  await expectHelpTitle(page, "Path Picker Help");
  await closeHelp(page);
  await page.getByRole("button", { name: "Close Choose fullscreen path" }).click();

  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Language").selectOption("ru");
  await page.keyboard.press("F1");
  await expect(page.getByRole("dialog", { name: "Контекстная помощь" })).toBeVisible();
  await expect(page.locator(".context-help-dialog h2")).toContainText("Помощь");
  await closeHelp(page);
  await page.keyboard.press("Escape");

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 }
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.locator(".workspace-help-button")).toBeVisible();
    await expect(page.getByRole("navigation", { name: "Файлы мира" })).toBeVisible();
  }

  await page.goto("/screen");
  await expect(page.getByRole("button", { name: "Context Help" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Контекстная помощь" })).toHaveCount(0);
  await page.keyboard.press("F1");
  await expect(page.locator(".context-help-dialog")).toHaveCount(0);
});
