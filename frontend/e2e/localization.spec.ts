import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
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

async function switchToRussian(page: Page) {
  await page.getByRole("button", { name: "Settings" }).click();
  await page.getByLabel("Language").selectOption("ru");
  await expect(page.getByRole("dialog", { name: "Настройки" })).toBeVisible();
}

async function closeRussianSettings(page: Page) {
  await page.getByRole("button", { name: "Закрыть", exact: true }).click();
}

test("Settings switches the UI language and persists it after reload @smoke", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("navigation", { name: "World files" })).toBeVisible();

  await switchToRussian(page);

  await expect(page.getByRole("navigation", { name: "Файлы мира" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Поиск" })).toBeVisible();
  await expect(page.getByRole("complementary", { name: "Инструменты ведущего" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Настройки" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Настр." })).toBeFocused();

  await page.reload();

  await expect(page.getByRole("navigation", { name: "Файлы мира" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Настр." })).toBeVisible();

  await page.evaluate(() => window.localStorage.removeItem("virtualscreen.uiLanguage"));
  await page.reload();

  await expect(page.getByRole("navigation", { name: "World files" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Settings" })).toBeVisible();
});

test("Russian shell labels fit supported desktop layouts", async ({ page }) => {
  await page.goto("/");
  await switchToRussian(page);
  await closeRussianSettings(page);

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 }
  ]) {
    await page.setViewportSize(viewport);
    await expect(page.getByRole("navigation", { name: "Файлы мира" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Открыть" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Настр." })).toBeVisible();
    await expect(page.getByRole("complementary", { name: "Инструменты ведущего" })).toBeVisible();
    const actionBoxes = await page.locator(".panel-actions-row .panel-action").evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return { top: rect.top, bottom: rect.bottom };
      })
    );
    expect(actionBoxes).toHaveLength(5);
    for (const box of actionBoxes) {
      expect(Math.abs(box.top - actionBoxes[0].top)).toBeLessThan(2);
      expect(Math.abs(box.bottom - actionBoxes[0].bottom)).toBeLessThan(2);
    }
    const overflowingActions = await page.locator(".panel-actions-row .panel-action").evaluateAll((buttons) =>
      buttons
        .filter((button) => button.scrollWidth > button.clientWidth)
        .map((button) => button.textContent?.trim() ?? "")
    );
    expect(overflowingActions).toEqual([]);
  }
});

test("Russian labels cover core tools and document state", async ({ page }) => {
  await page.goto("/");
  await switchToRussian(page);
  await closeRussianSettings(page);

  await page.getByRole("button", { name: "README.md" }).click();
  await expect(page.locator(".document-state")).toContainText("Просмотр");

  await page.locator(".tool-section-header").filter({ hasText: "Метаданные" }).click();
  await expect(page.getByRole("button", { name: "Изменить метаданные" })).toBeVisible();

  await page.locator(".tool-section-header").filter({ hasText: "Аудио" }).click();
  await expect(page.getByRole("region", { name: "Управление аудио" })).toBeVisible();
  await expect(page.getByLabel("Поиск музыки")).toBeVisible();

  await page.locator(".tool-section-header").filter({ hasText: "Хиты" }).click();
  const hpTool = page.getByRole("region", { name: "Хиты", exact: true });
  await expect(hpTool).toBeVisible();
  await expect(hpTool.getByRole("button", { name: "Добавить" })).toBeVisible();

  await page.locator(".tool-section-header").filter({ hasText: "Действия" }).click();
  await expect(page.getByRole("region", { name: "Настройка быстрых действий" })).toBeVisible();
  await expect(page.getByRole("tab", { name: "Слоты" })).toBeVisible();

  await page.locator(".tool-section-header").filter({ hasText: "Экран" }).click();
  await expect(page.getByRole("region", { name: "Управление экраном" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Пустой экран" })).toBeVisible();
});

test("Player screen does not expose DM Settings controls", async ({ page }) => {
  await page.goto("/screen");

  await expect(page.getByRole("main", { name: "Player Screen" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Settings" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Настр." })).toHaveCount(0);
});
