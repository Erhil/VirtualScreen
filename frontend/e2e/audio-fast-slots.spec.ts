import { expect, test } from "@playwright/test";
import { useE2eWorld, worldTree, openTreeFile, toolsPanel, openToolSection, mapTool, audioTool, runActiveScript, confirmDmsTrustIfVisible } from "./world-browser-helpers";

useE2eWorld();

test("audio tool searches music and plays independent buses @smoke", async ({ page }) => {
  await page.goto("/");

  const audio = await audioTool(page);
  await audio.getByRole("searchbox", { name: "Music Search" }).fill("tavern");
  await expect(audio.getByText(".music/")).toHaveCount(0);
  await expect(audio.getByText(/Ambient \/ Tavern/)).toHaveCount(0);
  const ambientBus = audio.getByRole("region", { name: "Ambient Bus" });
  await expect(ambientBus.getByRole("button", { name: /^Tavern/ })).toHaveAttribute(
    "aria-expanded",
    "true"
  );
  const volume = ambientBus.locator(".audio-volume").first();
  const volumeLabelBox = await volume.getByText("Volume").boundingBox();
  const volumeSliderBox = await volume.getByRole("slider").boundingBox();
  expect(Math.abs((volumeLabelBox?.y ?? 0) - (volumeSliderBox?.y ?? 0))).toBeLessThan(8);
  const trackListMetrics = await ambientBus.locator(".audio-track-list").first().evaluate((element) => ({
    clientHeight: element.clientHeight,
    scrollHeight: element.scrollHeight
  }));
  expect(trackListMetrics.scrollHeight).toBeGreaterThan(trackListMetrics.clientHeight);
  await ambientBus
    .getByRole("button", { name: "Load Ambient folder playlist Tavern into queue" })
    .click();
  await expect(ambientBus.locator(".audio-queue-line").getByText("Tavern 1/13")).toBeVisible();
  await expect(ambientBus.getByRole("button", { name: "Pause" })).toBeVisible();
  await ambientBus.getByRole("button", { name: "Next" }).click();
  await expect(ambientBus.locator(".audio-queue-line").getByText("Tavern 2/13")).toBeVisible();
  await ambientBus.getByRole("button", { name: "Prev" }).click();
  await expect(ambientBus.locator(".audio-queue-line").getByText("Tavern 1/13")).toBeVisible();
  await audio.getByRole("button", { name: "tavern-crowd", exact: true }).click();
  await expect(ambientBus.locator(".audio-bus-heading").getByText("tavern-crowd")).toBeVisible();
  await ambientBus.getByRole("button", { name: "Play", exact: true }).click();
  await expect(ambientBus.getByRole("button", { name: "Pause" })).toBeVisible();
  const ambientPlayer = page.locator('audio[aria-label="Ambient audio"]');
  await expect(ambientPlayer).toHaveCount(1);
  await expect(audio.locator('audio[aria-label="Ambient audio"]')).toHaveCount(0);
  const audioHeader = toolsPanel(page).getByRole("button", { name: /^Audio/ });
  await audioHeader.click();
  await expect(audioHeader).toHaveAttribute("aria-expanded", "false");
  await expect(audioHeader).toContainText("1 playing");
  await expect(ambientPlayer).toHaveCount(1);
  await audioHeader.click();
  await expect(audioHeader).toHaveAttribute("aria-expanded", "true");
  await expect(ambientBus.getByRole("button", { name: "Pause" })).toBeVisible();

  await audio.getByRole("searchbox", { name: "Music Search" }).fill("bard");
  await audio.getByRole("button", { name: /bard-song/ }).click();
  const musicBus = audio.getByRole("region", { name: "Music Bus" });
  await musicBus.getByRole("button", { name: "Play", exact: true }).click();
  await musicBus.getByRole("button", { name: "Fade Out" }).click();
  await expect(musicBus.getByRole("button", { name: "Play" })).toBeVisible({ timeout: 4000 });
  await expect(ambientBus.getByRole("button", { name: "Pause" })).toBeVisible();
  await musicBus.getByRole("button", { name: "Fade In" }).click();
  await expect(musicBus.getByRole("button", { name: "Pause" })).toBeVisible();

  await audio.getByRole("searchbox", { name: "Music Search" }).fill("glass");
  await audio.getByRole("button", { name: /broken-glass/ }).click();
  const effectBus = audio.getByRole("region", { name: "Effect Bus" });
  await effectBus.getByRole("button", { name: "Play", exact: true }).click();
  await effectBus.getByRole("button", { name: "Stop" }).click();

  await expect(ambientBus.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(musicBus.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(effectBus.getByText("Empty")).toBeVisible();

  await audio.getByRole("button", { name: "Stop All Audio" }).click();
  await expect(ambientBus.getByText("Empty")).toBeVisible();
  await expect(musicBus.getByText("Empty")).toBeVisible();
});

test("saved audio playlists persist and play through the existing queue @smoke", async ({ page }) => {
  await page.goto("/");

  const audio = await audioTool(page);
  const saved = audio.getByRole("region", { name: "Saved Playlists" });
  await saved.getByLabel("Saved playlist name").fill("Battle Mix");
  await saved.locator(".audio-saved-create-row").getByLabel("Bus").selectOption("ambient");
  await saved.getByRole("button", { name: "New" }).click();

  let playlist = saved.getByRole("region", { name: "Saved playlist Battle Mix" });
  await expect(playlist).toBeVisible();
  await playlist.getByLabel("Track path for Battle Mix").fill(".music/ambient/Tavern/tavern-crowd.mp3");
  await playlist.getByRole("button", { name: "+ Track" }).click();
  await playlist.getByLabel("Track path for Battle Mix").fill(".music/music/Bard/bard-song.ogg");
  await playlist.getByRole("button", { name: "+ Track" }).click();
  await playlist.getByLabel("Track path for Battle Mix").fill(".music/ambient/missing.wav");
  await playlist.getByRole("button", { name: "+ Track" }).click();
  await expect(playlist.getByText("tavern-crowd")).toBeVisible();
  await expect(playlist.getByText("bard-song")).toBeVisible();
  await expect(playlist.getByText("Missing: .music/ambient/missing.wav")).toBeVisible();

  await playlist.getByLabel("Rename Battle Mix").fill("Storm Set");
  await playlist.getByRole("button", { name: "Rename" }).click();
  playlist = saved.getByRole("region", { name: "Saved playlist Storm Set" });
  await expect(playlist).toBeVisible();
  await playlist.getByRole("button", { name: "Move .music/music/Bard/bard-song.ogg up" }).click();
  await playlist.getByRole("button", { name: "Load Saved Playlist" }).click();

  const ambientBus = audio.getByRole("region", { name: "Ambient Bus" });
  await expect(ambientBus.locator(".audio-queue-line").getByText("Storm Set 1/2")).toBeVisible();
  await expect(ambientBus.locator(".audio-bus-heading").getByText("bard-song")).toBeVisible();
  await ambientBus.getByRole("button", { name: "Next" }).click();
  await expect(ambientBus.locator(".audio-queue-line").getByText("Storm Set 2/2")).toBeVisible();
  await expect(ambientBus.locator(".audio-bus-heading").getByText("tavern-crowd")).toBeVisible();
  await ambientBus.getByRole("button", { name: "Prev" }).click();
  await expect(ambientBus.locator(".audio-bus-heading").getByText("bard-song")).toBeVisible();

  await page.reload();
  const reloadedAudio = await audioTool(page);
  const reloadedSaved = reloadedAudio.getByRole("region", { name: "Saved Playlists" });
  const reloadedPlaylist = reloadedSaved.getByRole("region", { name: "Saved playlist Storm Set" });
  await expect(reloadedPlaylist).toBeVisible();
  await expect(reloadedPlaylist.getByText("Missing: .music/ambient/missing.wav")).toBeVisible();

  await reloadedPlaylist.getByRole("button", { name: "Delete" }).click();
  await page.reload();
  const afterDeleteAudio = await audioTool(page);
  await expect(
    afterDeleteAudio.getByRole("region", { name: "Saved playlist Storm Set" })
  ).toHaveCount(0);
});

test("fast slots can open files from click and hotkey", async ({ page }) => {
  await page.goto("/");

  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  const actionsHeader = toolsPanel(page).getByRole("button", { name: /^Actions/ });
  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByLabel("Label").fill("Home");
  await actions.getByRole("textbox", { name: "Fast slot path" }).fill("README.md");
  await actions.getByRole("button", { name: "Save Slot" }).click();
  await expect(actionsHeader).toContainText("1 slot");

  await page.getByRole("button", { name: "Close README.md" }).click();
  await expect(page.getByRole("heading", { name: "Select a File" })).toBeVisible();
  await page.getByRole("button", { name: /Fast slot 1: Home/ }).click();
  await expect(page.getByRole("tab", { name: /Sample World Guide/ })).toBeVisible();

  await page.keyboard.press("Alt+1");
  await expect(page.getByRole("heading", { name: "Sample World Guide" })).toBeVisible();
});

test("fast screen slots without paths use the current active file", async ({ context, page }) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");
  await expect(page.getByText("Select a File")).toBeVisible();

  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByLabel("Action").selectOption("screen_fullscreen");
  await actions.getByLabel("Label").fill("Show current");
  await actions.getByRole("button", { name: "Save Slot" }).click();

  await openTreeFile(page, /Captain Ilyra Captain Ilyra\.md/, "NPCs");
  await page.getByRole("button", { name: /Fast slot 1: Show current/ }).click();
  await expect(screen.getByRole("heading", { name: "Captain Ilyra" })).toBeVisible();

  await openToolSection(page, "Actions");
  const popupActions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await popupActions.getByLabel("Action").selectOption("screen_popup");
  await popupActions.getByLabel("Label").fill("Popup current");
  await popupActions.getByLabel("Popup preset").selectOption("letter");
  await popupActions.getByRole("button", { name: "Save Slot" }).click();
  await worldTree(page).getByRole("button", { name: /Sample World Guide/ }).click();
  await page.getByRole("button", { name: /Fast slot 1: Popup current/ }).click();
  const popup = screen.getByRole("region", { name: "Popup Sample World Guide" });
  await expect(popup).toBeVisible();
  await expect(popup).toHaveClass(/screen-popup-letter/);
});

test("open file fast slot requires an explicit file path", async ({ page }) => {
  await page.goto("/");

  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByLabel("Action").selectOption("open_file");
  await expect(actions.getByLabel("Action")).not.toContainText("Scenario");
  await expect(actions.getByLabel("Action")).not.toContainText("Search query");
  await expect(actions.getByLabel("Action")).toContainText("Run script");
  await actions.getByRole("textbox", { name: "Fast slot path" }).fill("");
  await actions.getByRole("button", { name: "Save Slot" }).click();

  await expect(actions.getByText("Choose a file path for Open file.")).toBeVisible();
});

test("audio fast slot starts the selected track on the Effect bus", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByText("Select a File")).toBeVisible();

  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByLabel("Action").selectOption("audio_track");
  await actions.getByLabel("Label").fill("Crowd effect");
  await actions.getByRole("textbox", { name: "Fast slot path" }).fill(".music/ambient/Tavern/tavern-crowd.mp3");
  await actions.getByRole("button", { name: "Save Slot" }).click();

  const slotButton = page.getByRole("button", { name: /Fast slot 1: Crowd effect/ });
  await expect(slotButton).toBeEnabled();
  await page.keyboard.press("Alt+1");
  const audio = await audioTool(page);
  const ambientBus = audio.getByRole("region", { name: "Ambient Bus" });
  const effectBus = audio.getByRole("region", { name: "Effect Bus" });

  await expect(effectBus.locator(".audio-bus-heading").getByText("tavern-crowd")).toBeVisible();
  await expect(effectBus.getByRole("button", { name: "Pause" })).toBeVisible();
  await expect(ambientBus.getByText("Empty")).toBeVisible();
});

