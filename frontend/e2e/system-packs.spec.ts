import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  copySampleWorldSeed,
  createSystemPackArchive,
  resetWorldDirectory
} from "./world-fixtures";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../..");
const sampleWorld = resolve(repoRoot, "sample-world");
const e2eWorldsRoot = resolve(repoRoot, ".virtualscreen", "e2e-worlds");
const e2eWorld = resolve(e2eWorldsRoot, "E2E World");
const packDir = resolve(e2eWorldsRoot, "packs");

function resetE2eWorld() {
  mkdirSync(e2eWorldsRoot, { recursive: true });
  for (const entry of readdirSync(e2eWorldsRoot)) {
    if (entry !== "E2E World") {
      rmSync(resolve(e2eWorldsRoot, entry), { force: true, recursive: true });
    }
  }
  resetWorldDirectory(e2eWorld);
  copySampleWorldSeed(sampleWorld, e2eWorld);
  mkdirSync(packDir, { recursive: true });
}

test.beforeEach(async ({ request }) => {
  resetE2eWorld();
  await request.post("/api/worlds/open", {
    data: { id: "E2E World" }
  });
  await request.post("/api/index/rebuild");
});

function worldTree(page: Page) {
  return page.locator(".world-tree");
}

function removeImportedPackFiles() {
  rmSync(resolve(e2eWorld, "Cards", "E2E Pack Card.cs"), { force: true });
  rmSync(resolve(e2eWorld, "Tables", "e2e-pack-table.csv"), { force: true });
  rmSync(resolve(e2eWorld, "Media", "e2e-pack-map.svg"), { force: true });
  rmSync(resolve(e2eWorld, ".music", "ambient", "E2E Pack"), { force: true, recursive: true });
  rmSync(resolve(e2eWorld, ".virtualscreen", "card-templates", "e2e-pack-template.json"), {
    force: true
  });
}

async function openSettings(page: Page) {
  let dialog = page.getByRole("dialog", { name: /Settings|Настройки/ });
  if ((await dialog.count()) === 0 || !(await dialog.isVisible())) {
    await page.getByRole("button", { name: /Settings|Настр\./ }).click();
    dialog = page.getByRole("dialog", { name: /Settings|Настройки/ });
  }
  await expect(dialog).toBeVisible();
  return dialog;
}

async function openPackPreview(page: Page, archivePath: string) {
  const dialog = await openSettings(page);
  await dialog.locator("input[type='file']").setInputFiles(archivePath);
  await expect(
    dialog.getByRole("heading", { name: /E2E Content Pack|Harbor Starter Pack|Import Pack|Импорт набора/ })
  ).toBeVisible();
  return dialog;
}

async function importPreview(dialog: Locator) {
  const importButton = dialog.getByRole("button", { name: /Import|Импорт/ });
  await expect(importButton).toBeEnabled();
  await importButton.click();
  await expect(dialog.locator(".settings-pack-summary")).toBeVisible();
  await expect(importButton).toBeDisabled();
}

async function closeSettings(dialog: Locator) {
  await dialog.getByRole("button", { name: /Close$/ }).click();
  await expect(dialog).toBeHidden();
}

async function chooseConflict(dialog: Locator, decision: "skip" | "overwrite" | "rename") {
  const select = dialog.getByLabel("Notes/E2E Pack Note.md");
  await select.selectOption(decision);
  await expect(select).toHaveValue(decision);
}

