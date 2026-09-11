import { useState } from "react";
import { type Translator } from "../../lang";
import { type HpTrackerRow } from "../../lib/api";
import { parseHpMaxValue } from "../../lib/hp";

export type HpToolStatus =
  | { status: "idle"; message: string | null }
  | { status: "loading"; message: string | null }
  | { status: "saving"; message: string | null }
  | { status: "saved"; message: string }
  | { status: "error"; message: string };

export function HpTool({
  onAdd,
  onAdjust,
  onClear,
  onPersist,
  onRemove,
  onUpdate,
  rows,
  status,
  t
}: {
  onAdd: () => void;
  onAdjust: (rowId: string, amount: number) => void;
  onClear: () => void;
  onPersist: () => void;
  onRemove: (rowId: string) => void;
  onUpdate: (rowId: string, updates: Partial<Omit<HpTrackerRow, "id">>) => void;
  rows: HpTrackerRow[];
  status: HpToolStatus;
  t: Translator;
}) {
  const [confirmClear, setConfirmClear] = useState(false);
  const disabled = status.status === "loading" || status.status === "saving";

  return (
    <section aria-label={t("hp.title")} className="hp-tool" data-help-context="hp">
      <div className="hp-tool-actions">
        <button disabled={disabled} onClick={onAdd} type="button">
          {t("hp.add")}
        </button>
        <button disabled={disabled || rows.length === 0} onClick={onPersist} type="button">
          {status.status === "saving" ? t("app.saving") : t("hp.save")}
        </button>
        <button
          disabled={disabled || rows.length === 0}
          onClick={() => {
            if (confirmClear) {
              onClear();
              setConfirmClear(false);
              return;
            }
            setConfirmClear(true);
          }}
          type="button"
        >
          {confirmClear ? t("hp.confirmClear") : t("hp.clear")}
        </button>
      </div>
      {rows.length === 0 ? (
        <p className="tool-note">{t("hp.empty")}</p>
      ) : (
        <div className="hp-rows">
          {rows.map((row) => (
            <article className="hp-row" key={row.id}>
              <div className="hp-row-main">
                <input
                  aria-label={`Name for ${row.name || "HP row"}`}
                  disabled={disabled}
                  onChange={(event) => onUpdate(row.id, { name: event.target.value })}
                  placeholder={t("hp.name")}
                  value={row.name}
                />
                <input
                  aria-label={`Current HP for ${row.name || "HP row"}`}
                  disabled={disabled}
                  onChange={(event) =>
                    onUpdate(row.id, { current_hp: Number(event.target.value) })
                  }
                  type="number"
                  value={row.current_hp}
                />
                <span className="hp-separator">/</span>
                <input
                  aria-label={`Max HP for ${row.name || "HP row"}`}
                  disabled={disabled}
                  onChange={(event) =>
                    onUpdate(row.id, { max_hp: parseHpMaxValue(event.target.value) })
                  }
                  placeholder={t("hp.max")}
                  type="number"
                  value={row.max_hp ?? ""}
                />
                <button disabled={disabled} onClick={() => onRemove(row.id)} type="button">
                  x
                </button>
              </div>
              <div className="hp-row-actions">
                {[-5, -1, 1, 5].map((amount) => (
                  <button
                    disabled={disabled}
                    key={amount}
                    onClick={() => onAdjust(row.id, amount)}
                    type="button"
                  >
                    {amount > 0 ? `+${amount}` : amount}
                  </button>
                ))}
              </div>
              <input
                aria-label={`Status for ${row.name || "HP row"}`}
                disabled={disabled}
                maxLength={120}
                onChange={(event) => onUpdate(row.id, { status: event.target.value })}
                placeholder={t("hp.status")}
                value={row.status}
              />
              <details className="hp-notes">
                <summary>{t("hp.notes")}</summary>
                <textarea
                  aria-label={`Notes for ${row.name || "HP row"}`}
                  disabled={disabled}
                  maxLength={500}
                  onChange={(event) => onUpdate(row.id, { notes: event.target.value })}
                  rows={2}
                  value={row.notes}
                />
              </details>
            </article>
          ))}
        </div>
      )}
      <p className={`capture-status capture-status-${status.status}`}>
        {status.message ??
          (status.status === "loading"
            ? t("app.loading")
            : status.status === "saving"
              ? t("app.saving")
              : t("hp.workspace"))}
      </p>
    </section>
  );
}
