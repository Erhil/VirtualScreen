import { expect, test } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { useE2eWorld, worldTree, ensureTreeFolderOpen, openTreeFile, openToolSection, searchTool, metadataTool, fillCodeEditor, enterEditMode, saveActiveDraft, chooseCodeCompletion, e2eWorld } from "./world-browser-helpers";

useE2eWorld();

test("edits metadata title and refreshes tab tree and search", async ({ page }) => {
  await page.goto("/");

  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await metadata.getByRole("textbox", { name: "Title" }).fill("Captain Ilyra Prime");
  await metadata.getByRole("button", { name: "Save Metadata" }).click();

  await expect(page.getByRole("tab", { name: "Captain Ilyra Prime" })).toBeVisible();
  await expect(worldTree(page).getByText("Captain Ilyra Prime")).toBeVisible();
  await expect(metadata.getByText("Captain Ilyra Prime")).toBeVisible();

  const search = await searchTool(page);
  await search.getByRole("searchbox", { name: "Search World" }).fill("Ilyra Prime");
  await expect(search.getByRole("button", { name: /Captain Ilyra Prime/ })).toBeVisible();
});

test("edits metadata tags and aliases and persists after reload", async ({ page }) => {
  await page.goto("/");

  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await metadata
    .getByRole("textbox", { name: "Tags" })
    .fill("city-watch, ally, quest-hook");
  await metadata
    .getByRole("textbox", { name: "Aliases" })
    .fill("Ilyra, Watch Captain, Gate Captain");
  await metadata.getByRole("button", { name: "Save Metadata" }).click();
  await page.waitForTimeout(300);
  await page.reload();
  await openToolSection(page, "Metadata");

  await expect(metadata.getByText("city-watch, ally, quest-hook")).toBeVisible();
  await expect(metadata.getByText("Ilyra, Watch Captain, Gate Captain")).toBeVisible();
});

test("adds and removes custom metadata fields", async ({ page }) => {
  await page.goto("/");

  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await expect(metadata.getByRole("textbox", { name: "Field 3 value" })).toHaveValue("medium");
  await metadata.getByRole("button", { name: "Remove field 3" }).click();
  await metadata.getByRole("button", { name: "Add Field" }).click();
  await metadata.getByRole("textbox", { name: "Field 4 key" }).pressSequentially("agenda");
  await metadata.getByRole("textbox", { name: "Field 4 value" }).fill("protect the gate");
  await metadata.getByRole("button", { name: "Save Metadata" }).click();

  await expect(metadata.getByText("protect the gate")).toBeVisible();
  await expect(metadata.getByText("medium")).toBeHidden();
});

test("shows metadata conflict and keeps unsaved values visible", async ({ page, request }) => {
  await page.goto("/");

  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await metadata
    .getByRole("textbox", { name: "Title" })
    .fill("Unsaved Metadata Title");

  const current = await (
    await request.get("/api/world/file?path=NPCs%2FCaptain%20Ilyra.md")
  ).json();
  await request.put("/api/world/file?path=NPCs%2FCaptain%20Ilyra.md", {
    data: {
      content: `${current.content}\nExternal metadata conflict`,
      expected_modified_at: current.modified_at,
      expected_hash: current.hash
    }
  });

  await metadata.getByRole("button", { name: "Save Metadata" }).click();

  await expect(metadata.getByText("World file changed on disk.")).toBeVisible();
  await expect(metadata.getByRole("textbox", { name: "Title" })).toHaveValue(
    "Unsaved Metadata Title"
  );
});

test("opens wiki-link targets from markdown content", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await page.locator(".markdown-viewer").getByRole("link", { name: "Captain Ilyra" }).click();

  await expect(page.getByRole("tab", { name: "Captain Ilyra" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Captain Ilyra" })).toBeVisible();

  await page.locator(".markdown-viewer").getByRole("link", { name: "Home" }).click();

  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
});

test("Markdown autocomplete inserts wiki and @ links", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await enterEditMode(page);
  await fillCodeEditor(page, "Markdown editor", "# Autocomplete Links\n\nMeet [[Ily");
  await chooseCodeCompletion(page, "Ilyra");
  await page.getByRole("textbox", { name: "Markdown editor" }).click();
  await page.keyboard.press("End");
  await page.keyboard.type("\n\nUse @Moonlit");
  await page.keyboard.press("End");
  await page.keyboard.press("Control+Space");
  await chooseCodeCompletion(page, "Moonlit Key");

  await saveActiveDraft(page);
  await expect(page.getByRole("region", { name: "Document status" })).toContainText(/Saved|Clean/);

  await openToolSection(page, "Metadata");
  await page
    .getByRole("region", { name: "Outgoing Links" })
    .getByRole("button", { name: /Moonlit Key/ })
    .click();
  await expect(page.getByRole("heading", { name: "Moonlit Key" })).toBeVisible();
});

test("shows outgoing links and backlinks in metadata panel", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await openToolSection(page, "Metadata");
  const outgoing = page.getByRole("region", { name: "Outgoing Links" });
  await expect(outgoing.getByRole("button", { name: "Captain Ilyra" })).toBeVisible();
  await expect(outgoing.getByRole("button", { name: "random-events.csv" })).toBeVisible();

  await outgoing.getByRole("button", { name: "random-events.csv" }).click();
  await expect(page.getByRole("tab", { name: "random-events.csv" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "result" })).toBeVisible();

  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");
  await openToolSection(page, "Metadata");
  const backlinks = page.getByRole("region", { name: "Backlinks" });
  await expect(backlinks.getByRole("button", { name: "Sample World Guide" })).toBeVisible();
});

