import { useState } from "react";

import { type WorldCreateDialogState } from "../components/world/WorldLibrary";
import { createWorld, fetchWorlds, openWorld, type WorldLibraryState } from "../lib/api";
import { managementErrorMessage } from "../lib/fileManagement";

export type UseWorldLibraryOptions = {
  // Confirm discarding unsaved work before leaving the current world; false aborts.
  confirmDiscard: (message: string) => boolean;
  // Tear down every domain before a different world loads.
  onBeforeSwitch: () => void;
  // A different world is now active on the server: load its content into the app.
  onSwitched: (library: WorldLibraryState) => Promise<void>;
  // A world failed to open or be created.
  onError: (message: string) => void;
};

// A failed world load used to render a bare "Could not load world." with the cause
// discarded, which left both users and failing e2e runs with nothing to act on.
export function worldLoadErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

// The world library: the list of worlds on disk, and the open/create dialogs for switching
// between them.
export function useWorldLibrary({ confirmDiscard, onBeforeSwitch, onSwitched, onError }: UseWorldLibraryOptions) {
  const [worldLibrary, setWorldLibrary] = useState<WorldLibraryState | null>(null);
  const [worldOpenDialog, setWorldOpenDialog] = useState(false);
  const [worldCreateDialog, setWorldCreateDialog] = useState<WorldCreateDialogState>({
    open: false
  });

  async function refreshWorldLibrary() {
    try {
      setWorldLibrary(await fetchWorlds());
    } catch {
      // The rest of the app can continue working from the active world.
    }
  }

  function handleWorldNameChange(name: string) {
    setWorldCreateDialog((state) =>
      state.open ? { ...state, name, error: null } : state
    );
  }

  async function handleOpenWorld(worldId: string) {
    if (!confirmDiscard("Switch worlds and discard unsaved changes?")) {
      return;
    }
    onBeforeSwitch();
    try {
      const nextWorldLibrary = await openWorld(worldId);
      await onSwitched(nextWorldLibrary);
    } catch (error) {
      console.error(`Switching to world "${worldId}" failed`, error);
      onError(worldLoadErrorMessage(error));
    }
  }

  async function handleCreateWorld() {
    if (!worldCreateDialog.open) {
      return;
    }
    const name = worldCreateDialog.name.trim();
    if (!name) {
      setWorldCreateDialog({ ...worldCreateDialog, error: "World name is required." });
      return;
    }
    if (name.startsWith(".") || name.includes("/") || name.includes("\\")) {
      setWorldCreateDialog({
        ...worldCreateDialog,
        error: "Use a simple folder name inside the world library."
      });
      return;
    }
    if (!confirmDiscard("Create a new world and discard unsaved changes?")) {
      return;
    }

    setWorldCreateDialog({ ...worldCreateDialog, name, status: "submitting", error: null });
    try {
      const nextWorldLibrary = await createWorld(name);
      setWorldCreateDialog({ open: false });
      onBeforeSwitch();
      await onSwitched(nextWorldLibrary);
    } catch (error: unknown) {
      setWorldCreateDialog({
        open: true,
        name,
        status: "idle",
        error: managementErrorMessage(error)
      });
    }
  }

  function adoptWorldLibrary(library: WorldLibraryState) {
    setWorldLibrary(library);
  }

  function openWorldDialog() {
    setWorldOpenDialog(true);
  }

  function closeWorldDialog() {
    setWorldOpenDialog(false);
  }

  function openWorldCreateDialog() {
    setWorldCreateDialog({ open: true, name: "", status: "idle", error: null });
  }

  function closeWorldCreateDialog() {
    setWorldCreateDialog({ open: false });
  }

  return {
    worldLibrary,
    worldOpenDialog,
    worldCreateDialog,
    adoptWorldLibrary,
    refreshWorldLibrary,
    handleWorldNameChange,
    handleOpenWorld,
    handleCreateWorld,
    openWorldDialog,
    closeWorldDialog,
    openWorldCreateDialog,
    closeWorldCreateDialog
  };
}
