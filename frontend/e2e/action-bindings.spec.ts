import { expect, test } from "@playwright/test";
import type { Locator, Page } from "@playwright/test";
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
  mkdirSync(resolve(e2eWorld, ".music", "effects"), { recursive: true });
  writeFileSync(resolve(e2eWorld, ".music", "effects", "broken-glass.wav"), Buffer.from("UklGRgAAAABXQVZF", "base64"));
  mkdirSync(resolve(e2eWorld, "Scripts"), { recursive: true });
  writeFileSync(resolve(e2eWorld, "Scripts", "hello_world.dms"), "render_md('# Hello')\n", "utf-8");
}

test.beforeEach(async ({ request }) => {
  resetE2eWorld();
  await request.post("/api/worlds/open", {
    data: { id: "E2E World" }
  });
  await request.post("/api/index/rebuild");
  await request.put("/api/workspace/tabs", {
    data: { tabs: [], activePath: null }
  });
  await request.put("/api/workspace/layout", {
    data: {
      layout: {
        mode: "single",
        activePaneId: "main",
        panes: [
          { id: "main", activePath: null },
          { id: "secondary", activePath: null }
        ],
        splitRatio: 0.5
      }
    }
  });
  await request.put("/api/fast-slots", {
    data: { slots: [] }
  });
  await request.post("/api/display/blank");
  const snapshotsResponse = await request.get("/api/table-snapshots");
  if (snapshotsResponse.ok()) {
    const snapshots = (await snapshotsResponse.json()) as Array<{ id: string }>;
    for (const snapshot of snapshots) {
      await request.delete(`/api/table-snapshots/${encodeURIComponent(snapshot.id)}`);
    }
  }
});

function worldTree(page: Page) {
  return page.getByRole("navigation", { name: "World files" });
}

function toolsPanel(page: Page) {
  return page.getByRole("complementary", { name: "DM Tools" });
}

async function openToolSection(page: Page, name: "Actions" | "Screen") {
  const button = toolsPanel(page).getByRole("button", { name: new RegExp(`^${name}`) });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    if ((await button.getAttribute("aria-expanded")) === "true") {
      return;
    }
    await button.click();
    await page.waitForTimeout(50);
  }
  await expect(button).toHaveAttribute("aria-expanded", "true");
}

async function actionsTool(page: Page) {
  await openToolSection(page, "Actions");
  return toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
}

async function actionsTab(actions: Locator, name: "Slots" | "State" | "Keys" | "MIDI") {
  await actions.getByRole("tab", { name }).click();
}

async function tableStateSnapshots(actions: Locator) {
  await actionsTab(actions, "State");
  return actions.getByRole("region", { name: "Table State Snapshots" });
}

async function keyboardBindings(actions: Locator) {
  await actionsTab(actions, "Keys");
  return actions.getByRole("region", { name: "Keyboard Bindings" });
}

async function midiBindings(actions: Locator) {
  await actionsTab(actions, "MIDI");
  return actions.getByRole("region", { name: "MIDI Bindings" });
}

async function mockMidi(page: Page) {
  await page.addInitScript(() => {
    class FakeMidiInput {
      id = "dm-pad";
      name = "DM Pad";
      onmidimessage: ((event: { data: Uint8Array }) => void) | null = null;
    }

    const input = new FakeMidiInput();
    (window as unknown as { __virtualscreenMidiInput?: FakeMidiInput }).__virtualscreenMidiInput =
      input;
    (window as unknown as { __virtualscreenSendMidi?: (data: number[]) => void }).__virtualscreenSendMidi =
      (data: number[]) => {
        input.onmidimessage?.({ data: new Uint8Array(data) });
      };
    Object.defineProperty(navigator, "requestMIDIAccess", {
      configurable: true,
      value: async () => ({
        inputs: {
          values: function* values() {
            yield input;
          }
        }
      })
    });
  });
}

async function sendMidi(page: Page, data: number[]) {
  await page.evaluate((message) => {
    (window as unknown as { __virtualscreenSendMidi?: (data: number[]) => void })
      .__virtualscreenSendMidi?.(message);
  }, data);
}

