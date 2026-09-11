import { type KeyboardEvent as ReactKeyboardEvent } from "react";
import { type Translator } from "../../lang";
import { type CaptureCategory, type CaptureTodayResponse } from "../../lib/api";
import {
  CAPTURE_CATEGORY_OPTIONS,
  type CaptureDraft,
  isCaptureSubmitShortcut
} from "../../lib/capture";
import { Modal } from "../Modal";

export type CaptureStatus =
  | { status: "idle"; message: string | null }
  | { status: "saving"; message: string | null }
  | { status: "saved"; message: string }
  | { status: "error"; message: string };

function CaptureTool({
  draft,
  onCategoryChange,
  onOpenLog,
  onPersistDraft,
  onSave,
  onTextChange,
  status,
  t,
  today
}: {
  draft: CaptureDraft;
  onCategoryChange: (category: CaptureCategory) => void;
  onOpenLog: () => void;
  onPersistDraft: () => void;
  onSave: () => void;
  onTextChange: (text: string) => void;
  status: CaptureStatus;
  t: Translator;
  today: CaptureTodayResponse | null;
}) {
  function handleKeyDown(event: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (!isCaptureSubmitShortcut(event)) {
      return;
    }
    event.preventDefault();
    onSave();
  }

  return (
    <section aria-label={t("capture.title")} className="capture-tool" data-help-context="capture">
      <div className="capture-category-chips" role="group" aria-label={t("capture.title")}>
        {CAPTURE_CATEGORY_OPTIONS.map((option) => (
          <button
            aria-pressed={draft.category === option.value}
            disabled={status.status === "saving"}
            key={option.value}
            onBlur={onPersistDraft}
            onClick={() => onCategoryChange(option.value)}
            type="button"
          >
            {option.label}
          </button>
        ))}
      </div>
      <label>
        {t("capture.text")} <small>{t("capture.shortcut")}</small>
        <textarea
          autoFocus
          disabled={status.status === "saving"}
          onBlur={onPersistDraft}
          onChange={(event) => onTextChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={t("capture.placeholder")}
          rows={4}
          value={draft.text}
        />
      </label>
      <div className="capture-actions">
        <button disabled={status.status === "saving"} onClick={onSave} type="button">
          {status.status === "saving" ? t("capture.saving") : t("capture.save")}
        </button>
        <button disabled={!today?.exists} onClick={onOpenLog} type="button">
          {t("capture.openLog")}
        </button>
      </div>
      <p className={`capture-status capture-status-${status.status}`}>
        {status.message ?? (today?.exists ? today.path : t("capture.noLog"))}
      </p>
    </section>
  );
}

export function CaptureDialog({
  draft,
  onCategoryChange,
  onClose,
  onOpenLog,
  onPersistDraft,
  onSave,
  onTextChange,
  open,
  status,
  today,
  t
}: {
  draft: CaptureDraft;
  onCategoryChange: (category: CaptureCategory) => void;
  onClose: () => void;
  onOpenLog: () => void;
  onPersistDraft: () => void;
  onSave: () => void;
  onTextChange: (text: string) => void;
  open: boolean;
  status: CaptureStatus;
  today: CaptureTodayResponse | null;
  t: Translator;
}) {
  if (!open) {
    return null;
  }

  function handleClose() {
    onPersistDraft();
    onClose();
  }

  return (
    <Modal
      ariaLabel={t("capture.title")}
      className="tool-dialog"
      closeLabel={t("capture.close")}
      dataHelpContext="capture"
      dismissOnBackdrop
      onClose={handleClose}
      title={t("capture.title")}
    >
        <CaptureTool
          draft={draft}
          onCategoryChange={onCategoryChange}
          onOpenLog={onOpenLog}
          onPersistDraft={onPersistDraft}
          onSave={onSave}
          onTextChange={onTextChange}
          status={status}
          t={t}
          today={today}
        />
    </Modal>
  );
}
