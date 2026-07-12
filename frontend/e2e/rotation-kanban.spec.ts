import { expect, test } from "@playwright/test";
import type { APIRequestContext, Locator, Page } from "@playwright/test";
import { mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { copySampleWorldSeed, resetWorldDirectory } from "./world-fixtures";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "../..");
const sampleWorld = resolve(repoRoot, "sample-world");
const e2eWorldsRoot = resolve(repoRoot, ".virtualscreen", "e2e-worlds");
const e2eWorld = resolve(e2eWorldsRoot, "E2E World");
const authHeaders = { "X-VirtualScreen-Token": "dev" };

function resetE2eWorld() {
  mkdirSync(e2eWorldsRoot, { recursive: true });
  for (const entry of readdirSync(e2eWorldsRoot)) {
    if (entry !== "E2E World") {
      rmSync(resolve(e2eWorldsRoot, entry), { force: true, recursive: true });
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
    data: { id: "E2E World" },
    headers: authHeaders
  }));
  await expectOk(request.post("/api/index/rebuild", { headers: authHeaders }));
  await expectOk(request.put("/api/workspace/tabs", {
    data: { tabs: [], activePath: null },
    headers: authHeaders
  }));
  await expectOk(request.post("/api/display/blank", { headers: authHeaders }));
  await expectOk(request.post("/api/map/stop", { headers: authHeaders }));
  await expectOk(request.delete("/api/map/reveals", { headers: authHeaders }));
  await expectOk(request.put("/api/map/fog", {
    data: { enabled: false },
    headers: authHeaders
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

function worldTree(page: Page) {
  return page.getByRole("navigation", { name: "World files" });
}

function toolsPanel(page: Page) {
  return page.getByRole("complementary", { name: "DM Tools" });
}

async function gotoWorkspace(page: Page) {
  await page.context().addCookies([
    {
      name: "virtualscreen_access",
      value: "dev",
      domain: "127.0.0.1",
      path: "/"
    }
  ]);
  await page.goto("/");
  const accessCode = page.getByLabel("Access code");
  if ((await accessCode.count()) > 0 && (await accessCode.isVisible())) {
    await accessCode.fill("dev");
    const unlockButton = page.getByRole("button", { name: "Unlock" });
    await expect(unlockButton).toBeEnabled();
    await unlockButton.click();
  }
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
  const response = await request.get(`/api/page?path=${encodeURIComponent(path)}`, {
    headers: authHeaders
  });
  expect(response.ok()).toBeTruthy();
  const page = (await response.json()) as { fields: Record<string, unknown> };
  return page.fields;
}

function statusField(fields: Record<string, unknown>) {
  return fields.Status ?? fields["Core.Status"];
}

async function moveKanbanCard(page: Page, title: string, targetColumn: Locator) {
  const source = page.locator(".folder-kanban-card", { hasText: title });
  const dataTransfer = await page.evaluateHandle(() => new DataTransfer());
  await source.dispatchEvent("dragstart", { dataTransfer });
  await targetColumn.dispatchEvent("drop", { dataTransfer });
  await dataTransfer.dispose();
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

  for (const title of ["Smuggler Scene", "Dock Contact", "Harbor Encounters.csv"]) {
    await moveKanbanCard(page, title, doneColumn);
    await expect(doneColumn).toContainText(title);
  }

  await expect
    .poll(async () => statusField(await pageFields(request, "Board/Smuggler Scene.md")))
    .toBe("Done");
  await expect
    .poll(async () => statusField(await pageFields(request, "Board/Dock Contact.cs")))
    .toBe("Done");
  await expect
    .poll(async () => statusField(await pageFields(request, "Board/Harbor Encounters.csv")))
    .toBe("Done");

  await doneColumn.getByLabel("Card name").fill("New Lead");
  await doneColumn.getByRole("button", { name: "+ Card" }).click();
  await expect(doneColumn).toContainText("New Lead");
  await expect
    .poll(async () => statusField(await pageFields(request, "Board/New Lead.cs")))
    .toBe("Done");

  await doneColumn.getByRole("button", { name: /New Lead/ }).click();
  await expect(page.getByRole("heading", { name: "New Lead" })).toBeVisible();
});
