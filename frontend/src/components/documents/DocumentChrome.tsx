import { type MouseEvent } from "react";
import { type Translator } from "../../lang";
import { type WorldFile } from "../../lib/api";
import { isRectangularCsv, parseCsv } from "../../lib/csv";
import { type EditorDraft, isDraftDirty } from "../../lib/editor";
import { isScriptRunAvailable, isTemporaryDmsPath } from "../../lib/scripts";
import { type ScriptRunState } from "../tools/ScriptsTool";
import { isCardPath, isEditableFile, parseCardJson } from "./documentFiles";

export function DocumentChrome({
  draft,
  file,
  onExitEdit,
  onReload,
  onCancelScript,
  onRequestEdit,
  onRevert,
  onRunScript,
  onSave,
  onSaveTemporary,
  scriptRunState,
  t
}: {
  draft: EditorDraft | null;
  file: WorldFile | null;
  onExitEdit: () => void;
  onReload: () => void;
  onCancelScript: (runId: string) => void;
  onRequestEdit: () => void;
  onRevert: () => void;
  onRunScript: () => void;
  onSave: () => void;
  onSaveTemporary: () => void;
  scriptRunState: ScriptRunState;
  t: Translator;
}) {
  if (!file) {
    return null;
  }

  const editable = Boolean(draft && isEditableFile(file));
  if (!editable || !draft) {
    if (isTemporaryDmsPath(file.path)) {
      return (
        <section className="document-chrome" aria-label={t("document.status")}>
          <div className="document-state">
            <strong>{t("document.temporaryOutput")}</strong>
            <span>{t("document.saveOutputHint")}</span>
          </div>
          <button className="document-action" onClick={onSaveTemporary} type="button">
            {t("document.saveAs")}
          </button>
        </section>
      );
    }
    return (
      <section className="document-chrome document-chrome-readonly" aria-label={t("document.status")}>
        <div className="document-state">
          <strong>{t("document.preview")}</strong>
          <span>{t("document.fileActionsHint")}</span>
        </div>
      </section>
    );
  }

  const dirty = isDraftDirty(draft);
  const csvValid = file.media_kind !== "csv" || isRectangularCsv(parseCsv(draft.content));
  const cardValid = !isCardPath(file.path, file.extension) || parseCardJson(draft.content).ok;
  const saving = draft.status === "saving";
  const changedOnDisk = draft.externalChanged;
  const runningScript =
    scriptRunState.status === "running" &&
    scriptRunState.path === file.path &&
    Boolean(scriptRunState.runId);
  const scriptRun = isScriptRunAvailable({
    dirty,
    mediaKind: file.media_kind,
    running: runningScript,
    saving,
    t
  });
  const statusText =
    changedOnDisk
      ? t("document.changedOnDisk")
      : draft.status === "conflict"
        ? draft.message ?? t("document.conflict")
        : draft.status === "error"
          ? draft.message ?? t("document.saveError")
          : file.media_kind === "script" && !scriptRun.available
            ? scriptRun.reason
            : !cardValid
              ? t("document.invalidCardJson")
              : !csvValid
                ? t("document.invalidCsv")
                : draft.message
                  ? draft.message
                  : dirty
                    ? t("document.unsaved")
                    : draft.status === "saved"
                      ? t("document.saved")
                      : t("document.clean");
  const shortcutText =
    file.media_kind === "markdown"
      ? t("document.markdownShortcuts")
      : t("document.defaultShortcuts");
  const handleChromeDoubleClick = (event: MouseEvent<HTMLElement>) => {
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (draft.mode === "edit" || target?.closest("button,a,input,textarea,select")) {
      return;
    }
    onRequestEdit();
  };

  return (
    <section className="document-chrome" aria-label={t("document.status")} onDoubleClickCapture={handleChromeDoubleClick}>
      <div className="document-state">
        <strong>
          {draft.mode === "split"
            ? t("document.splitPreview")
            : draft.mode === "edit"
              ? t("document.editing")
              : t("document.preview")}
        </strong>
        <span
          className={`editor-status ${
            changedOnDisk ? "editor-status-external" : `editor-status-${draft.status}`
          }`}
          title={shortcutText}
        >
          {statusText}
        </span>
        {/* A refusal has to say something. The status line above is a state label and is
            claimed by "Changed on disk" before any explanation can reach it, so pressing
            Save in that state used to do nothing observable at all - which on a
            touchscreen is indistinguishable from a dead button. */}
        {draft.message && draft.message !== statusText ? (
          <span className="editor-message">{draft.message}</span>
        ) : null}
      </div>
      <div className="document-actions">
      {draft.mode !== "preview" && (
        <>
          <button
            className="document-action document-action-primary"
            disabled={saving}
            onClick={onSave}
            type="button"
          >
            {saving ? t("document.saving") : t("document.save")}
          </button>
          {dirty && (
            <button className="document-action" disabled={saving} onClick={onRevert} type="button">
              {t("document.revert")}
            </button>
          )}
          <button className="document-action" disabled={saving} onClick={onExitEdit} type="button">
            {t("document.done")}
          </button>
        </>
      )}
      {file.media_kind === "script" && (
        runningScript && scriptRunState.status === "running" && scriptRunState.runId ? (
          <button className="document-action" onClick={() => onCancelScript(scriptRunState.runId!)} type="button">
            {t("document.cancel")}
          </button>
        ) : (
          <button
            className="document-action"
            disabled={!scriptRun.available}
            onClick={onRunScript}
            title={scriptRun.available ? t("document.runScript") : scriptRun.reason}
            type="button"
          >
            {t("document.run")}
          </button>
        )
      )}
      {(draft.status === "conflict" || changedOnDisk) && (
        <button className="document-action" disabled={saving} onClick={onReload} type="button">
          {t("document.reloadFromDisk")}
        </button>
      )}
      </div>
    </section>
  );
}
