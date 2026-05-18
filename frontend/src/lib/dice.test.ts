import { describe, expect, it } from "vitest";

import {
  COMMON_DICE_EXPRESSIONS,
  addDiceHistoryEntry,
  clearDiceHistory,
  diceRollSucceeded,
  formatDiceRollDetail,
  type DiceHistoryEntry
} from "./dice";

const roll = (expression: string, total: number): DiceHistoryEntry => ({
  id: `${expression}-${total}`,
  expression,
  dice: { count: 1, sides: total || 1, results: [total] },
  modifier: 0,
  total,
  detail: `${expression}: ${total} = ${total}`,
  rolled_at: "2026-05-18T12:00:00Z"
});

describe("dice helpers", () => {
  it("uses the requested common dice order", () => {
    expect(COMMON_DICE_EXPRESSIONS).toEqual([
      "1d100",
      "1d20",
      "1d12",
      "1d10",
      "1d8",
      "1d6",
      "1d4",
      "1d2"
    ]);
  });

  it("keeps newest history first and caps at fifty entries", () => {
    const history = Array.from({ length: 55 }).reduce<DiceHistoryEntry[]>(
      (items, _item, index) => addDiceHistoryEntry(items, roll(`1d${index + 1}`, index + 1)),
      []
    );

    expect(history).toHaveLength(50);
    expect(history[0].expression).toBe("1d55");
    expect(history.at(-1)?.expression).toBe("1d6");
  });

  it("clears local history", () => {
    expect(clearDiceHistory([roll("1d20", 10)])).toEqual([]);
  });

  it("formats individual results and sum", () => {
    expect(
      formatDiceRollDetail({
        expression: "2d6+3",
        dice: { count: 2, sides: 6, results: [2, 5] },
        modifier: 3,
        total: 10,
        detail: "2d6: 2 + 5 + 3 = 10",
        rolled_at: "2026-05-18T12:00:00Z"
      })
    ).toBe("2d6: 2 + 5 + 3 = 10");
  });

  it("only successful rolls are history candidates", () => {
    expect(diceRollSucceeded(roll("1d20", 13))).toBe(true);
    expect(diceRollSucceeded(null)).toBe(false);
  });
});
