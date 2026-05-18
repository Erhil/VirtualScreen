import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copySampleWorldSeed, resetWorldDirectory } from "./world-fixtures";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../..");
const sampleWorld = resolve(repoRoot, "sample-world");
const e2eWorldsRoot = resolve(repoRoot, ".virtualscreen", "e2e-worlds");
const e2eWorld = resolve(e2eWorldsRoot, "E2E World");

function resetE2eWorld() {
  mkdirSync(e2eWorldsRoot, { recursive: true });
  resetWorldDirectory(e2eWorld);
  copySampleWorldSeed(sampleWorld, e2eWorld);
  mkdirSync(resolve(e2eWorld, "Cards"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Scripts"), { recursive: true });
  mkdirSync(resolve(e2eWorld, "Tables"), { recursive: true });
  writeFileSync(
    resolve(e2eWorld, "README.md"),
    "# Dice Links\n\n[Check](roll:1d1+2)\n",
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Tables", "dice-links.csv"),
    "Name,Roll\nWatch,[CSV Check](roll:1d1+2)\n",
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Cards", "Dice Card.cs"),
    JSON.stringify(
      {
        kind: "custom",
        title: "Dice Card",
        tags: ["dice"],
        sections: [{ title: "Core", fields: { Check: "[Card Check](roll:1d1+2)" } }]
      },
      null,
      2
    ),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Scripts", "dice-roll.dms"),
    "value = roll('1d1+2')\nrender_md(f'# Roll\\n{value}')\n",
    "utf-8"
  );
}

test.beforeEach(async ({ request }) => {
  resetE2eWorld();
  await request.post("/api/worlds/open", { data: { id: "E2E World" } });
  await request.post("/api/index/rebuild");
  await request.put("/api/workspace/tabs", { data: { tabs: [], activePath: null } });
  await request.post("/api/display/blank");
});

function toolsPanel(page: Page) {
  return page.locator(".tools-panel");
}

async function openTool(page: Page, name: string) {
  const button = toolsPanel(page).locator(".tool-section-header").filter({ hasText: name });
  if ((await button.getAttribute("aria-expanded")) !== "true") {
    await button.click();
  }
}

function treeFile(page: Page, text: string) {
  return page.locator(".file-item").filter({ hasText: text }).first();
}

test("Dice tool rolls expressions, common dice, and invalid input @smoke", async ({ page }) => {
  await page.goto("/");
  await openTool(page, "Dice");

  const diceTool = page.locator(".dice-tool");
  await expect(diceTool).toBeVisible();
  await diceTool.getByLabel("Expression").fill("1d1+2");
  await diceTool.getByRole("button", { name: "Roll" }).click();
  await expect(diceTool.getByLabel("Result")).toContainText("3");
  await expect(diceTool.getByLabel("History")).toContainText("1d1+2");

  for (const label of ["d100", "d20", "d12", "d10", "d8", "d6", "d4", "d2"]) {
    await diceTool.getByRole("button", { name: label, exact: true }).click();
  }
  await expect(diceTool.locator(".dice-history li")).toHaveCount(9);

  for (let index = 0; index < 46; index += 1) {
    await diceTool.getByRole("button", { name: "d2", exact: true }).click();
  }
  await expect(diceTool.locator(".dice-history li")).toHaveCount(50);
  await expect
    .poll(async () =>
      diceTool.locator(".dice-history").evaluate((element) => ({
        maxHeight: window.getComputedStyle(element).maxHeight,
        scrollable: element.scrollHeight > element.clientHeight
      }))
    )
    .toEqual({ maxHeight: "112px", scrollable: true });

  await diceTool.getByLabel("Expression").fill("bad");
  await diceTool.getByRole("button", { name: "Roll" }).click();
  await expect(diceTool.getByRole("alert")).toBeVisible();
  await expect(diceTool.locator(".dice-history li")).toHaveCount(50);

  await diceTool.getByRole("button", { name: "Clear" }).click();
  await expect(diceTool.locator(".dice-history li")).toHaveCount(0);
});

test("roll links work in Markdown CSV and cards but not on the player screen @smoke", async ({
  page,
  context
}) => {
  await page.goto("/");

  await treeFile(page, "README.md").click();
  await page.getByRole("link", { name: "Check" }).click();
  await expect(page.locator(".dice-tool")).toContainText("1d1+2");
  await expect(page.locator(".dice-tool").getByLabel("Result")).toContainText("3");

  await treeFile(page, "dice-links.csv").click();
  await page.getByRole("link", { name: "CSV Check" }).click();
  await expect(page.locator(".dice-history li").first()).toContainText("1d1+2");

  await treeFile(page, "Dice Card").click();
  await page.getByRole("link", { name: "Card Check" }).click();
  await expect(page.locator(".dice-history li").first()).toContainText("1d1+2");

  await page.request.put("/api/display/fullscreen", { data: { path: "README.md" } });
  const player = await context.newPage();
  await player.goto("/screen");
  await expect(player.getByRole("link", { name: "Check" })).toBeVisible();
  await player.getByRole("link", { name: "Check" }).click();
  await expect(player.getByRole("complementary", { name: "DM Tools" })).toHaveCount(0);
});

test("Dice has context help and DMS roll regression @smoke", async ({ page, request }) => {
  await page.goto("/");
  await openTool(page, "Dice");
  await page.locator(".dice-tool").getByLabel("Expression").focus();
  await page.keyboard.press("F1");
  await expect(page.getByRole("dialog", { name: "Context Help" })).toContainText("Dice Help");

  const runResponse = await request.post("/api/scripts/run", {
    data: { path: "Scripts/dice-roll.dms" }
  });
  const runId = (await runResponse.json()).run_id as string;
  await expect
    .poll(async () => {
      const response = await request.get(`/api/scripts/runs/${runId}`);
      return response.json();
    })
    .toMatchObject({ status: "success" });
});

test("Russian Dice layout remains compact @smoke", async ({ page }) => {
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.addInitScript(() => {
    window.localStorage.setItem("virtualscreen.uiLanguage", "ru");
  });
  await page.goto("/");
  await openTool(page, "Кубики");

  const diceTool = page.locator(".dice-tool");
  await expect(diceTool).toBeVisible();
  await expect(diceTool.getByRole("button", { name: "Бросить" })).toBeVisible();
  const box = await diceTool.boundingBox();
  expect(box).not.toBeNull();
  expect(box!.width).toBeLessThanOrEqual(360);
});
