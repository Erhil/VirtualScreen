import { describe, expect, it } from "vitest";

import type { HpTrackerRow } from "./api";
import {
  addHpTrackerRow,
  adjustHpTrackerRow,
  clearHpTrackerRows,
  createHpTrackerRow,
  parseHpMaxValue,
  removeHpTrackerRow,
  summarizeHpTrackerRows,
  updateHpTrackerRow,
  validateHpTrackerRows
} from "./hp";

const goblin: HpTrackerRow = {
  id: "row-1",
  name: "Goblin",
  current_hp: 7,
  max_hp: 7,
  status: "",
  notes: ""
};

const wraith: HpTrackerRow = {
  id: "row-2",
  name: "Wraith",
  current_hp: 12,
  max_hp: null,
  status: "",
  notes: ""
};

describe("HP tracker helpers", () => {
  it("creates rows with trimmed names and nullable max HP", () => {
    expect(
      createHpTrackerRow({
        id: "row-3",
        name: "  Bandit  ",
        current_hp: 6,
        max_hp: 11
      })
    ).toEqual({
      id: "row-3",
      name: "Bandit",
      current_hp: 6,
      max_hp: 11,
      status: "",
      notes: ""
    });

    expect(createHpTrackerRow({ id: "row-4", max_hp: 5 })).toEqual({
      id: "row-4",
      name: "",
      current_hp: 5,
      max_hp: 5,
      status: "",
      notes: ""
    });

    expect(createHpTrackerRow({ id: "row-5" })).toEqual({
      id: "row-5",
      name: "",
      current_hp: 0,
      max_hp: null,
      status: "",
      notes: ""
    });
  });

  it("adds, removes, clears, and updates rows immutably", () => {
    const rows = addHpTrackerRow([goblin], wraith);
    const updated = updateHpTrackerRow(rows, "row-1", {
      name: "  Goblin Boss ",
      current_hp: 20,
      max_hp: 12
    });

    expect(rows).toEqual([goblin, wraith]);
    expect(updated).toEqual([
      {
        id: "row-1",
        name: "Goblin Boss",
        current_hp: 20,
        max_hp: 12,
        status: "",
        notes: ""
      },
      wraith
    ]);
    expect(removeHpTrackerRow(rows, "row-1")).toEqual([wraith]);
    expect(clearHpTrackerRows()).toEqual([]);
  });

  it("adjusts HP down and up without applying combat rules", () => {
    expect(adjustHpTrackerRow([goblin], "row-1", -3)[0].current_hp).toBe(4);
    expect(adjustHpTrackerRow([goblin], "row-1", -99)[0].current_hp).toBe(-92);
    expect(adjustHpTrackerRow([goblin], "row-1", 99)[0].current_hp).toBe(106);
    expect(adjustHpTrackerRow([wraith], "row-2", 5)[0].current_hp).toBe(17);
  });

  it("parses blank or null max HP as open-ended", () => {
    expect(parseHpMaxValue("")).toBeNull();
    expect(parseHpMaxValue("   ")).toBeNull();
    expect(parseHpMaxValue(null)).toBeNull();
    expect(parseHpMaxValue(undefined)).toBeNull();
    expect(parseHpMaxValue("24")).toBe(24);
    expect(parseHpMaxValue(31)).toBe(31);
    expect(Number.isNaN(parseHpMaxValue("many"))).toBe(true);
  });

  it("validates required names, ids, numeric HP, and max HP bounds", () => {
    expect(validateHpTrackerRows([goblin, wraith])).toEqual([]);
    expect(
      validateHpTrackerRows([
        { id: "", name: "", current_hp: -10000, max_hp: 0, status: "", notes: "" },
        { id: "row-1", name: "Duplicate", current_hp: 2.5, max_hp: 2, status: "", notes: "" },
        {
          id: "row-1",
          name: "Too Long",
          current_hp: 5,
          max_hp: 4,
          status: "x".repeat(121),
          notes: "x".repeat(501)
        }
      ])
    ).toEqual([
      "Row 1 id is required.",
      "Row 1 name is required.",
      "Row 1 current HP must be a whole number between -9999 and 9999.",
      "Row 1 max HP must be a positive whole number.",
      "Duplicate current HP must be a whole number between -9999 and 9999.",
      "Duplicate row id: row-1.",
      "Too Long status must be 120 characters or fewer.",
      "Too Long notes must be 500 characters or fewer."
    ]);
  });

  it("summarizes total rows and rows at zero HP", () => {
    expect(
      summarizeHpTrackerRows([
        goblin,
        { ...wraith, current_hp: 0 },
        { id: "row-3", name: "Skeleton", current_hp: -2, max_hp: null, status: "", notes: "" }
      ])
    ).toEqual({ count: 3, down: 2 });
  });
});
