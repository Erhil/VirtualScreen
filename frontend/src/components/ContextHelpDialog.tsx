import { useEffect } from "react";

import type { Translator } from "../lang";
import type { ContextHelpTopic } from "../lib/contextHelp";

export function ContextHelpDialog({
  onClose,
  open,
  t,
  topic
}: {
  onClose: () => void;
  open: boolean;
  t: Translator;
  topic: ContextHelpTopic | null;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, open]);

  if (!open || !topic) {
    return null;
  }

  const shortcuts = topic.shortcutKeys
    .map((key) => t(key))
    .filter((value) => value && !value.startsWith("[["));

  return (
    <div className="dialog-overlay" onMouseDown={onClose} role="presentation">
      <section
        aria-label={t("help.open")}
        className="file-dialog context-help-dialog"
        data-context-help-dialog="true"
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>{t(topic.titleKey)}</h2>
          <button aria-label={t("help.close")} autoFocus onClick={onClose} type="button">
            x
          </button>
        </div>
        <ul className="context-help-list">
          {topic.bodyKeys.map((key) => (
            <li key={key}>{t(key)}</li>
          ))}
        </ul>
        {shortcuts.length > 0 && (
          <section className="context-help-shortcuts" aria-label={t("help.shortcuts")}>
            <h3>{t("help.shortcuts")}</h3>
            <ul>
              {shortcuts.map((shortcut) => (
                <li key={shortcut}>{shortcut}</li>
              ))}
            </ul>
          </section>
        )}
      </section>
    </div>
  );
}
