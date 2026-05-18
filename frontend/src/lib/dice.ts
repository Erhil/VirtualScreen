import type { DiceRollResponse } from "./api";

export type DiceHistoryEntry = DiceRollResponse & {
  id: string;
};

export const COMMON_DICE_EXPRESSIONS = [
  "1d100",
  "1d20",
  "1d12",
  "1d10",
  "1d8",
  "1d6",
  "1d4",
  "1d2"
] as const;

export const DICE_HISTORY_LIMIT = 50;

export function diceRollSucceeded(roll: DiceRollResponse | null | undefined): roll is DiceRollResponse {
  return Boolean(roll);
}

export function addDiceHistoryEntry(
  history: DiceHistoryEntry[],
  entry: DiceHistoryEntry,
  limit = DICE_HISTORY_LIMIT
): DiceHistoryEntry[] {
  return [entry, ...history].slice(0, limit);
}

export function clearDiceHistory(_history: DiceHistoryEntry[]): DiceHistoryEntry[] {
  return [];
}

export function formatDiceRollDetail(roll: DiceRollResponse): string {
  return roll.detail;
}
