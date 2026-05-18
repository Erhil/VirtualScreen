import { expect, test } from "@playwright/test";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
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
  for (const entry of readdirSync(e2eWorldsRoot)) {
    if (entry !== "E2E World") {
      rmSync(resolve(e2eWorldsRoot, entry), { force: true, recursive: true });
    }
  }
  resetWorldDirectory(e2eWorld);
  copySampleWorldSeed(sampleWorld, e2eWorld);
  writeFileSync(resolve(e2eWorld, "README.md"), "# E2E World\n", "utf-8");
}

test.beforeEach(async ({ request }) => {
  resetE2eWorld();
  await request.post("/api/worlds/open", {
    data: { id: "E2E World" }
  });
  await request.post("/api/index/rebuild");
});

test("Settings switches the UI language and persists it after reload @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "World files" })).toBeVisible();

  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await page.getByLabel("Language").selectOption("ru");

  await expect(page.getByRole("dialog", { name: "Настройки" })).toBeVisible();
  await expect(page.getByRole("navigation", { name: "Файлы мира" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Поиск" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Инструменты ведущего" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Настройки" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Настройки" })).toBeFocused();

  await page.reload();

  await expect(page.getByRole("navigation", { name: "Файлы мира" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Настройки" })).toBeVisible();

  await page.evaluate(() => window.localStorage.removeItem("virtualscreen.uiLanguage"));
  await page.reload();

  await expect(page.getByRole("navigation", { name: "World files" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
});

test("Russian shell labels fit supported desktop layouts", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Language").selectOption("ru");
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 }
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("navigation", { name: "Файлы мира" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Открыть папку" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Настройки" })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Инструменты ведущего" })).toBeVisible();
  }
});

test("Player screen does not expose DM Settings controls", async ({ page }) => {
  await page.goto("/screen");

  await expect(page.getByRole("main", { name: "Player Screen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Настройки" })).toHaveCount(0);
});
