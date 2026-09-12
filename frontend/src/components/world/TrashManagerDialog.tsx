import { type TrashEntry } from "../../lib/api";
import { Modal } from "../Modal";

export type TrashDialogState =
  | { open: false }
  | {
      open: true;
      status: "loading" | "ready" | "submitting" | "error";
      entries: TrashEntry[];
      restorePaths: Record<string, string>;
      confirmDeletePath: string | null;
      error: string | null;
    };

export function TrashManagerDialog({
  state,
  onClose,
  onDelete,
  onRestore,
  onRestorePathChange,
  onSetConfirmDelete
}: {
  state: TrashDialogState;
  onClose: () => void;
  onDelete: (entry: TrashEntry) => void;
  onRestore: (entry: TrashEntry) => void;
  onRestorePathChange: (entry: TrashEntry, path: string) => void;
  onSetConfirmDelete: (path: string | null) => void;
}) {
  if (!state.open) {
    return null;
  }

  return (
    <Modal
      ariaLabel="Trash"
      className="trash-dialog"
      closeLabel="Close Trash"
      closeOnEscape
      onClose={onClose}
      title="Trash"
    >
        {state.status === "loading" && <p>Loading trash...</p>}
        {state.error && <p className="dialog-error">{state.error}</p>}
        {state.status !== "loading" && state.entries.length === 0 && <p>Trash is empty.</p>}
        {state.entries.length > 0 && (
          <div className="trash-list">
            {state.entries.map((entry) => (
              <section className="trash-entry" key={entry.trashed_path}>
                <div>
                  <strong>{entry.name}</strong>
                  <small>{entry.original_path}</small>
                </div>
                <label>
                  Restore path
                  <input
                    aria-label={`Restore path ${entry.name}`}
                    onChange={(event) => onRestorePathChange(entry, event.target.value)}
                    value={state.restorePaths[entry.trashed_path] ?? entry.original_path}
                  />
                </label>
                <div className="trash-actions">
                  <button
                    disabled={state.status === "submitting"}
                    onClick={() => onRestore(entry)}
                    type="button"
                  >
                    Restore
                  </button>
                  {state.confirmDeletePath === entry.trashed_path ? (
                    <button
                      className="danger-button"
                      disabled={state.status === "submitting"}
                      onClick={() => onDelete(entry)}
                      type="button"
                    >
                      Confirm Delete Forever
                    </button>
                  ) : (
                    <button
                      disabled={state.status === "submitting"}
                      onClick={() => onSetConfirmDelete(entry.trashed_path)}
                      type="button"
                    >
                      Delete Forever
                    </button>
                  )}
                </div>
              </section>
            ))}
          </div>
        )}
    </Modal>
  );
}