test("opens CSV as a table", async ({ page }) => {
  await page.goto("/");

  await openTreeFile(page, "random-events.csv", "Tables");

  await expect(page.getByRole("tab", { name: "random-events.csv" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "result" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "event" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "tone" })).toBeVisible();
  await openToolSection(page, "Metadata");
  await expect(page.getByRole("button", { name: "Edit Metadata" })).toBeVisible();
  await expect(metadataTool(page).locator(".metadata-row dd").filter({ hasText: /^random-events$/ })).toBeVisible();
  await expect(metadataTool(page).locator(".metadata-row dt").filter({ hasText: /^Path$/ })).toHaveCount(0);
});

test("opens links from CSV cells", async ({ page }) => {
  await page.goto("/");

  await openTreeFile(page, "random-events.csv", "Tables");
  await page.locator(".table-wrap").getByRole("link", { name: "Home" }).first().click();

  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
});

test("renders LaTeX and sanitized HTML in markdown", async ({ page, request }) => {
  const title = `Render Check ${Date.now()}`;
  const createResponse = await request.post("/api/world/file", {
    data: {
      path: `${title}.md`,
      file_type: "markdown",
      content: [
        `# ${title}`,
        "",
        "Inline $x^2$ formula.",
        "",
        "$$d20 + 4$$",
        "",
        "<details><summary>Difficulty</summary><table><tr><td>15</td></tr></table></details>",
        "",
        "<img src=\"x\" onerror=\"window.__unsafeHtml = true\"><script>window.__unsafeHtml = true</script>"
      ].join("\n")
    }
  });
  expect(createResponse.ok()).toBeTruthy();

  await page.goto("/");
  await worldTree(page).getByRole("button", { name: title }).click();

  await expect(page.getByRole("heading", { name: title })).toBeVisible();
  await expect(page.locator(".katex").first()).toBeVisible();
  await expect(page.locator("details").getByText("Difficulty")).toBeVisible();
  await expect(page.locator(".markdown-viewer script")).toHaveCount(0);
  await expect(page.locator(".markdown-viewer img[onerror]")).toHaveCount(0);
  await expect(page.evaluate(() => (window as unknown as { __unsafeHtml?: boolean }).__unsafeHtml)).resolves.toBeFalsy();
});

test("renders LaTeX and clickable wiki-links inside CSV cells", async ({ page, request }) => {
  await request.post("/api/world/file", {
    data: {
      path: "Tables/render-cells.csv",
      file_type: "csv",
      content: "result,event\n1,\"Return [[../README|Home]] with $1d20$\"\n"
    }
  });

  await page.goto("/");
  await openTreeFile(page, "render-cells.csv", "Tables");

  await expect(page.locator(".table-wrap .katex").first()).toBeVisible();
  await page.locator(".table-wrap").getByRole("link", { name: "Home" }).click();
  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toBeVisible();
});

test("opens externally added unicode markdown and resolves outgoing links", async ({
  page,
  request
}) => {
  await request.get("/api/pages");
  const externalDir = resolve(e2eWorld, "NPCs", "Tavern");
  const externalFilename = "External \u2014 \u043a\u043e\u043f\u0438\u044f.md";
  mkdirSync(externalDir, { recursive: true });
  writeFileSync(
    resolve(externalDir, externalFilename),
    [
      "---",
      "title: External Tavern Copy",
      "tags:",
      "- external",
      "---",
      "",
      "# External Tavern Copy",
      "",
      "Return to [[../../README|Home]]."
    ].join("\n"),
    "utf-8"
  );

  await request.get("/api/pages");
  await page.goto("/");
  await ensureTreeFolderOpen(page, "NPCs");
  await ensureTreeFolderOpen(page, "Tavern");
  const externalButton = worldTree(page).getByRole("button", { name: /External Tavern Copy/ });
  await expect(externalButton).toBeVisible({ timeout: 10_000 });
  await externalButton.click();

  await expect(page.getByRole("tab", { name: "External Tavern Copy" })).toBeVisible();
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await expect(metadata.getByText("external", { exact: true })).toBeVisible();
  const outgoing = page.getByRole("region", { name: "Outgoing Links" });
  await expect(outgoing.getByRole("button", { name: "Sample World Guide" })).toBeVisible();

  await page.locator(".markdown-viewer").getByRole("link", { name: "Home" }).click();
  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toBeVisible();
});

test("edits metadata for CSV and media files", async ({ page }) => {
  await page.goto("/");

  await openTreeFile(page, "random-events.csv", "Tables");
  await openToolSection(page, "Metadata");
  const metadata = metadataTool(page);
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await metadata.getByRole("textbox", { name: "Title" }).fill("Random Event Table");
  await metadata.getByRole("textbox", { name: "Tags" }).fill("tables, session");
  await metadata.getByRole("button", { name: "Save Metadata" }).click();

  await expect(page.getByRole("tab", { name: "Random Event Table" })).toBeVisible();
  await expect(worldTree(page).getByText("Random Event Table")).toBeVisible();
  await expect(metadata.getByText("tables, session")).toBeVisible();

  await openTreeFile(page, "sample-map.svg", "Media");
  await metadata.getByRole("button", { name: "Edit Metadata" }).click();
  await metadata.getByRole("textbox", { name: "Title" }).fill("Tavern District Map");
  await metadata.getByRole("button", { name: "Save Metadata" }).click();

  await expect(page.getByRole("tab", { name: "Tavern District Map" })).toBeVisible();
  await expect(metadata.getByText("Tavern District Map")).toBeVisible();
});
