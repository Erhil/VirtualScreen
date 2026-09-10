import { expect, test } from "@playwright/test";

import {
  enterEditMode,
  openCardsFile,
  useE2eWorld
} from "./world-browser-helpers";

useE2eWorld();

function documentStatus(page: import("@playwright/test").Page) {
  return page.getByRole("region", { name: "Document status" });
}

// Everything here is deliberately pointer-only. Entering an edit was always reachable by
// touch (double-tap), but leaving one was not: the sole path to handleSaveDraft ran
// through a keyboard listener, so a tablet could get into a card edit and never out.
test("a card edit can be saved and left without a keyboard", async ({ page }) => {
  await page.goto("/");
  await openCardsFile(page, "Moonlit Key\.cs");
  await enterEditMode(page);

  const title = page.locator(".card-editor input").first();
  await title.fill("Renamed by touch");

  await documentStatus(page).getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".editor-status")).toHaveText(/Saved|Clean/);

  await documentStatus(page).getByRole("button", { name: "Done", exact: true }).click();
  await expect(documentStatus(page)).toContainText("Preview");
});

test("leaving a dirty edit names the buttons instead of a shortcut", async ({ page }) => {
  await page.goto("/");
  await openCardsFile(page, "Moonlit Key\.cs");
  await enterEditMode(page);
  await page.locator(".card-editor input").first().fill("Unsaved by touch");

  await documentStatus(page).getByRole("button", { name: "Done", exact: true }).click();

  // The old message told a tablet user to press Ctrl+S, which they cannot do. It now
  // names the two buttons sitting next to it, and the edit is held rather than lost.
  await expect(documentStatus(page)).toContainText("There are unsaved changes");
  await expect(documentStatus(page)).toContainText("Discard changes");
  await expect(documentStatus(page)).toContainText("Editing");

  page.once("dialog", (dialog) => void dialog.accept());
  await documentStatus(page).getByRole("button", { name: "Discard changes" }).click();
  await expect(documentStatus(page)).toContainText("Preview");
});
