import { expect, test } from "@playwright/test";
import { existsSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { useE2eWorld, worldTree, openTreeFile, openToolSection, searchTool, metadataTool, fillCodeEditor, enterEditMode, saveActiveDraft, toggleMarkdownSplit, previewCleanDraft, revertDirtyDraft, e2eWorld } from "./world-browser-helpers";

useE2eWorld();

/**
 * A draft whose file changed underneath it must not be savable over the disk copy.
 *
 * This used to be asserted as "no Save button exists", which was true only because the
 * sole way to save was Ctrl+S. There is a Save button now - a keyboard is not always
 * available - so assert the property that actually matters: pressing it refuses, says
 * why, and leaves both the local draft and the disk state alone.
 */
async function expectSaveRefusedWhileChangedOnDisk(page: import("@playwright/test").Page) {
  const status = page.getByRole("region", { name: "Document status" });
  const editorText = await page.getByRole("textbox", { name: "Markdown editor" }).textContent();
  await status.getByRole("button", { name: "Save", exact: true }).click();

  // Refused, and it says so rather than doing nothing.
  await expect(status.locator(".editor-message")).toContainText("reload disk changes");
  await expect(status).toContainText("Editing");
  await expect(status.getByRole("button", { name: "Reload from disk" })).toBeVisible();
  // The local draft is still there to be rescued.
  await expect(page.getByRole("textbox", { name: "Markdown editor" })).toHaveText(
    editorText ?? ""
  );
}


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
  await expectSaveRefusedWhileChangedOnDisk(page);
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

  await openTreeFile(page, "random-events.csv", "Tables");
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

  await openTreeFile(page, "random-events.csv", "Tables");
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
  await expectSaveRefusedWhileChangedOnDisk(page);
});

test("creates markdown note, opens it, and indexes it for search", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: "Add in world" }).click();
  await page.getByRole("button", { name: "New Markdown" }).click();
  const dialog = page.getByRole("dialog", { name: "New File" });
  await dialog.getByLabel("Name").fill("Session Clue");
  await expect(dialog.getByLabel("New file path")).toHaveCount(0);
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
  await dialog.getByLabel("Name").fill("custom-rolls");
  await expect(dialog.getByLabel("New file path")).toHaveCount(0);
  await dialog.getByRole("button", { name: "Create File" }).click();

  await expect(page.getByRole("tab", { name: /custom-rolls/ })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "result" })).toBeVisible();
  await enterEditMode(page);
  await expect(page.getByRole("textbox", { name: "Header 1" })).toHaveValue("result");
  await expect(page.getByRole("textbox", { name: "Header 2" })).toHaveValue("event");
});
