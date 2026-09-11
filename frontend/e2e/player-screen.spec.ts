import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { useE2eWorld, worldTree, ensureTreeFolderOpen, openTreeFile, openPdfFixture, openNotesFile, openToolSection, searchTool, metadataTool, screenTool, expectViewportFilling, screenPathUrl, e2eWorld, tinyPng } from "./world-browser-helpers";

useE2eWorld();

test("opens SVG media visibly", async ({ page }) => {
  await page.goto("/");

  await openTreeFile(page, "sample-map.svg", "Media");

  await expect(page.getByRole("tab", { name: "sample-map.svg" })).toBeVisible();
  await expect(page.getByRole("img", { name: "sample-map.svg" })).toBeVisible();
});

test("opens MP4 media in a video tab", async ({ page }) => {
  await page.goto("/");

  await openTreeFile(page, "animated-map.mp4", "Media");

  await expect(page.getByRole("tab", { name: /animated-map/ })).toBeVisible();
  await expect(page.locator('video[aria-label="animated-map.mp4"]')).toBeVisible();
});

test("opens searches and persists PDF materials", async ({ page }) => {
  await page.goto("/");

  await openPdfFixture(page);

  await expect(page.getByRole("tab", { name: "session-handout.pdf" })).toBeVisible();
  await expect(page.locator('canvas[aria-label="session-handout.pdf"]')).toBeVisible();

  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await metadata.getByRole("textbox", { name: "Title" }).fill("Session Handout");
  await metadata.getByRole("textbox", { name: "Tags" }).fill("handout, pdf");
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

  await ensureTreeFolderOpen(page, "Media");
  await worldTree(page).getByRole("button", { name: "animated-map.gif" }).click();
  controls = await screenTool(page);
  await controls.getByRole("button", { name: "Show Active Fullscreen" }).click();
  await expect(screen.getByRole("img", { name: "animated-map" })).toBeVisible();

  await openTreeFile(page, "animated-map.mp4", "Media");
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

  await ensureTreeFolderOpen(page, "NPCs");
  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");
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
  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");
  controls = await screenTool(page);
  await controls.getByRole("button", { name: /Clear \+ Show/ }).click();
  await expect(screen.getByRole("heading", { name: "Captain Ilyra" })).toBeVisible();
  await expect(screen.getByRole("region", { name: "Popup Sample World Guide" })).toBeHidden();

  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");
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
  await expect(controls.getByRole("heading", { name: "Staged (Hidden)" })).toBeVisible();
  await expect(popupItem).toContainText("letter");
  await expect(screen.getByRole("region", { name: "Popup Sample World Guide" })).toBeHidden();

  await popupItem.getByRole("button", { name: "Show to Players", exact: true }).click();
  const screenPopup = screen.getByRole("region", { name: "Popup Sample World Guide" });
  await expect(screenPopup).toBeVisible();
  await expect(screenPopup).toHaveClass(/screen-popup-letter/);

  await popupItem.getByRole("button", { name: "Hide from Players", exact: true }).click();
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

  await openTreeFile(page, "random-events.csv", "Tables");
  controls = await screenTool(page);
  await controls.getByRole("button", { name: "Show Active Fullscreen" }).click();
  await expectViewportFilling(screen, ".screen-fullscreen .screen-table-wrap");
});

test("player screen shows a displayed page together with its embedded image", async ({
  context,
  page
}) => {
  // The access rules themselves - nothing before it is displayed, only displayed content
  // and its embeds after - are pinned route by route in backend/tests/test_display_routes.py.
  // What only a browser can show is that the page and its image actually arrive together.
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");
  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  const controls = await screenTool(page);
  await controls.getByRole("button", { name: "Show Active Fullscreen" }).click();

  await expect(screen.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
  await expect(screen.getByRole("img", { name: "Sample Map" })).toBeVisible();
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

test("blank player screen skips missing optional background without console errors", async ({
  context,
  page
}) => {
  const screen = await context.newPage();
  const consoleErrors: string[] = [];
  screen.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });

  const missingBackground = screen.waitForResponse(
    (response) =>
      response.url().includes("/api/screen/display/background") && response.status() === 204
  );
  await screen.goto("/screen");

  await page.goto("/");
  const controls = await screenTool(page);
  await controls.getByRole("button", { name: "Blank Screen" }).click();
  await missingBackground;

  const blankSurface = screen.locator(".screen-fullscreen-blank");
  await expect(blankSurface).toBeVisible();
  await expect(blankSurface).toHaveCSS("background-image", "none");
  expect(
    consoleErrors.filter((message) => message.includes("/api/screen/display/background"))
  ).toEqual([]);
});
