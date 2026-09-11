import { useState } from "react";
import { type Translator } from "../../lang";
import { COMMON_DICE_EXPRESSIONS, type DiceHistoryEntry } from "../../lib/dice";

export type DiceStatus =
  | { status: "idle"; message: string | null }
  | { status: "rolling"; message: string | null }
  | { status: "ready"; message: string | null }
  | { status: "error"; message: string };

export function DiceTool({
  history,
  onClearHistory,
  onRoll,
  status,
  t
}: {
  history: DiceHistoryEntry[];
  onClearHistory: () => void;
  onRoll: (expression: string) => void;
  status: DiceStatus;
  t: Translator;
}) {
  const [expression, setExpression] = useState("");
  const rolling = status.status === "rolling";
  const latest = history[0] ?? null;

  function submitRoll(nextExpression = expression) {
    const trimmed = nextExpression.trim();
    if (!trimmed || rolling) {
      return;
    }
    onRoll(trimmed);
  }

  return (
    <section aria-label={t("dice.title")} className="dice-tool" data-help-context="dice">
      <div className="dice-common" aria-label={t("dice.common")}>
        {COMMON_DICE_EXPRESSIONS.map((diceExpression) => (
          <button
            className="dice-chip"
            disabled={rolling}
            key={diceExpression}
            onClick={() => {
              setExpression(diceExpression);
              submitRoll(diceExpression);
            }}
            title={t("dice.rollLink", { expression: diceExpression })}
            type="button"
          >
            {diceExpression.replace(/^1/, "")}
          </button>
        ))}
      </div>
      <form
        className="dice-roll-form"
        onSubmit={(event) => {
          event.preventDefault();
          submitRoll();
        }}
      >
        <label>
          <span>{t("dice.expression")}</span>
          <input
            aria-label={t("dice.expression")}
            onChange={(event) => setExpression(event.target.value)}
            placeholder={t("dice.expressionPlaceholder")}
            value={expression}
          />
        </label>
        <button disabled={rolling || expression.trim().length === 0} type="submit">
          {rolling ? t("dice.rolling") : t("dice.roll")}
        </button>
      </form>
      {status.status === "error" && (
        <p className="dice-status dice-status-error" role="alert">
          {status.message}
        </p>
      )}
      {latest && (
        <div className="dice-result" aria-label={t("dice.result")}>
          <strong>{latest.total}</strong>
          <span>{latest.detail}</span>
        </div>
      )}
      <div className="dice-history-header">
        <h3>{t("dice.history")}</h3>
        <button disabled={history.length === 0} onClick={onClearHistory} type="button">
          {t("dice.clearHistory")}
        </button>
      </div>
      {history.length === 0 ? (
        <p className="muted">{t("dice.emptyHistory")}</p>
      ) : (
        <ol aria-label={t("dice.history")} className="dice-history">
          {history.map((entry) => (
            <li key={entry.id}>
              <span>{entry.expression}</span>
              <strong>{entry.total}</strong>
              <small>{entry.dice.results.join(", ")}</small>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
