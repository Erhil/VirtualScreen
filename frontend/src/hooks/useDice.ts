import { useState } from "react";

import { type DiceStatus } from "../components/tools/DiceTool";
import { rollDice, type DiceRollResponse } from "../lib/api";
import { addDiceHistoryEntry, type DiceHistoryEntry } from "../lib/dice";
import { type Translator } from "../lang";

export type UseDiceOptions = {
  t: Translator;
  onRoll: () => void;
};

// Dice rolls: the history and the in-flight status of the current roll.
export function useDice({ t, onRoll }: UseDiceOptions) {
  const [diceHistory, setDiceHistory] = useState<DiceHistoryEntry[]>([]);
  const [diceStatus, setDiceStatus] = useState<DiceStatus>({ status: "idle", message: null });

  function handleDiceClearHistory() {
    setDiceHistory([]);
    setDiceStatus({ status: "idle", message: null });
  }

  function handleDiceRoll(expression: string) {
    const trimmed = expression.trim();
    if (!trimmed) {
      return;
    }
    onRoll();
    setDiceStatus({ status: "rolling", message: null });
    rollDice(trimmed)
      .then((roll: DiceRollResponse) => {
        const entry: DiceHistoryEntry = {
          ...roll,
          id: `${roll.rolled_at}-${roll.expression}-${Math.random().toString(36).slice(2)}`
        };
        setDiceHistory((history) => addDiceHistoryEntry(history, entry));
        setDiceStatus({ status: "ready", message: null });
      })
      .catch((error: unknown) => {
        setDiceStatus({
          status: "error",
          message: error instanceof Error ? error.message : t("dice.error")
        });
      });
  }

  return { diceHistory, diceStatus, handleDiceRoll, handleDiceClearHistory };
}
