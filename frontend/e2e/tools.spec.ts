import { expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { useE2eWorld, worldTree, toolsPanel, workspaceControls, searchTool, quickCaptureTool, chooseCaptureCategory, hpTool, e2eWorld } from "./world-browser-helpers";

useE2eWorld();

test("search hotkey opens search and navigates to a result", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Select a File")).toBeVisible();
  await page.locator("body").click();

  await page.keyboard.press("Control+K");
  const search = page.getByRole("region", { name: "Global Search" });
  await expect(search).toBeVisible();

  await search.getByRole("searchbox", { name: "Search World" }).fill("Ilyra");
  const result = search.getByRole("article", {
    name: "Captain Ilyra NPCs/Captain Ilyra.md"
  });
  await expect(result.getByRole("button", { name: "Open in Other Pane" })).toBeVisible();
  await expect(result.getByRole("button", { name: "Other", exact: true })).toHaveCount(0);
  await expect(result.getByRole("button", { name: "Stage on Screen" })).toBeVisible();
  await expect(result.getByRole("button", { name: "Show on Screen" })).toBeVisible();
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
  await expect(page.getByRole("region", { name: "Capture" })).toBeHidden();
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
  page.once("dialog", (systemDialog) => systemDialog.accept());
  await dialog.getByRole("button", { name: "Trust all scripts" }).click();

  await expect(dialog).toContainText("DMS scripts are trusted for this world.");
  await expect(dialog).toContainText("5 errors / 1 warning");
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
  page.once("dialog", (systemDialog) => systemDialog.accept());
  await dialog.getByRole("button", { name: "Trust all scripts" }).click();
  await expect(dialog).toContainText("DMS scripts are trusted for this world.");
  await expect(dialog).toContainText("1 error / 1 warning");

  const issue = dialog.locator(".prep-health-issue", { hasText: "Missing Later" });
  await issue.getByRole("button", { name: "Open Source" }).click();
  await expect(page.getByRole("tab", { name: /Prep Source/ })).toBeVisible();

  writeFileSync(resolve(e2eWorld, "Missing Later.md"), "# Missing Later\n", "utf-8");
  await dialog.getByRole("button", { name: "Run Check" }).click();
  await expect(dialog).toContainText("1 warning");
  await dialog.getByRole("tab", { name: "Errors" }).click();
  await expect(dialog).toContainText("No issues in this filter.");
});
