import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { e2eWorld, openNotesFile, toolsPanel, useE2eWorld, worldTree } from "./world-browser-helpers";

useE2eWorld();

const DISABLED_TOOLS_KEY = "virtualscreen.disabledTools";

async function seedDisabledTools(page: Page, tools: string[]) {
  await page.addInitScript(
    ([key, value]) => {
      window.localStorage.setItem(key, value);
    },
    [DISABLED_TOOLS_KEY, JSON.stringify(tools)] as [string, string]
  );
}

async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Settings", exact: true }).click();
  const dialog = page.getByRole("dialog", { name: "Settings" });
  await expect(dialog).toBeVisible();
  return dialog;
}

async function closeSettings(page: Page) {
  await page.getByRole("button", { name: "Close Settings" }).click();
}

function hpHeader(page: Page) {
  return toolsPanel(page).getByRole("button", { name: /^HP/ });
}

test("disabling a tool hides its section, survives a world switch, and comes back when re-enabled", async ({
  page
}) => {
  await page.goto("/");
  await expect(hpHeader(page)).toBeVisible();

  const settings = await openSettings(page);
  const hpToggle = settings.getByRole("checkbox", { name: "HP" });
  await expect(hpToggle).toBeChecked();
  await hpToggle.uncheck();
  await closeSettings(page);

  await expect(hpHeader(page)).toHaveCount(0);

  // Switching worlds re-seeds ToolPanelState from scratch (prepareWorldSwitch);
  // without re-reading the disabled set there too, this would silently
  // re-enable every tool.
  await page.getByLabel("Select world").selectOption("Side World");
  await expect(worldTree(page).getByRole("button", { name: /Side World Home/ })).toBeVisible();
  await expect(hpHeader(page)).toHaveCount(0);

  await page.getByLabel("Select world").selectOption("E2E World");
  await expect(worldTree(page).getByText("Sample World Guide")).toBeVisible();
  await expect(hpHeader(page)).toHaveCount(0);

  const settingsAgain = await openSettings(page);
  await settingsAgain.getByRole("checkbox", { name: "HP" }).check();
  await closeSettings(page);

  await expect(hpHeader(page)).toBeVisible();
});

test("a disabled Dice tool is gone from the panel and its inline roll links go inert", async ({ page }) => {
  await seedDisabledTools(page, ["dice"]);
  writeFileSync(
    resolve(e2eWorld, "Notes", "dice-roll-link.md"),
    "# Dice Roll Link\n\n[Roll](roll:2d6)\n",
    "utf-8"
  );

  await page.goto("/");
  await expect(toolsPanel(page).getByRole("button", { name: /^Dice/ })).toHaveCount(0);

  await openNotesFile(page, "dice-roll-link.md");
  await expect(page.getByRole("heading", { name: "Dice Roll Link" })).toBeVisible();
  await expect(page.locator(".dice-tool")).toHaveCount(0);

  await page.getByRole("link", { name: "Roll" }).click();

  // The link is inert: no dice tool appears and nothing is logged anywhere,
  // unlike the enabled-dice case in dice.spec.ts where the same click opens
  // the Dice tool and records the roll.
  await expect(page.locator(".dice-tool")).toHaveCount(0);
  await expect(toolsPanel(page).getByRole("button", { name: /^Dice/ })).toHaveCount(0);

  // The checkbox reflects the seeded value, and re-enabling brings the
  // section back.
  const settings = await openSettings(page);
  const diceToggle = settings.getByRole("checkbox", { name: "Dice" });
  await expect(diceToggle).not.toBeChecked();
  await diceToggle.check();
  await closeSettings(page);

  await expect(toolsPanel(page).getByRole("button", { name: /^Dice/ })).toBeVisible();
});