async function saveFastSlot(actions: Locator, label: string, path: string) {
  await actions.getByLabel("Action").selectOption("open_file");
  await actions.getByLabel("Label").fill(label);
  await actions.getByRole("textbox", { name: "Fast slot path" }).fill(path);
  await actions.getByRole("button", { name: "Save Slot" }).click();
}

test.describe("Action Bindings V1", () => {
  test("Actions exposes compact keyboard binding controls and validates shortcuts @smoke", async ({ page }) => {
    await page.goto("/");
    const actions = await actionsTool(page);
    const bindings = await keyboardBindings(actions);

    await expect(bindings).toBeVisible();
    await expect(bindings.getByRole("heading", { name: "Keyboard Bindings" })).toBeVisible();
    await expect(bindings.getByLabel("Keyboard binding title")).toBeVisible();
    await expect(bindings.getByLabel("Shortcut")).toBeVisible();
    await expect(bindings.getByLabel("Keyboard binding type")).toContainText("Restore table state");

    await bindings.getByLabel("Keyboard binding title").fill("Reload");
    await bindings.getByLabel("Shortcut").fill("Ctrl+R");
    await bindings.getByRole("button", { name: "Save Binding" }).click();
    await expect(bindings.getByText("Shortcut is reserved by the browser.")).toBeVisible();

    await bindings.getByLabel("Shortcut").fill("Ctrl+Shift+H");
    await bindings.getByRole("textbox", { name: "Keyboard binding target" }).fill("README.md");
    await bindings.getByRole("button", { name: "Save Binding" }).click();
    await expect(bindings.getByText("Saved Reload")).toBeVisible();

    await bindings.getByLabel("Keyboard binding title").fill("Duplicate");
    await bindings.getByLabel("Shortcut").fill("Ctrl+Shift+H");
    await bindings.getByRole("button", { name: "Save Binding" }).click();
    await expect(bindings.getByText("Shortcut is already used.")).toBeVisible();
  });

  test("fixed Alt+1 fast slot still opens files", async ({ page }) => {
    await page.goto("/");
    const actions = await actionsTool(page);

    await saveFastSlot(actions, "Home", "README.md");
    await expect(page.getByRole("button", { name: /Fast slot 1: Home/ })).toBeEnabled();

    await page.keyboard.press("Alt+1");
    await expect(page.getByRole("tab", { name: /README\.md|Sample World Guide/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
  });

  test("binding can restore a saved table state snapshot @smoke", async ({ context, page }) => {
    await page.goto("/");
    await page.request.post("/api/map/stop");
    await page.request.post("/api/display/blank");
    const screen = await context.newPage();
    await screen.goto("/screen");

    await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
    await openToolSection(page, "Screen");
    const fullscreenSet = page.waitForResponse(
      (response) =>
        response.url().includes("/api/display/fullscreen") &&
        response.request().method() === "PUT"
    );
    await toolsPanel(page)
      .getByRole("region", { name: "Screen Control" })
      .getByRole("button", { name: "Show Active Fullscreen" })
      .click();
    await fullscreenSet;
    await screen.reload();
    await expect(screen.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();

    const actions = await actionsTool(page);
    const tableState = await tableStateSnapshots(actions);
    const snapshotName = `Hotkey state ${Date.now()}`;
    await tableState.getByLabel("Title").fill(snapshotName);
    await tableState.getByRole("button", { name: "Save Current" }).click();
    await expect(actions.getByText(`Saved ${snapshotName}`)).toBeVisible();

    await openToolSection(page, "Screen");
    await toolsPanel(page)
      .getByRole("region", { name: "Screen Control" })
      .getByRole("button", { name: "Blank Screen" })
      .click();
    await expect(screen.getByRole("heading", { name: "Sample World Guide" })).toHaveCount(0);

    const actionsAfterBlank = await actionsTool(page);
    const bindings = await keyboardBindings(actionsAfterBlank);
    await bindings.getByLabel("Keyboard binding title").fill("Restore tavern");
    await bindings.getByLabel("Shortcut").fill("Ctrl+Shift+Y");
    await bindings.getByLabel("Keyboard binding type").selectOption("table_snapshot_restore");
    await bindings.getByLabel("Table state").selectOption({ label: snapshotName });
    await bindings.getByRole("button", { name: "Save Binding" }).click();

    const snapshotRestored = page.waitForResponse(
      (response) =>
        response.url().includes("/api/table-snapshots/") &&
        response.url().includes("/restore") &&
        response.request().method() === "POST"
    );
    await page.keyboard.press("Control+Shift+Y");
    await snapshotRestored;
    await screen.reload();
    await expect(screen.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
  });

  test("MIDI binding can learn a note and open a file @smoke", async ({ page }) => {
    await mockMidi(page);
    await page.goto("/");
    const actions = await actionsTool(page);
    const midi = await midiBindings(actions);

    await expect(midi).toBeVisible();
    await midi.getByRole("button", { name: "Connect MIDI" }).click();
    await expect(midi.getByText("Connected to DM Pad.")).toBeVisible();

    await midi.getByRole("button", { name: "Learn Control" }).click();
    await expect(midi.getByText("Listening for a MIDI note or control...")).toBeVisible();
    await sendMidi(page, [0x90, 36, 100]);
    await expect(midi.getByLabel("MIDI learned control")).toHaveValue("Note 36 ch 1");

    await midi.getByLabel("MIDI binding title").fill("Open home");
    await midi.getByRole("textbox", { name: "MIDI binding target" }).fill("README.md");
    await midi.getByRole("button", { name: "Save MIDI Binding" }).click();
    await expect(midi.getByText("Saved Open home")).toBeVisible();

    await sendMidi(page, [0x90, 36, 100]);
    await expect(page.getByRole("tab", { name: /README\.md|Sample World Guide/ })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
  });

  test("MIDI binding can restore a table state snapshot", async ({ context, page }) => {
    await mockMidi(page);
    await page.goto("/");
    await page.request.post("/api/map/stop");
    await page.request.post("/api/display/blank");
    const screen = await context.newPage();
    await screen.goto("/screen");

    await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
    await openToolSection(page, "Screen");
    await toolsPanel(page)
      .getByRole("region", { name: "Screen Control" })
      .getByRole("button", { name: "Show Active Fullscreen" })
      .click();
    await screen.reload();
    await expect(screen.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();

    const actions = await actionsTool(page);
    const tableState = await tableStateSnapshots(actions);
    const snapshotName = `MIDI state ${Date.now()}`;
    await tableState.getByLabel("Title").fill(snapshotName);
    await tableState.getByRole("button", { name: "Save Current" }).click();
    await expect(actions.getByText(`Saved ${snapshotName}`)).toBeVisible();

    await openToolSection(page, "Screen");
    await toolsPanel(page)
      .getByRole("region", { name: "Screen Control" })
      .getByRole("button", { name: "Blank Screen" })
      .click();
    await expect(screen.getByRole("heading", { name: "Sample World Guide" })).toHaveCount(0);

    const actionsAfterBlank = await actionsTool(page);
    const midi = await midiBindings(actionsAfterBlank);
    await midi.getByRole("button", { name: "Connect MIDI" }).click();
    await midi.getByRole("button", { name: "Learn Control" }).click();
    await expect(midi.getByText("Listening for a MIDI note or control...")).toBeVisible();
    await sendMidi(page, [0x90, 37, 100]);
    await midi.getByLabel("MIDI binding title").fill("Restore screen");
    await midi.getByLabel("MIDI binding type").selectOption("table_snapshot_restore");
    await midi.getByLabel("MIDI binding table state").selectOption({ label: snapshotName });
    await midi.getByRole("button", { name: "Save MIDI Binding" }).click();

    const snapshotRestored = page.waitForResponse(
      (response) =>
        response.url().includes("/api/table-snapshots/") &&
        response.url().includes("/restore") &&
        response.request().method() === "POST"
    );
    await sendMidi(page, [0x90, 37, 100]);
    await snapshotRestored;
    await screen.reload();
    await expect(screen.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
  });
});
