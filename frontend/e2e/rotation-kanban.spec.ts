import { expect, test } from "@playwright/test";
import type { APIRequestContext, Locator, Page } from "@playwright/test";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  copySampleWorldSeed,
  removeWorldPath,
  resetWorldDirectory
} from "./world-fixtures";
import { toolsPanel, worldTree } from "./world-browser-helpers";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../..");
const sampleWorld = resolve(repoRoot, "sample-world");
const e2eWorldsRoot = resolve(repoRoot, ".virtualscreen", "e2e-worlds");
const e2eWorld = resolve(e2eWorldsRoot, "E2E World");

function resetE2eWorld() {
  mkdirSync(e2eWorldsRoot, { recursive: true });
  for (const entry of readdirSync(e2eWorldsRoot)) {
    if (entry !== "E2E World") {
      removeWorldPath(resolve(e2eWorldsRoot, entry));
    }
  }
  resetWorldDirectory(e2eWorld);
  copySampleWorldSeed(sampleWorld, e2eWorld);
  mkdirSync(resolve(e2eWorld, "Board"), { recursive: true });
  writeFileSync(
    resolve(e2eWorld, "Board", "Smuggler Scene.md"),
    [
      "---",
      "title: Smuggler Scene",
      "fields:",
      "  Status: Todo",
      "---",
      "",
      "# Smuggler Scene",
      "",
      "The dock crew waits for a moonless tide."
    ].join("\n"),
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Board", "Harbor Encounters.csv"),
    "result,event\n1,Fog bank lanterns\n2,Customs officer arrives\n",
    "utf-8"
  );
  writeFileSync(
    resolve(e2eWorld, "Board", "Dock Contact.cs"),
    JSON.stringify(
      {
        kind: "npc",
        title: "Dock Contact",
        tags: ["kanban"],
        sections: [
          {
            title: "Core",
            fields: {
              Status: { type: "text", value: "Todo" },
              Hook: { type: "text", value: "Knows which crates are false-bottomed." }
            }
          }
        ]
      },
      null,
      2
    ),
    "utf-8"
  );
}

async function resetRuntimeState(request: APIRequestContext) {
  resetE2eWorld();
  await expectOk(request.post("/api/worlds/open", {
    data: { id: "E2E World" }
  }));
  await expectOk(request.post("/api/index/rebuild"));
  await expectOk(request.put("/api/workspace/tabs", {
    data: { tabs: [], activePath: null }
  }));
  await expectOk(request.post("/api/display/blank"));
  await expectOk(request.post("/api/map/stop"));
  await expectOk(request.delete("/api/map/reveals"));
  await expectOk(request.put("/api/map/fog", {
    data: { enabled: false }
  }));
}

test.beforeEach(async ({ request }) => {
  await resetRuntimeState(request);
});

async function expectOk(responsePromise: Promise<{ ok(): boolean; status(): number; text(): Promise<string> }>) {
  const response = await responsePromise;
  if (!response.ok()) {
    throw new Error(`E2E setup request failed with ${response.status()}: ${await response.text()}`);
  }
}



async function gotoWorkspace(page: Page) {
  await page.goto("/");
  await expect(worldTree(page)).toBeVisible();
}

async function openWorldFile(page: Page, fileName: string | RegExp, folder?: string) {
  const fileButton = worldTree(page).getByRole("button", { name: fileName });
  try {
    await expect(fileButton).toBeVisible({ timeout: 1000 });
  } catch {
    if (folder) {
      await worldTree(page).getByRole("button", { name: folder, exact: true }).click();
    }
    await expect(fileButton).toBeVisible();
  }
  await fileButton.click();
}

async function openToolSection(page: Page, name: "Screen") {
  const button = toolsPanel(page).getByRole("button", { name: new RegExp(`^${name}`) });
  if ((await button.getAttribute("aria-expanded")) !== "true") {
    await button.click();
  }
  await expect(button).toHaveAttribute("aria-expanded", "true");
}

async function screenTool(page: Page) {
  await openToolSection(page, "Screen");
  const screen = toolsPanel(page).getByRole("region", { name: "Screen Control" });
  await screen.getByRole("tab", { name: "Display" }).click();
  return screen;
}

async function mapTool(page: Page) {
  await openToolSection(page, "Screen");
  const screen = toolsPanel(page).getByRole("region", { name: "Screen Control" });
  await screen.getByRole("tab", { name: "Map" }).click();
  return toolsPanel(page).getByRole("region", { name: "Map Control" });
}

async function pageFields(request: APIRequestContext, path: string) {
  const response = await request.get(`/api/page?path=${encodeURIComponent(path)}`);
  expect(response.ok()).toBeTruthy();
  const page = (await response.json()) as { fields: Record<string, unknown> };
  return page.fields;
}

