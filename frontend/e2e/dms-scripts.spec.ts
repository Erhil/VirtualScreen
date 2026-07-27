import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { useE2eWorld, worldTree, openTreeFile, openCardsFile, openScriptsFile, toolsPanel, openToolSection, searchTool, audioTool, fillCodeEditor, enterEditMode, saveActiveDraft, runActiveScript, confirmDmsTrustIfVisible, chooseCodeCompletion, e2eWorld } from "./world-browser-helpers";

useE2eWorld();

test("DMS scripts run from editor and scripts tool @smoke", async ({ page }) => {
  await page.goto("/");

  await expect(toolsPanel(page).getByRole("button", { name: /^Scenarios/ })).toHaveCount(0);
  await openScriptsFile(page, "hello_world1\\.dms");
  await expect(
    page
      .getByRole("region", { name: "Document status" })
      .getByRole("button", { name: "Run Active Script", exact: true })
  ).toBeVisible();
  const runRequests: string[] = [];
  await page.route("**/api/scripts/run", async (route) => {
    runRequests.push((route.request().postDataJSON() as { path: string }).path);
    await route.continue();
  });
  await page
    .getByRole("region", { name: "Document status" })
    .getByRole("button", { name: "Run Active Script", exact: true })
    .click();
  const trust = page.getByRole("dialog", { name: "Trust DMS Scripts" });
  await expect(trust).toBeVisible();
  await expect(trust).toContainText("DMS scripts are trusted local Python run by the backend.");
  await expect(trust.getByText("Scripts/hello_world1.dms", { exact: true })).toBeVisible();
  await trust.getByText("Cancel", { exact: true }).click();
  await expect(trust).toBeHidden();
  await page.waitForTimeout(300);
  expect(runRequests).toEqual([]);
  await page
    .getByRole("region", { name: "Document status" })
    .getByRole("button", { name: "Run Active Script", exact: true })
    .click();
  await confirmDmsTrustIfVisible(page, "Scripts/hello_world1.dms");
  await expect.poll(() => runRequests.slice()).toEqual(["Scripts/hello_world1.dms"]);
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
  await expect(scripts.getByRole("button", { name: "Run Saved Script" }).first()).toBeVisible();
});

test("DMS command reference lists signatures examples and safety notes", async ({ page }) => {
  await page.goto("/");

  await openToolSection(page, "Scripts");
  const scripts = toolsPanel(page).getByRole("region", { name: "DMS Scripts" });
  await scripts.getByText("Command Reference", { exact: true }).click();

  const screenCommand = scripts.locator(".script-command-entry", { hasText: 'screen_fs("README.md")' });
  await expect(screenCommand).toContainText("Effect:");
  await expect(screenCommand).toContainText("Example:");
  await expect(
    scripts.locator(".script-command-entry", { hasText: 'audio_play(".music/effects/file.mp3", bus="effect")' })
  ).toBeVisible();
  await expect(scripts.locator(".script-command-entry", { hasText: 'create_card("Cards/Mira.cs", card)' })).toBeVisible();
});

test("DMS scripts can control screen and audio", async ({ page, context }) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");

  const filteredAudio = await audioTool(page);
  await filteredAudio.getByRole("searchbox", { name: "Music Search" }).fill("bard");
  await expect(filteredAudio.getByRole("button", { name: /bard-song/ })).toBeVisible();

  await openTreeFile(page, /effects_demo\.dms/, "Scripts");
  await runActiveScript(page);

  await expect(
    toolsPanel(page).getByRole("button", { name: /Screen Players currently see: Fullscreen/ })
  ).toBeVisible();
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

  await openTreeFile(page, /effects_demo\.dms/, "Scripts");
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

  await openTreeFile(page, /slow_cancel\.dms/, "Scripts");
  await runActiveScript(page);
  const latestRun = toolsPanel(page).getByRole("region", { name: "Latest Script Run" });
  await expect(latestRun.getByRole("button", { name: "Cancel" })).toBeVisible();
  await latestRun.getByRole("button", { name: "Cancel" }).click();
  await expect(latestRun.getByText("Cancelled", { exact: true })).toBeVisible();

  await openTreeFile(page, /syntax_error\.dms/, "Scripts");
  await runActiveScript(page);
  await expect(toolsPanel(page).getByText(/line 2/)).toBeVisible();
  await expect(toolsPanel(page).getByText("Scripts/syntax_error.dms", { exact: true })).toBeVisible();
});

test("DMS file picker and core commands produce temporary output", async ({ page }) => {
  await page.goto("/");

  await openTreeFile(page, /choose_file_demo\.dms/, "Scripts");
  await runActiveScript(page);
  const form = page.getByRole("dialog", { name: "DMS Script Form" });
  await expect(form).toBeVisible();
  await form.getByLabel("Pick a page").fill("README.md");
  await form.getByRole("button", { name: "Continue" }).click();

  await expect(page.getByRole("heading", { name: "Selected" })).toBeVisible();
  await expect(page.locator(".markdown-viewer").getByText("README.md", { exact: true })).toBeVisible();

  await openTreeFile(page, /core_commands\.dms/, "Scripts");
  await runActiveScript(page);

  await expect(page.getByRole("heading", { name: "Core Commands" })).toBeVisible();
  await expect(page.locator(".markdown-viewer").getByText(/River Gate\s+3/)).toBeVisible();
});

test("DMS temporary outputs can be saved and write commands refresh the world", async ({ page }) => {
  await page.goto("/");

  await openTreeFile(page, /core_commands\.dms/, "Scripts");
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

  await openTreeFile(page, /write_notes\.dms/, "Scripts");
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

  await openTreeFile(page, /create_card_success\.dms/, "Scripts");
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

  await openTreeFile(page, /create_card_fail\.dms/, "Scripts");
  await runActiveScript(page);
  await expect(
    toolsPanel(page).getByRole("region", { name: "Latest Script Run" }).getByText("error", {
      exact: true
    })
  ).toBeVisible();
  expect(existsSync(resolve(e2eWorld, "Cards", "Failed DMS Card.cs"))).toBe(false);
});

test("creates edits and searches DMS scripts", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "Add in world" }).click();
  await page.getByRole("button", { name: "New Script" }).click();
  const dialog = page.getByRole("dialog", { name: "New File" });
  await dialog.getByLabel("Name").fill("hello_world");
  await expect(dialog.getByLabel("New file path")).toHaveCount(0);
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
