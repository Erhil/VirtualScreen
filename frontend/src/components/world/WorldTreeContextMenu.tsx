import { useEffect, useRef } from "react";
import { type Translator } from "../../lang";
import { type WorldEntry } from "../../lib/api";

export type WorldTreeContextMenuState =
  | { open: false }
  | { open: true; entry: WorldEntry; x: number; y: number };

export function WorldTreeContextMenu({
  state,
  favorite,
  onClose,
  onDuplicate,
  onOpen,
  onOpenKanban,
  onOpenNewTab,
  onRename,
  onToggleFavorite,
  onTrash,
  t
}: {
  state: WorldTreeContextMenuState;
  favorite: boolean;
  onClose: (restoreFocus?: boolean) => void;
  onDuplicate: (entry: WorldEntry) => void;
  onOpen: (entry: WorldEntry) => void;
  onOpenKanban: (entry: WorldEntry) => void;
  onOpenNewTab: (entry: WorldEntry) => void;
  onRename: (entry: WorldEntry) => void;
  onToggleFavorite: (entry: WorldEntry) => void;
  onTrash: (entry: WorldEntry) => void;
  t: Translator;
}) {
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!state.open) {
      return;
    }

    function handlePointerDown(event: globalThis.PointerEvent) {
      const target = event.target instanceof Node ? event.target : null;
      if (target && menuRef.current?.contains(target)) {
        return;
      }
      onClose(false);
    }

    window.addEventListener("pointerdown", handlePointerDown);
    return () => window.removeEventListener("pointerdown", handlePointerDown);
  }, [onClose, state.open]);

  if (!state.open) {
    return null;
  }
  const entry = state.entry;
  const isRoot = entry.path === "";
  return (
    <div
      className="tree-context-menu"
      ref={menuRef}
      role="menu"
      style={{ left: state.x, top: state.y }}
    >
      {entry.kind === "file" && (
        <>
          <button
            onClick={() => {
              onOpen(entry);
              onClose();
            }}
            type="button"
          >
            {t("world.menu.open")}
          </button>
          <button
            onClick={() => {
              onOpenNewTab(entry);
              onClose();
            }}
            type="button"
          >
            {t("world.menu.openNewTab")}
          </button>
          <button
            aria-pressed={favorite}
            onClick={() => {
              onToggleFavorite(entry);
              onClose();
            }}
            type="button"
          >
          {favorite ? t("world.menu.unfavorite") : t("world.menu.favorite")}
          </button>
        </>
      )}
      {entry.kind === "directory" && !isRoot && (
        <button
          onClick={() => {
            onOpenKanban(entry);
            onClose();
          }}
          type="button"
        >
          {t("world.menu.openKanban")}
        </button>
      )}
      {!isRoot && (
        <>
          <button
            onClick={() => {
              onRename(entry);
              onClose();
            }}
            type="button"
          >
          {t("world.menu.rename")}
          </button>
          <button
            onClick={() => {
              onDuplicate(entry);
              onClose();
            }}
            type="button"
          >
          {t("world.menu.duplicate")}
          </button>
          <button
            className="danger-action"
            onClick={() => {
              onTrash(entry);
              onClose();
            }}
            type="button"
          >
          {t("world.menu.trash")}
          </button>
        </>
      )}
    </div>
  );
}
