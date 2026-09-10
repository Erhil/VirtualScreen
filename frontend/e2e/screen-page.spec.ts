import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { useE2eWorld, openToolSection, toolsPanel, workspaceControls, worldTree } from "./world-browser-helpers";

useE2eWorld();

function screenButton(page: Page) {
  return workspaceControls(page).getByRole("button", { name: "Screen", exact: true });
}

test("Screen button opens the Screen tab and renders controls in the main workspace area", async ({
  page
}) => {
  await page.goto("/");

  await screenButton(page).click();

  const tab = page.getByRole("tab", { name: "Screen" });
  await expect(tab).toBeVisible();
  await expect(tab).toHaveAttribute("aria-selected", "true");

  const mainPane = page.getByRole("region", { name: "Main viewer pane" });
  const pageControls = mainPane.getByRole("region", { name: "Screen Control" });
  await expect(pageControls).toBeVisible();
  await expect(pageControls.getByRole("tab", { name: "Display" })).toBeVisible();
  await expect(pageControls.getByRole("button", { name: "Blank Screen" })).toBeVisible();

  // Opening the page tab must not disturb the tools panel's own Screen section, and the
  // panel helper other specs use must keep resolving to exactly one region even with both
  // instances of ScreenTool mounted at once.
  await openToolSection(page, "Screen");
  const panelControls = toolsPanel(page).getByRole("region", { name: "Screen Control" });
  await expect(panelControls).toHaveCount(1);
  await expect(panelControls).toBeVisible();
  await expect(pageControls).toBeVisible();
});

test("sending the active document to the player screen still targets a document when the Screen tab is focused", async ({
  context,
  page
}) => {
  const screen = await context.newPage();
  await screen.goto("/screen");

  await page.goto("/");
  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await expect(page.getByRole("tab", { name: "Sample World Guide" })).toHaveAttribute(
    "aria-selected",
    "true"
  );

  await screenButton(page).click();
  const screenTab = page.getByRole("tab", { name: "Screen" });
  await expect(screenTab).toHaveAttribute("aria-selected", "true");

  const controls = page
    .getByRole("region", { name: "Main viewer pane" })
    .getByRole("region", { name: "Screen Control" });
  await expect(controls).toBeVisible();

  // The button label itself already proves the target resolved to the real document, not
  // the synthetic screen://main path of the tab that is actually focused right now.
  const target = controls.getByRole("button", { name: "Open Active as Popup" });
  await expect(target).toHaveText(/Sample World Guide/);

  const popupRequest = page.waitForRequest(
    (request) => request.url().includes("/api/display/popup") && request.method() === "POST"
  );
  await target.click();
  const request = await popupRequest;
  expect((request.postDataJSON() as { path: string }).path).toBe("README.md");

  await expect(screen.getByRole("region", { name: "Popup Sample World Guide" })).toBeVisible();

  // Fullscreen reads "the active file" most literally of all, and was the last path
  // still resolving it from the focused tab rather than the focused document - so with
  // the Screen tab selected it would have put screen://main in front of the players.
  await controls.getByRole("button", { name: /^Show .* Fullscreen/ }).click();
  await expect(screen.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
});

test("closing the Screen tab leaves the workspace usable", async ({ page }) => {
  await page.goto("/");

  await screenButton(page).click();
  await expect(page.getByRole("tab", { name: "Screen" })).toBeVisible();

  await page.getByRole("button", { name: "Close Screen" }).click();
  await expect(page.getByRole("tab", { name: "Screen" })).toHaveCount(0);
  await expect(page.getByText("Select a File")).toBeVisible();

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
});
