import { describe, expect, it } from "vitest";

import {
  addDiceHistoryEntry,
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
  it("keeps newest history first and caps at fifty entries", () => {
    const history = Array.from({ length: 55 }).reduce<DiceHistoryEntry[]>(
      (items, _item, index) => addDiceHistoryEntry(items, roll(`1d${index + 1}`, index + 1)),
      []
    );

    expect(history).toHaveLength(50);
    expect(history[0].expression).toBe("1d55");
    expect(history.at(-1)?.expression).toBe("1d6");
  });
});