test("script fast slot runs a saved DMS file", async ({ page }) => {
  await page.goto("/");

  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByLabel("Action").selectOption("script_run");
  await actions.getByLabel("Label").fill("Core script");
  await actions.getByRole("textbox", { name: "Fast slot path" }).fill("Scripts/core_commands.dms");
  await actions.getByRole("button", { name: "Save Slot" }).click();

  await expect(toolsPanel(page).getByRole("button", { name: /^Actions/ })).toContainText("1 slot");
  const slotButton = page.getByRole("button", { name: /Fast slot 1: Core script/ });
  await expect(slotButton).toBeEnabled();
  await slotButton.click();
  await confirmDmsTrustIfVisible(page, "Scripts/core_commands.dms");

  await expect(page.getByRole("heading", { name: "Core Commands" })).toBeVisible();
  await expect(toolsPanel(page).getByRole("button", { name: /^Scripts success/ })).toBeVisible();
});

test("map preset fast slot and DMS command present saved maps", async ({ context, page }) => {
  const screen = await context.newPage();
  await screen.goto("/screen");
  await page.goto("/");

  await openTreeFile(page, /sample-map/, "Media");
  const map = await mapTool(page);
  await map.getByRole("button", { name: "Use Active Image" }).click();
  await expect(map.locator(".map-canvas-dm img")).toBeVisible();
  await map.getByRole("tab", { name: "Setup" }).click();
  await map.getByLabel("Preset name").fill("Session setup");
  await map.getByRole("button", { name: "Save Preset" }).click();
  await expect(map.getByRole("button", { name: "Load Session setup" })).toBeVisible();

  await openToolSection(page, "Actions");
  const actions = toolsPanel(page).getByRole("region", { name: "Fast Slot Configuration" });
  await actions.getByLabel("Action").selectOption("map_preset");
  await actions.getByLabel("Label").fill("Show map");
  await actions.getByLabel("Map preset", { exact: true }).selectOption({ label: "Session setup" });
  await actions.getByLabel("Present map preset").setChecked(true);
  await actions.getByRole("button", { name: "Save Slot" }).click();

  await page.getByRole("button", { name: /Fast slot 1: Show map/ }).click();
  await expect(screen.locator(".screen-map img")).toBeVisible();

  const mapAfterSlot = await mapTool(page);
  await mapAfterSlot.getByRole("button", { name: "Stop Map" }).click();
  await expect(screen.locator(".screen-map")).toBeHidden();
  await openTreeFile(page, /map_preset_demo\.dms/, "Scripts");
  await runActiveScript(page);

  await expect(screen.locator(".screen-map img")).toBeVisible();
  await expect(screen.locator(".map-canvas-fog-player")).toBeVisible();
});
