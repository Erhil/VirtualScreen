import { builtInCardTemplates, type CardTemplate, type CardTemplateCatalog } from "../../lib/cards";
import { type ManagedFileType } from "../../lib/fileManagement";
import { Modal } from "../Modal";

export type FileDialogState =
  | { kind: "closed" }
  | {
      kind: "create";
      fileType: ManagedFileType;
      folderPath: string;
      contextual: boolean;
      name: string;
      path: string;
      cardTemplateId: string;
      cardTitle: string;
      cardTemplateCatalog: CardTemplateCatalog;
      cardTemplateStatus: "idle" | "loading" | "ready" | "error";
      cardTemplateError: string | null;
      status: "idle" | "submitting";
      error: string | null;
    }
  | {
      kind: "create-folder";
      path: string;
      status: "idle" | "submitting";
      error: string | null;
    }
  | {
      kind: "rename";
      path: string;
      newPath: string;
      entryKind: "file" | "directory";
      status: "idle" | "submitting";
      error: string | null;
    }
  | {
      kind: "trash";
      path: string;
      entryKind: "file" | "directory";
      status: "idle" | "submitting";
      error: string | null;
    };

export const DEFAULT_CARD_TEMPLATE_ID = "custom";

function cardTemplateLabel(template: CardTemplate): string {
  return `${template.name} (${template.kind}${template.source === "world" ? ", world" : ""})`;
}

export function selectedCardTemplate(
  state: Extract<FileDialogState, { kind: "create" }>
): CardTemplate {
  return (
    state.cardTemplateCatalog.templates.find(
      (template) => template.id === state.cardTemplateId
    ) ??
    state.cardTemplateCatalog.templates.find(
      (template) => template.id === DEFAULT_CARD_TEMPLATE_ID
    ) ??
    builtInCardTemplates[0]
  );
}

export function FileManagementDialog({
  state,
  onCardTemplateChange,
  onCardTitleChange,
  onClose,
  onFileTypeChange,
  onPathChange,
  onSubmit
}: {
  state: FileDialogState;
  onCardTemplateChange: (templateId: string) => void;
  onCardTitleChange: (title: string) => void;
  onClose: () => void;
  onFileTypeChange: (fileType: ManagedFileType) => void;
  onPathChange: (path: string) => void;
  onSubmit: () => void;
}) {
  if (state.kind === "closed") {
    return null;
  }

  const submitting = state.status === "submitting";
  const title =
    state.kind === "create"
      ? state.fileType === "card"
        ? "New Card"
        : "New File"
      : state.kind === "create-folder"
        ? "New Folder"
      : state.kind === "rename"
        ? state.entryKind === "directory"
          ? "Rename Folder"
          : "Rename File"
        : state.entryKind === "directory"
          ? "Move Folder to Trash"
          : "Move to Trash";
  const submitLabel =
    state.kind === "create"
      ? state.fileType === "card"
        ? "Create Card"
        : "Create File"
      : state.kind === "create-folder"
        ? "Create Folder"
      : state.kind === "rename"
        ? state.entryKind === "directory"
          ? "Rename Folder"
          : "Rename File"
      : "Move to Trash";
  const selectedTemplate =
    state.kind === "create" && state.fileType === "card"
      ? selectedCardTemplate(state)
      : null;

  return (
    <Modal
      ariaLabel={title}
      closeLabel={`Close ${title}`}
      onClose={onClose}
      title={title}
    >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit();
          }}
        >
          {state.kind === "create" && !state.contextual && (
            <label>
              File type
              <select
                onChange={(event) => onFileTypeChange(event.target.value as ManagedFileType)}
                value={state.fileType}
              >
                <option value="markdown">Markdown</option>
                <option value="card">Card</option>
                <option value="csv">CSV</option>
                <option value="script">DMS Script</option>
              </select>
            </label>
          )}
          {state.kind === "create" && state.contextual && (
            <>
              <label>
                Name
                <input
                  autoFocus
                  onChange={(event) => onPathChange(event.target.value)}
                  value={state.name}
                />
              </label>
              <p className="dialog-hint">Will create: {state.path}</p>
            </>
          )}
          {state.kind === "create" && state.fileType === "card" && (
            <>
              <label>
                Card template
                <select
                  onChange={(event) => onCardTemplateChange(event.target.value)}
                  value={state.cardTemplateId}
                >
                  {state.cardTemplateCatalog.templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {cardTemplateLabel(template)}
                    </option>
                  ))}
                </select>
              </label>
              {selectedTemplate?.description && (
                <p className="dialog-hint">{selectedTemplate.description}</p>
              )}
              {state.cardTemplateStatus === "loading" && (
                <p className="dialog-hint">Loading card templates...</p>
              )}
              {state.cardTemplateStatus === "error" && state.cardTemplateError && (
                <p className="dialog-error">{state.cardTemplateError}</p>
              )}
              {state.cardTemplateCatalog.warnings.length > 0 && (
                <p className="dialog-hint">
                  {state.cardTemplateCatalog.warnings.length} template warning
                  {state.cardTemplateCatalog.warnings.length === 1 ? "" : "s"}.
                </p>
              )}
              {!state.contextual && (
                <label>
                  Card title
                  <input
                    onChange={(event) => onCardTitleChange(event.target.value)}
                    value={state.cardTitle}
                  />
                </label>
              )}
            </>
          )}
          {state.kind !== "trash" && !(state.kind === "create" && state.contextual) && (
            <label>
              {state.kind === "create-folder" ||
              (state.kind === "rename" && state.entryKind === "directory")
                ? "New folder path"
                : "New file path"}
              <input
                autoFocus
                onChange={(event) => onPathChange(event.target.value)}
                value={
                  state.kind === "create" || state.kind === "create-folder"
                    ? state.path
                    : state.newPath
                }
              />
            </label>
          )}
          {state.kind === "trash" && (
            <p>
              Move <strong>{state.path}</strong> to trash?
              {state.entryKind === "directory" ? " This includes everything inside it." : ""}
            </p>
          )}
          {state.error && <p className="dialog-error">{state.error}</p>}
          <div className="dialog-actions">
            <button disabled={submitting} type="button" onClick={onClose}>
              Cancel
            </button>
            <button disabled={submitting} type="submit">
              {submitting ? "Working..." : submitLabel}
            </button>
          </div>
        </form>
    </Modal>
  );
}
