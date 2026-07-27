import { expect, test } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { useE2eWorld, worldTree, ensureTreeFolderOpen, openTreeFile, captainTreeButton, toolsPanel, workspaceControls, openToolSection, metadataTool, screenTool, mapTool, audioTool, runActiveScript, gotoWorkspace, clickMapCanvas, e2eWorld } from "./world-browser-helpers";

useE2eWorld();

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

  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");

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

  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");
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

  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");
  await expect(screenHeader).toHaveAttribute("aria-expanded", "false");
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

  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");
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
  await openTreeFile(page, "random-events.csv", "Tables");

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

  const treeBefore = await worldTree(page).boundingBox();
  const treeResizer = page.getByRole("separator", { name: "Resize world tree" });
  const treeResizerBox = await treeResizer.boundingBox();
  expect(treeBefore).not.toBeNull();
  expect(treeResizerBox).not.toBeNull();

  await page.mouse.move((treeResizerBox?.x ?? 0) + 3, (treeResizerBox?.y ?? 0) + 20);
  await page.mouse.down();
  await page.mouse.move((treeResizerBox?.x ?? 0) + 90, (treeResizerBox?.y ?? 0) + 20);
  await page.mouse.up();

  const treeResized = await worldTree(page).boundingBox();
  expect(treeResized?.width ?? 0).toBeGreaterThan((treeBefore?.width ?? 0) + 50);

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
  const treeAfterReload = await worldTree(page).boundingBox();
  expect(treeAfterReload?.width ?? 0).toBeGreaterThan((treeBefore?.width ?? 0) + 50);

  const afterReload = await toolsPanel(page).boundingBox();
  expect(afterReload?.width ?? 0).toBeGreaterThan((before?.width ?? 0) + 80);

  await workspaceControls(page).getByRole("button", { name: "Hide tools panel" }).click();
  await expect(page.getByRole("complementary", { name: "DM Tools" })).toHaveCount(0);
  await expect(page.locator(".tools-restore-button")).toBeVisible();

  await page.reload();
  await expect(page.getByRole("complementary", { name: "DM Tools" })).toHaveCount(0);
  await page.locator(".tools-restore-button").click();
  await expect(toolsPanel(page)).toBeVisible();
});

test("opens multiple tabs, switches, and closes the active tab", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await openTreeFile(page, "random-events.csv", "Tables");
  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "random-events.csv" })).toBeVisible();

  await page.getByRole("tab", { name: "Sample World Guide" }).click();
  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();

  await page.getByRole("tab", { name: "random-events.csv" }).click({ button: "middle" });
  await expect(page.getByRole("tab", { name: "random-events.csv" })).toBeHidden();
  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();

  await page.getByRole("button", { name: "Close README.md" }).click();
  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toBeHidden();
});

test("opening files creates recents", async ({ page }) => {
  await page.goto("/");

  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");

  const recent = page.getByRole("region", { name: "Recent" });
  await recent.getByRole("button", { name: /Recent/ }).click();
  await expect(recent.getByRole("button", { name: /Captain Ilyra/ })).toBeVisible();
});

test("favorites survive reload", async ({ page }) => {
  await page.goto("/");

  await ensureTreeFolderOpen(page, "NPCs");
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
  await openTreeFile(page, "random-events.csv", "Tables");
  await page.getByRole("tab", { name: "Sample World Guide" }).click();

  await page.waitForTimeout(300);
  await page.reload();

  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toHaveAttribute(
    "aria-selected",
    "true"
  );
  await expect(page.getByRole("tab", { name: "random-events.csv" })).toBeVisible();
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

    await openTreeFile(page, /effects_demo\.dms/, "Scripts");
    await runActiveScript(page);
    await expect(
      toolsPanel(page).getByRole("button", { name: /Screen Players currently see: Fullscreen - sample-map/ })
    ).toBeVisible();
    const audio = await audioTool(page);
    const effectBus = audio.getByRole("region", { name: "Effect Bus" });
    await expect(effectBus.locator(".audio-bus-heading").getByText("broken-glass")).toBeVisible();
    await expect(effectBus.getByRole("button", { name: "Pause" })).toBeVisible();

    await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
    let screenControls = await screenTool(page);
    await screenControls.getByRole("tab", { name: "Display" }).click();
    await screenControls.getByRole("button", { name: "Blank Screen" }).click();
    await screenControls.getByRole("button", { name: "Show Active Fullscreen" }).click();

    await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");
    screenControls = await screenTool(page);
    await screenControls.getByLabel("Popup preset").selectOption("letter");
    await screenControls.getByRole("button", { name: "Open Active as Popup" }).click();

    await openTreeFile(page, /random-events\.csv/, "Tables");
    screenControls = await screenTool(page);
    await screenControls.getByRole("button", { name: "Stage Active as Popup" }).click();

    await openTreeFile(page, /sample-map/, "Media");
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
    await map.getByLabel("Fog enabled").click();
    await map.getByRole("button", { name: "Reveal Polygon" }).click();
    await clickMapCanvas(map, 0.18, 0.18);
    await clickMapCanvas(map, 0.42, 0.2);
    await clickMapCanvas(map, 0.26, 0.42);
    await map.getByRole("button", { name: "Commit Polygon" }).click();
    await expect(screen.locator(".map-fog-hole")).toHaveCount(1);

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
    await expect(mapAfterSnapshot.getByRole("button", { name: "Stop Map" })).toBeDisabled();
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
    await expect(screen.locator(".map-fog-hole")).toHaveCount(1);
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