test("imports the real sample-world Harbor Starter Pack", async ({ page }) => {
  const archivePath = resolve(e2eWorld, "System Packs", "Harbor Starter Pack.zip");

  await page.goto("/");
  const dialog = await openPackPreview(page, archivePath);

  await expect(dialog).toContainText("Harbor Starter Pack");
  await expect(dialog).toContainText("Imported Harbor Rumors");
  await expect(dialog).toContainText("Imported Dockside Contact");
  await expect(dialog).toContainText("imported-harbor-events.csv");
  await expect(dialog).toContainText("imported-pack-map.svg");
  await expect(dialog).toContainText("harbor-pack-ambience.wav");
  await expect(dialog).toContainText("imported-contact.json");
  await expect(dialog).toContainText(/skipped_pack_script\.dms|skipped|unsupported/i);

  await importPreview(dialog);
  await closeSettings(dialog);

  await expect(worldTree(page).getByRole("button", { name: /Imported Harbor Rumors/ })).toBeVisible();
  await expect(worldTree(page).getByRole("button", { name: /Imported Dockside Contact/ })).toBeVisible();
  await expect(worldTree(page).getByRole("button", { name: /imported-harbor-events\.csv/ })).toBeVisible();
  await expect(worldTree(page).getByRole("button", { name: /imported-pack-map\.svg/ })).toBeVisible();

  await page.getByRole("button", { name: /Search/ }).click();
  const search = page.getByRole("region", { name: /Global Search/ });
  await search.getByRole("searchbox").fill("silver gull lantern");
  await expect(search.getByRole("button", { name: /Imported Harbor Rumors/ })).toBeVisible();
  await page.reload();

  await page
    .getByRole("region", { name: /Audio tool/i })
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("searchbox", { name: /Music Search/i }).fill("harbor-pack");
  await expect(page.getByRole("button", { name: "harbor-pack-ambience" })).toBeVisible();

  await page.getByRole("button", { name: /New Card/ }).click();
  await expect(page.getByLabel("Card template")).toContainText("Imported Contact");
  await page.keyboard.press("Escape");

  expect(existsSync(resolve(e2eWorld, "Scripts", "skipped_pack_script.dms"))).toBe(false);
});

test("previews and imports a valid content-only system pack", async ({ page }) => {
  const archivePath = resolve(packDir, "valid-system-pack.zip");
  createSystemPackArchive(archivePath);

  await page.goto("/");
  const dialog = await openPackPreview(page, archivePath);

  await expect(dialog).toContainText("E2E Content Pack");
  await expect(dialog).toContainText("E2E Pack Note");
  await expect(dialog).toContainText("E2E Pack Card");
  await expect(dialog).toContainText("e2e-pack-table.csv");
  await expect(dialog).toContainText("e2e-pack-map.svg");
  await expect(dialog).toContainText("e2e-ambience.mp3");
  await expect(dialog).toContainText("e2e-pack-template.json");
  await expect(dialog).toContainText(/should-not-import\.dms|skipped|unsupported/i);

  await importPreview(dialog);
  await closeSettings(dialog);

  await expect(worldTree(page).getByRole("button", { name: /E2E Pack Note/ })).toBeVisible();
  await expect(worldTree(page).getByRole("button", { name: /E2E Pack Card/ })).toBeVisible();
  await expect(worldTree(page).getByRole("button", { name: /e2e-pack-table\.csv/ })).toBeVisible();
  await expect(worldTree(page).getByRole("button", { name: /e2e-pack-map\.svg/ })).toBeVisible();

  await page.getByRole("button", { name: /Search|Поиск/ }).click();
  const search = page.getByRole("region", { name: /Global Search|Глобальный поиск/ });
  await search.getByRole("searchbox").fill("Pack lantern phrase");
  await expect(search.getByRole("button", { name: /E2E Pack Note/ })).toBeVisible();
  await page.reload();

  await page
    .getByRole("region", { name: /Audio tool|Инструмент Аудио/i })
    .getByRole("button")
    .first()
    .click();
  await page.getByRole("searchbox", { name: /Music Search|Поиск музыки/i }).fill("e2e-ambience");
  await expect(page.getByRole("button", { name: "e2e-ambience" })).toBeVisible();

  await page.getByRole("button", { name: /New Card|Новая карта/ }).click();
  await expect(page.getByLabel("Card template")).toContainText("E2E Pack Template");
  await page.keyboard.press("Escape");

  expect(existsSync(resolve(e2eWorld, "Scripts", "should-not-import.dms"))).toBe(false);
});

