import { type NamedWorkspaceSummary } from "../../lib/api";
import { Modal } from "../Modal";

export type WorkspaceDialogState =
  | { kind: "closed" }
  | { kind: "create"; name: string; status: "idle" | "submitting"; error: string | null }
  | {
      kind: "rename";
      workspace: NamedWorkspaceSummary;
      name: string;
      status: "idle" | "submitting";
      error: string | null;
    };

export function WorkspaceDialog({
  state,
  onClose,
  onNameChange,
  onSubmit
}: {
  state: WorkspaceDialogState;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
}) {
  if (state.kind === "closed") {
    return null;
  }

  const title = state.kind === "create" ? "New Workspace" : "Rename Workspace";

  return (
    <Modal
      ariaLabel={title}
      className="world-dialog"
      closeLabel={`Close ${title}`}
      onClose={onClose}
      title={title}
    >
        <label>
          Workspace name
          <input
            autoFocus
            onChange={(event) => onNameChange(event.target.value)}
            value={state.name}
          />
        </label>
        {state.error && <p className="dialog-error">{state.error}</p>}
        <div className="dialog-actions">
          <button disabled={state.status === "submitting"} onClick={onClose} type="button">
            Cancel
          </button>
          <button disabled={state.status === "submitting"} onClick={onSubmit} type="button">
            {state.status === "submitting" ? "Saving..." : "Save"}
          </button>
        </div>
    </Modal>
  );
}