function statusField(fields: Record<string, unknown>) {
  return fields.Status ?? fields["Core.Status"];
}

async function moveKanbanCard(page: Page, title: string, targetColumn: Locator) {
  // The card's path travels in the DataTransfer: dragstart calls setData and
  // drop reads it back. Saving a move re-renders the board, and a dragstart
  // dispatched at a card that has just been replaced never reaches React, so
  // the DataTransfer stays empty and the drop is a silent no-op. Retry the
  // whole gesture until the card actually lands; re-dragging a card that is
  // already in the target column is harmless.
  await expect(async () => {
    const source = page.locator(".folder-kanban-card", { hasText: title });
    const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
    try {
      await source.dispatchEvent("dragstart", { dataTransfer });
      await targetColumn.dispatchEvent("drop", { dataTransfer });
    } finally {
      await dataTransfer.dispose();
    }
    await expect(targetColumn).toContainText(title, { timeout: 2000 });
  }).toPass({ timeout: 15000 });
}

test("Rotate 90 updates fullscreen and map output on the player screen @smoke", async ({
  context,
  page
}) => {
  const player = await context.newPage();
  await player.goto("/screen");
  await gotoWorkspace(page);

  await openWorldFile(page, /Sample World Guide/);
  const screen = await screenTool(page);
  await screen.getByRole("button", { name: "Show Active Fullscreen" }).click();
  await expect(player.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
  await screen.getByRole("button", { name: "Rotate 90" }).click();
  await expect(player.locator(".screen-fullscreen .screen-rotated-90")).toBeVisible();

  await openWorldFile(page, /sample-map/, "Media");
  const map = await mapTool(page);
  await map.getByRole("button", { name: "Use Active Image" }).click();
  await expect(map.locator(".map-canvas-dm img")).toBeVisible();
  await map.getByRole("button", { name: "Present Map" }).click();
  await expect(player.locator(".screen-map")).toBeVisible();
  await map.getByRole("button", { name: "Rotate 90" }).click();
  await expect
    .poll(async () => player.locator(".screen-map .map-canvas-world").first().getAttribute("style"))
    .toContain("rotate(90deg)");
});

test("folder kanban groups direct files, persists metadata moves, and creates a card @smoke", async ({
  page,
  request
}) => {
  await gotoWorkspace(page);

  const boardFolder = worldTree(page).getByRole("button", { name: "Board", exact: true });
  await boardFolder.click({ button: "right" });
  await page.getByRole("menu").getByRole("button", { name: "Open as Kanban" }).click();

  await expect(page.getByRole("heading", { name: "Kanban: Board" })).toBeVisible();
  await page.getByLabel("Group by").selectOption("Status");
  await expect(page.getByRole("region", { name: "Todo" })).toContainText("Smuggler Scene");
  await expect(page.getByRole("region", { name: "Todo" })).toContainText("Dock Contact");
  await expect(page.getByRole("region", { name: "Unassigned" })).toContainText(
    "Harbor Encounters.csv"
  );

  await page.getByLabel("New column").fill("Done");
  await page.getByRole("button", { name: "Add Column" }).click();
  const doneColumn = page.getByRole("region", { name: "Done" });
  await expect(doneColumn).toBeVisible();

  const moves = [
    { title: "Smuggler Scene", path: "Board/Smuggler Scene.md" },
    { title: "Dock Contact", path: "Board/Dock Contact.cs" },
    { title: "Harbor Encounters.csv", path: "Board/Harbor Encounters.csv" }
  ];

  for (const { title, path } of moves) {
    await moveKanbanCard(page, title, doneColumn);
    await expect(doneColumn).toContainText(title);
    // Settle each move on disk before dragging the next card, so the re-render
    // that follows a save cannot land in the middle of the next gesture. The
    // status is read back through the index, which is refreshed asynchronously
    // after the write, so this needs more room than the default poll timeout.
    await expect
      .poll(async () => statusField(await pageFields(request, path)), {
        timeout: 15000,
        message: `${path} never reported Status=Done`
      })
      .toBe("Done");
  }

  await doneColumn.getByLabel("Card name").fill("New Lead");
  await doneColumn.getByRole("button", { name: "+ Card" }).click();
  await expect(doneColumn).toContainText("New Lead");
  await expect
    .poll(async () => statusField(await pageFields(request, "Board/New Lead.cs")))
    .toBe("Done");

  await doneColumn.getByRole("button", { name: /New Lead/ }).click();
  await expect(page.getByRole("heading", { name: "New Lead" })).toBeVisible();
});
