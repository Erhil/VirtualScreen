import { type Translator } from "../../lang";
import { type WorldLibraryEntry, type WorldLibraryState } from "../../lib/api";
import { Modal } from "../Modal";

export type WorldCreateDialogState =
  | { open: false }
  | {
      open: true;
      name: string;
      status: "idle" | "submitting";
      error: string | null;
    };

function worldSelectorLabel(world: WorldLibraryEntry, worlds: WorldLibraryEntry[]): string {
  const duplicateName = worlds.some((item) => item.id !== world.id && item.name === world.name);
  return duplicateName ? `${world.name} - ${world.path}` : world.name;
}

export function WorldSelector({
  state,
  onOpenWorld,
  t
}: {
  state: WorldLibraryState | null;
  onOpenWorld: (id: string) => void;
  t: Translator;
}) {
  const currentId = state?.worlds.find((world) => world.path === state.current?.path)?.id ?? "";
  const recentIds = new Set(state?.recent.map((world) => world.id) ?? []);
  const libraryWorlds = state?.worlds.filter((world) => !recentIds.has(world.id)) ?? [];

  return (
    <div className="world-selector">
      <select
        aria-label={t("world.select")}
        disabled={!state || state.worlds.length === 0}
        onChange={(event) => {
          if (event.target.value) {
            onOpenWorld(event.target.value);
          }
        }}
        value={currentId}
      >
        <option value="">{t("world.select")}</option>
        {state?.recent.length ? (
          <optgroup label={t("world.recent")}>
            {state.recent.map((world) => (
              <option key={`recent-${world.id}`} value={world.id}>
                {worldSelectorLabel(world, state.worlds)}
              </option>
            ))}
          </optgroup>
        ) : null}
        {libraryWorlds.length ? (
          <optgroup label={t("world.library")}>
            {libraryWorlds.map((world) => (
              <option key={world.id} value={world.id}>
                {worldSelectorLabel(world, state?.worlds ?? [])}
              </option>
            ))}
          </optgroup>
        ) : null}
      </select>
    </div>
  );
}

export function WorldOpenDialog({
  state,
  onClose,
  onOpenWorld,
  onRefresh,
  t
}: {
  state: WorldLibraryState | null;
  onClose: () => void;
  onOpenWorld: (id: string) => void;
  onRefresh: () => void;
  t: Translator;
}) {
  return (
    <Modal
      ariaLabel={t("world.openFolderTitle")}
      className="world-dialog"
      closeLabel={t("world.closeOpenFolder")}
      onClose={onClose}
      title={t("world.openFolderTitle")}
    >
        <p className="dialog-note">{state?.worlds_root ?? t("world.libraryNotLoaded")}</p>
        <button className="panel-action" onClick={onRefresh} type="button">
          {t("world.scanWorlds")}
        </button>
        {state && state.worlds.length === 0 ? <p>{t("world.noWorlds")}</p> : null}
        {state && state.worlds.length > 0 ? (
          <div className="world-dialog-list">
            {state.worlds.map((world) => (
              <button
                className="world-dialog-item"
                key={world.id}
                onClick={() => onOpenWorld(world.id)}
                type="button"
              >
                <span>{world.name}</span>
                <small>{world.path}</small>
              </button>
            ))}
          </div>
        ) : null}
    </Modal>
  );
}

export function WorldCreateDialog({
  state,
  onClose,
  onNameChange,
  onSubmit,
  t
}: {
  state: WorldCreateDialogState;
  onClose: () => void;
  onNameChange: (name: string) => void;
  onSubmit: () => void;
  t: Translator;
}) {
  if (!state.open) {
    return null;
  }

  return (
    <Modal
      ariaLabel={t("world.addTitle")}
      className="world-dialog"
      closeLabel={t("world.closeAdd")}
      onClose={onClose}
      title={t("world.addTitle")}
    >
        <label>
          {t("world.name")}
          <input
            autoFocus
            onChange={(event) => onNameChange(event.target.value)}
            value={state.name}
          />
        </label>
        {state.error && <p className="dialog-error">{state.error}</p>}
        <div className="dialog-actions">
          <button disabled={state.status === "submitting"} onClick={onClose} type="button">
            {t("app.cancel")}
          </button>
          <button disabled={state.status === "submitting"} onClick={onSubmit} type="button">
            {state.status === "submitting" ? t("world.creating") : t("world.create")}
          </button>
        </div>
    </Modal>
  );
}
