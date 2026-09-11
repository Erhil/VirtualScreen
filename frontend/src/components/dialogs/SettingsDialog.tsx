import { type ChangeEvent, useEffect, useState } from "react";
import { isUiLanguage, type Translator, type UiLanguage } from "../../lang";
import {
  type AppConfig,
  importSystemPack,
  previewSystemPack,
  type SystemPackImportResponse,
  type SystemPackPreviewResponse
} from "../../lib/api";
import { markLocalWrite } from "../../lib/localWrites";
import {
  groupSystemPackPreviewRows,
  mapSystemPackImportResultSummary,
  type SystemPackConflictDecision,
  validateSystemPackConflictDecisions
} from "../../lib/systemPacks";
import { DISABLEABLE_TOOLS, type ToolId } from "../../lib/toolPanel";
import { Modal } from "../Modal";

type SystemPackImportStatus = "idle" | "previewing" | "ready" | "importing" | "done" | "error";

type SystemPackImportState = {
  file: File | null;
  preview: SystemPackPreviewResponse | null;
  decisions: SystemPackConflictDecision[];
  summary: SystemPackImportResponse | null;
  status: SystemPackImportStatus;
  error: string | null;
};

function systemPackErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "System pack import failed.";
}

export function SettingsDialog({
  availableLanguages,
  disabledTools,
  language,
  onClose,
  onImportComplete,
  onLanguageChange,
  onToolDisabledChange,
  open,
  t
}: {
  availableLanguages: AppConfig["available_languages"];
  disabledTools: ToolId[];
  language: UiLanguage;
  onClose: () => void;
  onImportComplete: (summary: SystemPackImportResponse) => Promise<void>;
  onLanguageChange: (language: UiLanguage) => void;
  onToolDisabledChange: (tool: ToolId, disabled: boolean) => void;
  open: boolean;
  t: Translator;
}) {
  const [packState, setPackState] = useState<SystemPackImportState>({
    file: null,
    preview: null,
    decisions: [],
    summary: null,
    status: "idle",
    error: null
  });
  const conflictValidation = packState.preview
    ? validateSystemPackConflictDecisions(packState.preview.rows, packState.decisions)
    : { valid: false, errors: {} };
  const previewGroups = packState.preview
    ? groupSystemPackPreviewRows(packState.preview.rows)
    : null;
  const packHasInvalidRows = (previewGroups?.invalid.length ?? 0) > 0;

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (document.querySelector("[data-context-help-dialog='true']")) {
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    }
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [onClose, open]);

  useEffect(() => {
    if (!open) {
      setPackState({
        file: null,
        preview: null,
        decisions: [],
        summary: null,
        status: "idle",
        error: null
      });
    }
  }, [open]);

  async function handlePackFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      setPackState({
        file: null,
        preview: null,
        decisions: [],
        summary: null,
        status: "idle",
        error: null
      });
      return;
    }
    setPackState({
      file,
      preview: null,
      decisions: [],
      summary: null,
      status: "previewing",
      error: null
    });
    try {
      const preview = await previewSystemPack(file);
      setPackState({
        file,
        preview,
        decisions: [],
        summary: null,
        status: "ready",
        error: null
      });
    } catch (error) {
      setPackState({
        file,
        preview: null,
        decisions: [],
        summary: null,
        status: "error",
        error: systemPackErrorMessage(error)
      });
    }
  }

  function updatePackDecision(nextDecision: SystemPackConflictDecision) {
    setPackState((state) => ({
      ...state,
      decisions: state.decisions.some((decision) => decision.target_path === nextDecision.target_path)
        ? state.decisions.map((decision) =>
            decision.target_path === nextDecision.target_path ? nextDecision : decision
          )
        : [...state.decisions, nextDecision],
      summary: null,
      status: state.status === "done" ? "ready" : state.status,
      error: null
    }));
  }

  async function handleImportPack() {
    if (!packState.file || !packState.preview || !conflictValidation.valid) {
      return;
    }
    setPackState((state) => ({ ...state, status: "importing", error: null }));
    try {
      const summary = await importSystemPack({
        file: packState.file,
        decisions: packState.decisions
      });
      markLocalWrite(
        summary.files
          .filter((file) => ["imported", "overwritten", "renamed"].includes(file.status))
          .map((file) => file.target_path)
      );
      await onImportComplete(summary);
      setPackState((state) => ({
        ...state,
        summary,
        status: "done",
        error: null
      }));
    } catch (error) {
      setPackState((state) => ({
        ...state,
        status: "error",
        error: systemPackErrorMessage(error)
      }));
    }
  }

  if (!open) {
    return null;
  }

  return (
    <Modal
      ariaLabel={t("app.settingsTitle")}
      className="settings-dialog"
      closeLabel={t("app.closeSettings")}
      dataHelpContext="settings"
      dismissOnBackdrop
      onClose={onClose}
      title={t("app.settingsTitle")}
    >
        <label>
          {t("app.language")}
          <select
            autoFocus
            onChange={(event) => {
              if (isUiLanguage(event.target.value)) {
                onLanguageChange(event.target.value);
              }
            }}
            value={language}
          >
            {availableLanguages.map((option) => (
              <option key={option.code} value={option.code}>
                {option.native_label}
              </option>
            ))}
          </select>
        </label>
        <section className="settings-tools" aria-label={t("settings.toolsTitle")}>
          <h3>{t("settings.toolsTitle")}</h3>
          <p>{t("settings.toolsHint")}</p>
          <div className="settings-tools-grid">
            {DISABLEABLE_TOOLS.map((tool) => (
              <label className="settings-tool-toggle" key={tool}>
                <input
                  checked={!disabledTools.includes(tool)}
                  onChange={(event) => onToolDisabledChange(tool, !event.target.checked)}
                  type="checkbox"
                />
                {t(`tools.${tool}`)}
              </label>
            ))}
          </div>
        </section>
        <section className="settings-pack-import" aria-label={t("contentPack.importTitle")}>
          <h3>{t("contentPack.importTitle")}</h3>
          <label>
            {t("contentPack.chooseZip")}
            <input accept=".zip,application/zip" onChange={handlePackFileChange} type="file" />
          </label>
          <p>{t("contentPack.dmsSkipped")}</p>
          {packState.status === "previewing" && <p>{t("contentPack.previewing")}</p>}
          {packState.error && <p className="form-error">{packState.error}</p>}
          {packState.preview && previewGroups && (
            <div className="settings-pack-preview">
              <h4>
                {packState.preview.manifest.name} {packState.preview.manifest.version}
              </h4>
              <div className="settings-pack-counts" aria-label={t("contentPack.preview")}>
                {(["ready", "conflict", "skipped", "invalid"] as const).map((status) => (
                  <span key={status}>
                    {t(`contentPack.status.${status}`)}: {packState.preview?.counts[status] ?? 0}
                  </span>
                ))}
              </div>
              {packState.preview.rows.length > 0 && (
                <ul>
                  {packState.preview.rows.map((row) => (
                    <li key={row.id}>
                      <span>
                        <strong>{row.target_path}</strong>
                        <small>{t(`contentPack.status.${row.status}`)}</small>
                      </span>
                      {row.status === "skipped" && row.target_path.toLowerCase().endsWith(".dms") && (
                        <small>{t("contentPack.dmsSkipped")}</small>
                      )}
                      {row.message && <small>{row.message}</small>}
                    </li>
                  ))}
                </ul>
              )}
              {previewGroups.conflict.length > 0 && (
                <div className="settings-pack-conflicts">
                  <h4>{t("contentPack.conflicts")}</h4>
                  {previewGroups.conflict.map((row) => {
                    const decision = packState.decisions.find(
                      (item) => item.target_path === row.target_path
                    );
                    return (
                      <div className="settings-pack-conflict" key={row.id}>
                        <label>
                          {row.target_path}
                          <select
                            onChange={(event) =>
                              updatePackDecision({
                                target_path: row.target_path,
                                decision: event.target.value as SystemPackConflictDecision["decision"],
                                rename_target_path:
                                  event.target.value === "rename"
                                    ? decision?.rename_target_path ?? row.target_path
                                    : undefined
                              })
                            }
                            value={decision?.decision ?? ""}
                          >
                            <option disabled value="">
                              {t("contentPack.decision.choose")}
                            </option>
                            <option value="skip">{t("contentPack.decision.skip")}</option>
                            <option value="overwrite">{t("contentPack.decision.replace")}</option>
                            <option value="rename">{t("contentPack.decision.rename")}</option>
                          </select>
                        </label>
                        {decision?.decision === "rename" && (
                          <label>
                            {t("contentPack.renameTarget")}
                            <input
                              onChange={(event) =>
                                updatePackDecision({
                                  ...decision,
                                  rename_target_path: event.target.value
                                })
                              }
                              value={decision.rename_target_path ?? ""}
                            />
                          </label>
                        )}
                        {conflictValidation.errors[row.target_path] && (
                          <small className="form-error">
                            {conflictValidation.errors[row.target_path]}
                          </small>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              {!conflictValidation.valid && (
                <p className="form-error">{t("contentPack.unresolvedConflicts")}</p>
              )}
              {packHasInvalidRows && <p className="form-error">{t("contentPack.invalidRows")}</p>}
            </div>
          )}
          {packState.summary && (
            <div className="settings-pack-summary">
              <strong>{t("contentPack.summary")}</strong>
              <p>
                {t("contentPack.summaryCounts", mapSystemPackImportResultSummary(packState.summary))}
              </p>
              <p>{t("contentPack.refreshAfterImport")}</p>
            </div>
          )}
          <button
            disabled={
              !packState.file ||
              !packState.preview ||
              packHasInvalidRows ||
              !conflictValidation.valid ||
              packState.status === "previewing" ||
              packState.status === "importing" ||
              packState.status === "done"
            }
            onClick={() => void handleImportPack()}
            type="button"
          >
            {packState.status === "importing" ? t("contentPack.importing") : t("contentPack.import")}
          </button>
        </section>
        <div className="dialog-actions">
          <button onClick={onClose} type="button">
            {t("app.close")}
          </button>
        </div>
    </Modal>
  );
}
