import { describe, expect, it } from "vitest";

import {
  buildFastSlotAction,
  clearFastSlot,
  dispatchableHotkeyPosition,
  fastSlotSummary,
  visibleFastSlots,
  replaceFastSlot,
  sortFastSlots
} from "./fastSlots";
import type { FastSlot } from "./api";

const slot: FastSlot = {
  id: "slot-1",
  position: 1,
  label: "Home",
  icon: null,
  action: { kind: "open_file", path: "README.md" }
};

describe("fast slot helpers", () => {
  it("sorts, replaces, and clears slots by position", () => {
    const slots = [
      { ...slot, position: 3, id: "slot-3" },
      { ...slot, position: 1, id: "slot-1" }
    ];

    expect(sortFastSlots(slots).map((item) => item.position)).toEqual([1, 3]);
    expect(replaceFastSlot(slots, { ...slot, position: 3, label: "Updated" })).toEqual([
      { ...slot, position: 1, id: "slot-1" },
      { ...slot, position: 3, label: "Updated" }
    ]);
    expect(clearFastSlot(slots, 1).map((item) => item.position)).toEqual([3]);
  });

  it("maps Alt+1 through Alt+0 to slots and ignores typing fields", () => {
    expect(dispatchableHotkeyPosition({ altKey: true, key: "1" })).toBe(1);
    expect(dispatchableHotkeyPosition({ altKey: true, key: "0" })).toBe(10);
    expect(dispatchableHotkeyPosition({ altKey: false, key: "1" })).toBeNull();
    expect(
      dispatchableHotkeyPosition({
        altKey: true,
        key: "1",
        targetTagName: "textarea"
      })
    ).toBeNull();
  });

  it("summarizes slot actions compactly", () => {
    expect(fastSlotSummary(slot)).toBe("Open README.md");
    expect(
      fastSlotSummary({
        ...slot,
        action: { kind: "screen_fullscreen" }
      })
    ).toBe("Screen current");
    expect(
      fastSlotSummary({
        ...slot,
        action: { kind: "audio_track", path: ".music/effects/glass.mp3", bus: "effect", play: true }
      })
    ).toBe("Effect glass.mp3");
    expect(
      fastSlotSummary({ ...slot, action: { kind: "script_run", path: "Scripts/hello.dms" } })
    ).toBe("Run hello.dms");
    expect(
      fastSlotSummary({
        ...slot,
        action: { kind: "map_preset", preset_id: "city-gate", present: true }
      })
    ).toBe("Map preset city-gate");
    expect(
      fastSlotSummary({
        ...slot,
        action: { kind: "scenario", scenario_id: "create-npc", inputs: {} }
      })
    ).toBe("Legacy scenario create-npc");
  });

  it("builds validated actions for slot creation", () => {
    expect(buildFastSlotAction({ kind: "open_file", path: "" })).toEqual({
      error: "Choose a file path for Open file."
    });
    expect(buildFastSlotAction({ kind: "open_file", path: "README.md" })).toEqual({
      action: { kind: "open_file", path: "README.md" }
    });
    expect(buildFastSlotAction({ kind: "screen_fullscreen", path: "" })).toEqual({
      action: { kind: "screen_fullscreen" }
    });
    expect(buildFastSlotAction({ kind: "screen_popup", path: "README.md", preset: "letter" })).toEqual({
      action: { kind: "screen_popup", path: "README.md", preset: "letter" }
    });
    expect(buildFastSlotAction({ kind: "audio_track", path: ".music/effects/glass.wav" })).toEqual({
      action: {
        kind: "audio_track",
        path: ".music/effects/glass.wav",
        bus: "effect",
        play: true
      }
    });
    expect(buildFastSlotAction({ kind: "script_run", path: "Scripts/hello.dms" })).toEqual({
      action: { kind: "script_run", path: "Scripts/hello.dms" }
    });
    expect(
      buildFastSlotAction({ kind: "map_preset", presetId: " city-gate ", present: true })
    ).toEqual({
      action: { kind: "map_preset", preset_id: "city-gate", present: true }
    });
    expect(buildFastSlotAction({ kind: "map_preset", presetId: " " })).toEqual({
      error: "Choose a map preset id."
    });
    expect(buildFastSlotAction({ kind: "scenario" as never, scenarioId: "create-npc" })).toEqual({
      error: "Scenario slots are deprecated. Use Run script."
    });
  });

  it("keeps valid map preset slots and ignores invalid saved legacy shapes", () => {
    const validMapSlot: FastSlot = {
      ...slot,
      id: "slot-2",
      position: 2,
      action: { kind: "map_preset", preset_id: "city-gate", present: true }
    };
    const invalidMapSlot = {
      ...slot,
      id: "slot-3",
      position: 3,
      action: { kind: "map_preset", present: true }
    } as unknown as FastSlot;

    expect(visibleFastSlots([invalidMapSlot, validMapSlot, slot])).toEqual([
      slot,
      validMapSlot
    ]);
  });
});