test("supports skip overwrite and rename conflict choices", async ({ page }) => {
  const archivePath = resolve(packDir, "conflict-system-pack.zip");
  createSystemPackArchive(archivePath);
  mkdirSync(resolve(e2eWorld, "Notes"), { recursive: true });
  writeFileSync(resolve(e2eWorld, "Notes", "E2E Pack Note.md"), "# Existing Note\n", "utf-8");

  await page.goto("/");
  let dialog = await openPackPreview(page, archivePath);
  await chooseConflict(dialog, "skip");
  await importPreview(dialog);
  expect(readFileSync(resolve(e2eWorld, "Notes", "E2E Pack Note.md"), "utf-8")).toContain(
    "Existing Note"
  );
  removeImportedPackFiles();

  await page.reload();
  dialog = await openPackPreview(page, archivePath);
  await chooseConflict(dialog, "overwrite");
  await importPreview(dialog);
  expect(readFileSync(resolve(e2eWorld, "Notes", "E2E Pack Note.md"), "utf-8")).toContain(
    "Pack lantern phrase"
  );
  expect(existsSync(resolve(e2eWorld, ".virtualscreen", "backups"))).toBe(true);
  removeImportedPackFiles();

  writeFileSync(resolve(e2eWorld, "Notes", "E2E Pack Note.md"), "# Existing Again\n", "utf-8");
  await page.reload();
  dialog = await openPackPreview(page, archivePath);
  await chooseConflict(dialog, "rename");
  await dialog.getByLabel(/Rename target|Новый путь/).fill("Notes/E2E Pack Note From Pack.md");
  await importPreview(dialog);
  expect(readFileSync(resolve(e2eWorld, "Notes", "E2E Pack Note.md"), "utf-8")).toContain(
    "Existing Again"
  );
  expect(readFileSync(resolve(e2eWorld, "Notes", "E2E Pack Note From Pack.md"), "utf-8")).toContain(
    "Pack lantern phrase"
  );
});

test("rejects bad pack paths without writing files", async ({ page }) => {
  const archivePath = resolve(packDir, "bad-path-system-pack.zip");
  createSystemPackArchive(archivePath, { invalidPath: true });

  await page.goto("/");
  const dialog = await openPackPreview(page, archivePath);
  await expect(dialog).toContainText(/invalid|unsafe|rejected|path/i);
  await expect(dialog.getByRole("button", { name: /Import|Импорт/ })).toBeDisabled();

  expect(existsSync(resolve(e2eWorld, "escaped.md"))).toBe(false);
  expect(existsSync(resolve(e2eWorldsRoot, "escaped.md"))).toBe(false);
  expect(existsSync(resolve(e2eWorld, "Notes", "E2E Pack Note.md"))).toBe(false);
});

test("Russian system-pack dialog layout fits supported desktop layouts", async ({ page }) => {
  const archivePath = resolve(packDir, "ru-system-pack.zip");
  createSystemPackArchive(archivePath);

  await page.goto("/");
  const settings = await openSettings(page);
  await settings.getByLabel("Language").selectOption("ru");
  await page.keyboard.press("Escape");
  await expect(settings).toBeHidden();

  for (const viewport of [
    { width: 1366, height: 768 },
    { width: 1920, height: 1080 },
    { width: 2560, height: 1440 }
  ]) {
    await page.setViewportSize(viewport);
    const dialog = await openPackPreview(page, archivePath);
    await expect(dialog).toBeVisible();
    const box = await dialog.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.y).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width);
    expect(box!.y + box!.height).toBeLessThanOrEqual(viewport.height);
    await page.keyboard.press("Escape");
  }

  await page.setViewportSize({ width: 1366, height: 768 });
  const dialog = await openPackPreview(page, archivePath);
  await importPreview(dialog);
  const summaryBox = await dialog.boundingBox();
  expect(summaryBox).not.toBeNull();
  expect(summaryBox!.y).toBeGreaterThanOrEqual(0);
  expect(summaryBox!.y + summaryBox!.height).toBeLessThanOrEqual(768);
  await expect(dialog.getByRole("button", { name: /^Закрыть$/ })).toBeVisible();
  await dialog.getByRole("button", { name: /^Закрыть$/ }).click();
  await expect(dialog).toBeHidden();
});
