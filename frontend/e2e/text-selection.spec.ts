import { writeFileSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test } from "@playwright/test";

import { e2eWorld, openNotesFile, useE2eWorld, workspaceControls } from "./world-browser-helpers";

useE2eWorld();

const PARAGRAPH = "Selectable prose that the disk guard never rewrites.";

test.beforeEach(() => {
  writeFileSync(
    resolve(e2eWorld, "Notes", "selectable.md"),
    `# Selectable\n\n${PARAGRAPH}\n`,
    "utf-8"
  );
});

function selectionText(page: import("@playwright/test").Page) {
  return page.evaluate(() => window.getSelection()?.toString() ?? "");
}

test("dragging across page text leaves a selection that can be copied", async ({ page }) => {
  await page.goto("/");
  await openNotesFile(page, "selectable.md");

  const paragraph = page.locator(".markdown-viewer p", { hasText: PARAGRAPH });
  await expect(paragraph).toBeVisible();
  const box = await paragraph.boundingBox();
  expect(box).not.toBeNull();
  if (!box) {
    return;
  }

  // A real press-drag-release, which is how the text is actually selected. The mouseup
  // ends in a click on the pane, and that click used to re-render and wipe the selection.
  await page.mouse.move(box.x + 4, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width - 4, box.y + box.height / 2, { steps: 12 });
  await page.mouse.up();

  expect((await selectionText(page)).trim().length).toBeGreaterThan(10);
});

test("a selection survives an unrelated re-render", async ({ page }) => {
  await page.goto("/");
  await openNotesFile(page, "selectable.md");

  const paragraph = page.locator(".markdown-viewer p", { hasText: PARAGRAPH });
  await expect(paragraph).toBeVisible();
  await paragraph.evaluate((node) => {
    const selection = window.getSelection();
    selection?.removeAllRanges();
    const range = document.createRange();
    range.selectNodeContents(node);
    selection?.addRange(range);
  });
  expect(await selectionText(page)).toContain(PARAGRAPH);

  // Any re-render of the app used to rewrite the rendered HTML wholesale, so the
  // selection also vanished on its own whenever a live-sync event arrived. Toggling a
  // panel is the cheapest way to provoke the same re-render deterministically.
  await workspaceControls(page).getByRole("button", { name: "Hide tools panel" }).click();
  await expect(page.locator(".tools-panel")).toHaveCount(0);

  expect(await selectionText(page)).toContain(PARAGRAPH);
});

test("an embedded image offers the same actions as a link", async ({ page }) => {
  writeFileSync(
    resolve(e2eWorld, "Notes", "with-image.md"),
    "# With Image\n\n![map](../Media/animated-map.gif)\n",
    "utf-8"
  );

  await page.goto("/");
  await openNotesFile(page, "with-image\.md");

  const image = page.locator(".markdown-viewer img").first();
  await expect(image).toBeVisible();

  // Same convention as a world link: right-click opens the context menu. The image is
  // tagged with its link index, so the existing handlers serve it - including the two
  // entries that only make sense for a picture.
  await image.click({ button: "right" });
  const menu = page.getByRole("menu");
  await expect(menu).toBeVisible();
  await expect(menu.getByRole("button", { name: "Show fullscreen" })).toBeVisible();
  await expect(menu.getByRole("button", { name: "Use as map" })).toBeVisible();

  await menu.getByRole("button", { name: "Use as map" }).click();
  await expect(menu).toHaveCount(0);
});
