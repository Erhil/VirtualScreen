import type { Translator } from "../lang";
import type { DmsRunState, WorldFile } from "../lib/api";
import type { DmsFormField, DmsFormValues } from "../lib/scripts";
import { Modal } from "./Modal";

export type DmsFormDialogState =
  | { open: false }
  | {
      open: true;
      run: DmsRunState;
      fields: DmsFormField[];
      values: DmsFormValues;
    };

export type DmsTrustDialogState =
  | { open: false }
  | {
      open: true;
      path: string;
    };

export type DmsOutputSaveDialogState =
  | { open: false }
  | {
      open: true;
      file: WorldFile;
      path: string;
      status: "idle" | "submitting";
      error: string | null;
    };

export function DmsTrustDialog({
  onCancel,
  onConfirm,
  state,
  t
}: {
  onCancel: () => void;
  onConfirm: () => void;
  state: DmsTrustDialogState;
  t: Translator;
}) {
  if (!state.open) {
    return null;
  }

  return (
    <Modal
      ariaLabel={t("scripts.trustTitle")}
      className="dms-trust-dialog"
      closeLabel={t("app.cancel")}
      dataHelpContext="document-dms"
      dismissOnBackdrop
      onClose={onCancel}
      title={t("scripts.trustTitle")}
    >
      <p>{t("scripts.trustWarning")}</p>
      <div className="form-field">
        <span>{t("scripts.trustPath")}</span>
        <code>{state.path}</code>
      </div>
      <div className="dialog-actions">
        <button onClick={onCancel} type="button">
          {t("app.cancel")}
        </button>
        <button onClick={onConfirm} type="button">
          {t("scripts.trustConfirm")}
        </button>
      </div>
    </Modal>
  );
}

export function DmsFormDialog({
  fileOptions,
  onChange,
  onClose,
  onSubmit,
  state,
  t
}: {
  fileOptions: string[];
  onChange: (name: string, value: string | number | boolean) => void;
  onClose: () => void;
  onSubmit: () => void;
  state: DmsFormDialogState;
  t: Translator;
}) {
  if (!state.open) {
    return null;
  }

  return (
    <Modal
      ariaLabel={t("scripts.formDialog")}
      closeLabel={t("scripts.closeFormDialog")}
      dataHelpContext="document-dms"
      onClose={onClose}
      title={t("scripts.formTitle")}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        {state.fields.map((field) => (
          <label key={field.name}>
            {field.label}
            {field.input_type === "boolean" ? (
              <input
                checked={Boolean(state.values[field.name])}
                onChange={(event) => onChange(field.name, event.target.checked)}
                type="checkbox"
              />
            ) : field.input_type === "select" ? (
              <select
                onChange={(event) => onChange(field.name, event.target.value)}
                value={String(state.values[field.name] ?? "")}
              >
                {field.options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : field.input_type === "file" ? (
              <>
                <input
                  list={`dms-file-options-${field.name}`}
                  onChange={(event) => onChange(field.name, event.target.value)}
                  type="text"
                  value={String(state.values[field.name] ?? "")}
                />
                <datalist id={`dms-file-options-${field.name}`}>
                  {fileOptions.map((path) => (
                    <option key={path} value={path} />
                  ))}
                </datalist>
              </>
            ) : (
              <input
                onChange={(event) =>
                  onChange(
                    field.name,
                    field.input_type === "number"
                      ? Number(event.target.value)
                      : event.target.value
                  )
                }
                type={field.input_type === "number" ? "number" : "text"}
                value={String(state.values[field.name] ?? "")}
              />
            )}
          </label>
        ))}
        <div className="dialog-actions">
          <button type="button" onClick={onClose}>
            {t("app.cancel")}
          </button>
          <button type="submit">{t("app.continue")}</button>
        </div>
      </form>
    </Modal>
  );
}

export function DmsOutputSaveDialog({
  onChange,
  onClose,
  onSubmit,
  state,
  t
}: {
  onChange: (path: string) => void;
  onClose: () => void;
  onSubmit: () => void;
  state: DmsOutputSaveDialogState;
  t: Translator;
}) {
  if (!state.open) {
    return null;
  }
  const submitting = state.status === "submitting";

  return (
    <Modal
      ariaLabel={t("scripts.saveOutputDialog")}
      closeLabel={t("scripts.closeSaveOutputDialog")}
      dataHelpContext="document-dms"
      onClose={onClose}
      title={t("scripts.saveOutputTitle")}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label>
          {t("scripts.outputWorldPath")}
          <input
            onChange={(event) => onChange(event.target.value)}
            type="text"
            value={state.path}
          />
        </label>
        {state.error && <p className="dialog-error">{state.error}</p>}
        <div className="dialog-actions">
          <button disabled={submitting} onClick={onClose} type="button">
            {t("app.cancel")}
          </button>
          <button disabled={submitting} type="submit">
            {submitting ? t("app.saving") : t("app.save")}
          </button>
        </div>
      </form>
    </Modal>
  );
}
