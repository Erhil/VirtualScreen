import { expect, test } from "@playwright/test";
import { useE2eWorld, worldTree, ensureTreeFolderOpen, openTreeFile, mapTool, screenPathUrl, mapCanvasPoint, clickMapCanvas, dragMapCanvas } from "./world-browser-helpers";

useE2eWorld();

test("interactive map presents image maps with fog reveals and pins on player screen @smoke", async ({
  context,
  page,
  request
}) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");

  await ensureTreeFolderOpen(page, "Media");
  await openTreeFile(page, /sample-map/, "Media");
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
  await map.getByRole("button", { name: "Reveal Box" }).click();
  const canvas = map.locator(".map-canvas-stage");
  await dragMapCanvas(map, 0.2, 0.2, 0.55, 0.55);
  await expect(screen.locator(".map-fog-hole")).toHaveCount(1);
  await expect(canvas).toBeFocused();
  await dragMapCanvas(map, 0.58, 0.18, 0.72, 0.34);
  await expect(screen.locator(".map-fog-hole")).toHaveCount(2);
  await expect(canvas).toBeFocused();
  await map.getByRole("button", { name: "Hide Box" }).click();
  await dragMapCanvas(map, 0.25, 0.25, 0.38, 0.38);
  await expect(map.locator(".map-tool-message")).toContainText("Hidden area added.");
  await expect(screen.locator(".map-fog-cover")).toHaveCount(1);
  await expect(canvas).toBeFocused();

  await map.getByRole("button", { name: "Reveal Polygon" }).click();
  await clickMapCanvas(map, 0.16, 0.66);
  await clickMapCanvas(map, 0.34, 0.68);
  await clickMapCanvas(map, 0.24, 0.84);
  await expect(map.getByRole("button", { name: "Commit Polygon" })).toBeEnabled();
  await map.getByRole("button", { name: "Commit Polygon" }).click();
  await expect(screen.locator(".map-fog-hole")).toHaveCount(3);
  await expect(canvas).toBeFocused();

  await map.getByRole("button", { name: "Hide Polygon" }).click();
  await clickMapCanvas(map, 0.18, 0.68);
  await clickMapCanvas(map, 0.3, 0.7);
  await clickMapCanvas(map, 0.24, 0.8);
  await map.getByRole("button", { name: "Commit Polygon" }).click();
  await expect(map.locator(".map-tool-message")).toContainText("Hidden area added.");
  await expect(screen.locator(".map-fog-cover")).toHaveCount(2);
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
  await ensureTreeFolderOpen(page, "Media");
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

  await openTreeFile(page, /sample-map/, "Media");
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

  await openTreeFile(page, /sample-map/, "Media");
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
  await map.getByRole("button", { name: "Reveal Box" }).click();
  await dragMapCanvas(map, 0.15, 0.15, 0.35, 0.35);
  await dragMapCanvas(map, 0.5, 0.5, 0.75, 0.75);
  await expect(screen.locator(".map-fog-hole")).toHaveCount(2);
  await map.getByRole("button", { name: "Undo Fog Step" }).click();
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

  await openTreeFile(page, /sample-map/, "Media");
  const map = await mapTool(page);
  await map.getByRole("button", { name: "Use Active Image" }).click();
  await expect(map.locator(".map-canvas-dm img")).toBeVisible();

  await map.getByRole("tab", { name: "Setup" }).click();
  await map.getByLabel("Grid enabled").click();
  await map.getByLabel("Grid columns").fill("9");
  await map.getByLabel("Grid rows").fill("7");
  await map.getByRole("tab", { name: "Live" }).click();
  await map.getByLabel("Fog enabled").click();
  await map.getByRole("button", { name: "Reveal Box" }).click();
  await dragMapCanvas(map, 0.2, 0.2, 0.4, 0.4);
  await expect(map.locator(".map-canvas-stage")).toBeFocused();
  await map.getByRole("button", { name: "Reveal Polygon" }).click();
  await clickMapCanvas(map, 0.55, 0.18);
  await clickMapCanvas(map, 0.78, 0.24);
  await clickMapCanvas(map, 0.62, 0.44);
  await map.getByRole("button", { name: "Commit Polygon" }).click();
  await map.getByRole("button", { name: "Hide Polygon" }).click();
  await clickMapCanvas(map, 0.6, 0.2);
  await clickMapCanvas(map, 0.72, 0.25);
  await clickMapCanvas(map, 0.64, 0.38);
  await map.getByRole("button", { name: "Commit Polygon" }).click();

  await map.getByRole("button", { name: "Pin Mode" }).click();
  await map.getByLabel("Pin label").fill("Saved Gate");
  await clickMapCanvas(map, 0.55, 0.45);
  await expect(map.locator(".map-canvas-stage")).toBeFocused();

  await map.getByRole("tab", { name: "Setup" }).click();
  await map.getByLabel("Preset name").fill("Session setup");
  await map.getByRole("button", { name: "Save Preset" }).click();
  await expect(map.getByRole("button", { name: "Load Session setup" })).toBeVisible();

  await map.getByRole("tab", { name: "Live" }).click();
  await map.getByRole("button", { name: "Clear Fog Edits" }).click();
  await map.locator(".map-pin-row", { hasText: "Saved Gate" }).getByRole("button", { name: "Remove" }).click();
  await map.getByRole("tab", { name: "Setup" }).click();
  await map.getByLabel("Grid enabled").click();
  await map.getByRole("tab", { name: "Live" }).click();
  await expect(map.locator(".map-canvas-pin", { hasText: "Saved Gate" })).toHaveCount(0);
  await expect(map.locator(".map-canvas-grid")).toHaveCount(0);
  await expect(map.locator(".map-fog-hole")).toHaveCount(0);
  await expect(map.locator(".map-fog-cover")).toHaveCount(0);

  await map.getByRole("tab", { name: "Setup" }).click();
  await map.getByRole("button", { name: /Load Session setup/ }).click();
  await map.getByRole("tab", { name: "Live" }).click();
  await expect(map.locator(".map-canvas-pin", { hasText: "Saved Gate" })).toBeVisible();
  await expect(map.locator(".map-canvas-grid")).toBeVisible();
  await expect(map.locator(".map-fog-hole")).toHaveCount(2);
  await expect(map.locator(".map-fog-cover")).toHaveCount(1);
});
