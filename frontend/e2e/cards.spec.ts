import { expect, test } from "@playwright/test";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { useE2eWorld, worldTree, ensureTreeFolderOpen, openTreeFile, openCardsFile, toolsPanel, workspaceControls, openToolSection, searchTool, screenTool, fillCodeEditor, enterEditMode, saveActiveDraft, previewCleanDraft, runActiveScript, gotoWorkspace, expectWorkspaceActivePath, e2eWorld } from "./world-browser-helpers";

useE2eWorld();

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
  await dialog.getByLabel("Name").fill("Playwright Sigil");
  await expect(dialog.getByLabel(/New (file|card) path/i)).toHaveCount(0);
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

  await openTreeFile(page, /create_computed_card\.dms/, "Scripts");
  await runActiveScript(page);

  await ensureTreeFolderOpen(page, "Cards");
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

  await openTreeFile(page, /create_card_success\.dms/, "Scripts");
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

  await ensureTreeFolderOpen(page, "Cards");
  await expect(worldTree(page).getByRole("button", { name: /DMS Contact\.cs/ })).toBeVisible({
    timeout: 10000
  });
  await openCardsFile(page, "DMS Contact\\.cs");
  await expect(page.getByRole("heading", { name: "DMS Contact" })).toBeVisible();
  await expect(page.getByText("Find the lighthouse key.")).toBeVisible();
});

test("DMS card_template can create a V2 card from a world-local template", async ({ page }) => {
  await page.goto("/");

  await openTreeFile(page, /create_card_success\.dms/, "Scripts");
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

  await ensureTreeFolderOpen(page, "Cards");
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

  const tabsSaved = page.waitForResponse(
    (response) => response.url().includes("/api/workspace/tabs") && response.request().method() === "PUT"
  );
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

  await tabsSaved;
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

  const tabsSaved = page.waitForResponse(
    (response) => response.url().includes("/api/workspace/tabs") && response.request().method() === "PUT"
  );
  await openCardsFile(page, "Moonlit Key\\.cs");
  const moonlit = worldTree(page).getByRole("button", { name: /Moonlit Key Moonlit Key\.cs/ });
  await moonlit.click({ button: "right" });
  const favoritesSaved = page.waitForResponse(
    (response) => response.url().includes("/api/workspace/favorites") && response.request().method() === "PUT"
  );
  await page.getByRole("menu").getByRole("button", { name: "Favorite" }).click();

  const favorites = page.getByRole("region", { name: "Favorites" });
  await expect(favorites.getByRole("button", { name: /Moonlit Key/ })).toBeVisible();
  const recent = page.getByRole("region", { name: "Recent" });
  await recent.getByRole("button", { name: /Recent/ }).click();
  await expect(recent.getByRole("button", { name: /Moonlit Key/ })).toBeVisible();

  await Promise.all([tabsSaved, favoritesSaved]);
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
