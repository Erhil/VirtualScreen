import { expect, test } from "@playwright/test";
import { useE2eWorld, worldTree, ensureTreeFolderOpen, openTreeFile, toolsPanel, workspaceControls, openToolSection, searchTool, screenTool, enterEditMode } from "./world-browser-helpers";

useE2eWorld();

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
  await expect(worldTree(page).getByRole("button", { name: /Harbor Watch Contact/ })).toHaveCount(0);
  await ensureTreeFolderOpen(page, "Cards");
  await expect(worldTree(page).getByRole("button", { name: /Harbor Watch Contact/ })).toBeVisible();
  await expect(worldTree(page).getByText(".music")).toHaveCount(0);
});

test("world tree context menu duplicates renames and trashes files", async ({ page }) => {
  await page.goto("/");
  const tree = worldTree(page);
  await ensureTreeFolderOpen(page, "Cards");
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
  await ensureTreeFolderOpen(page, "Cards");
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

  const worldPanelActions = page.locator(".panel-actions-row");
  await worldPanelActions.getByRole("button", { name: "Open", exact: true }).click();
  let dialog = page.getByRole("dialog", { name: "Open Folder as World" });
  await expect(dialog.getByRole("button", { name: /^Side World/ })).toBeVisible();
  await dialog.getByRole("button", { name: /^Side World/ }).click();
  await expect(worldTree(page).getByRole("button", { name: /Side World Home/ })).toBeVisible();

  await worldPanelActions.getByRole("button", { name: "New", exact: true }).click();
  dialog = page.getByRole("dialog", { name: "Add New World" });
  await dialog.getByLabel("World name").fill("Fresh Realm");
  await dialog.getByRole("button", { name: "Create World" }).click();

  await expect(worldTree(page).getByRole("button", { name: "Fresh Realm", exact: true })).toBeVisible();
  await expect(page.getByLabel("Select world")).toContainText("Fresh Realm");
});

test("folder add menu creates markdown, csv, and nested folders", async ({ page }) => {
  await page.goto("/");

  const cardsFolder = worldTree(page).getByRole("button", { name: "Cards", exact: true });
  if ((await cardsFolder.getAttribute("aria-expanded")) === "true") {
    await cardsFolder.click();
  }
  await expect(cardsFolder).toHaveAttribute("aria-expanded", "false");

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
  await expect(dialog.getByLabel("Name")).toBeVisible();
  await expect(dialog.getByLabel("File type")).toHaveCount(0);
  await expect(dialog.getByLabel("New file path")).toHaveCount(0);
  await dialog.getByLabel("Name").fill("Rumor");
  await expect(dialog).toContainText("Will create: NPCs/Playwright Nest/Rumor.md");
  await dialog.getByRole("button", { name: "Create File" }).click();
  await expect(page.getByRole("tab", { name: "Rumor" })).toBeVisible();
  await expect(worldTree(page).getByText("Rumor.md")).toBeVisible();
  await expect(cardsFolder).toHaveAttribute("aria-expanded", "false");

  await worldTree(page).getByRole("button", { name: "Add in Playwright Nest" }).click();
  await page.getByRole("button", { name: "New CSV" }).click();
  dialog = page.getByRole("dialog", { name: "New File" });
  await dialog.getByLabel("Name").fill("rumors");
  await expect(dialog).toContainText("Will create: NPCs/Playwright Nest/rumors.csv");
  await dialog.getByRole("button", { name: "Create File" }).click();
  await expect(page.getByRole("tab", { name: /rumors/ })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "result" })).toBeVisible();
  await expect(cardsFolder).toHaveAttribute("aria-expanded", "false");

  await worldTree(page).getByRole("button", { name: "Add in Playwright Nest" }).click();
  await page.getByRole("button", { name: "New Script" }).click();
  dialog = page.getByRole("dialog", { name: "New File" });
  await dialog.getByLabel("Name").fill("setup");
  await expect(dialog).toContainText("Will create: NPCs/Playwright Nest/setup.dms");
  await dialog.getByRole("button", { name: "Create File" }).click();
  await expect(page.getByRole("tab", { name: "setup" })).toBeVisible();
  await expect(cardsFolder).toHaveAttribute("aria-expanded", "false");

  await worldTree(page).getByRole("button", { name: "Add in Playwright Nest" }).click();
  await worldTree(page)
    .getByRole("menu")
    .getByRole("button", { name: "New Card", exact: true })
    .click();
  dialog = page.getByRole("dialog", { name: "New Card" });
  await dialog.getByLabel("Name").fill("Dock Boss");
  await expect(dialog.getByLabel("New file path")).toHaveCount(0);
  await expect(dialog).toContainText("Will create: NPCs/Playwright Nest/Dock Boss.cs");
  await dialog.getByRole("button", { name: "Create Card" }).click();
  await expect(page.getByRole("tab", { name: "Dock Boss" })).toBeVisible();
  await expect(cardsFolder).toHaveAttribute("aria-expanded", "false");
});

test("shows unsupported file state", async ({ page }) => {
  await page.goto("/");

  await openTreeFile(page, "roll.bin", "Unsupported");

  await expect(page.getByRole("tab", { name: "roll.bin" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Unsupported File" })).toBeVisible();
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

  await ensureTreeFolderOpen(page, "Tables");
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

  await ensureTreeFolderOpen(page, "Tables");
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

  await openTreeFile(page, "sample-map.svg", "Media");
  await expect(page.locator(".editor-toolbar")).toHaveCount(0);
  await expect(page.locator("img[alt='sample-map.svg']")).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Markdown editor" })).toHaveCount(0);
  await openToolSection(page, "Metadata");
  await expect(page.getByRole("button", { name: "Edit Metadata" })).toBeVisible();

  await openTreeFile(page, "roll.bin", "Unsupported");
  await expect(page.getByRole("heading", { name: "Unsupported File" })).toBeVisible();
  await expect(page.locator(".editor-toolbar")).toHaveCount(0);
  await expect(page.getByRole("textbox", { name: "Markdown editor" })).toHaveCount(0);
  await openToolSection(page, "Metadata");
  await expect(page.getByRole("button", { name: "Edit Metadata" })).toBeVisible();
});
