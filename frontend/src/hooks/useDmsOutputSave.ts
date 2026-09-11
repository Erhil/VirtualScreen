import { useState } from "react";

import { type DmsOutputSaveDialogState } from "../components/DmsDialogs";
import { type FileLoadState } from "../components/documents/FileViewer";
import { createWorldFile, type WorldFile } from "../lib/api";
import {
  managementErrorMessage,
  normalizeDialogPath,
  validateManagedFilePath,
  type ManagedFileType
} from "../lib/fileManagement";
import { isTemporaryDmsPath } from "../lib/scripts";
import { markLocalWrite, unmarkLocalWrite } from "../lib/localWrites";

export type UseDmsOutputSaveOptions = {
  activeFileState: FileLoadState;
  // The file was created on disk: App refreshes the world and swaps the temporary tab for it.
  onSaved: (temporaryPath: string, createdFile: WorldFile) => Promise<void>;
};

// Saving a temporary DMS output as a real world file: the save dialog and its submit flow.
export function useDmsOutputSave({ activeFileState, onSaved }: UseDmsOutputSaveOptions) {
  const [dmsOutputSaveDialog, setDmsOutputSaveDialog] = useState<DmsOutputSaveDialogState>({
    open: false
  });

  function handleOpenDmsOutputSaveDialog() {
    if (activeFileState.status !== "ready" || !isTemporaryDmsPath(activeFileState.file.path)) {
      return;
    }
    setDmsOutputSaveDialog({
      open: true,
      file: activeFileState.file,
      path: activeFileState.file.name,
      status: "idle",
      error: null
    });
  }

  function handleDmsOutputSavePathChange(path: string) {
    setDmsOutputSaveDialog((state) =>
      state.open ? { ...state, path, error: null } : state
    );
  }

  async function handleSaveDmsOutput() {
    if (!dmsOutputSaveDialog.open) {
      return;
    }
    const path = normalizeDialogPath(dmsOutputSaveDialog.path);
    const fileType: ManagedFileType =
      dmsOutputSaveDialog.file.media_kind === "csv" ? "csv" : "markdown";
    const validation = validateManagedFilePath(path, fileType);
    if (validation) {
      setDmsOutputSaveDialog((state) =>
        state.open ? { ...state, error: validation } : state
      );
      return;
    }

    setDmsOutputSaveDialog((state) =>
      state.open ? { ...state, status: "submitting", error: null } : state
    );
    markLocalWrite([path]);
    try {
      const createdFile = await createWorldFile({
        path,
        file_type: fileType,
        content: dmsOutputSaveDialog.file.content
      });
      await onSaved(dmsOutputSaveDialog.file.path, createdFile);
      closeDmsOutputSaveDialog();
    } catch (error: unknown) {
      unmarkLocalWrite([path]);
      setDmsOutputSaveDialog((state) =>
        state.open
          ? { ...state, status: "idle", error: managementErrorMessage(error) }
          : state
      );
    }
  }

  function closeDmsOutputSaveDialog() {
    setDmsOutputSaveDialog({ open: false });
  }

  function resetDmsOutputSave() {
    setDmsOutputSaveDialog({ open: false });
  }

  return {
    dmsOutputSaveDialog,
    handleOpenDmsOutputSaveDialog,
    handleDmsOutputSavePathChange,
    handleSaveDmsOutput,
    closeDmsOutputSaveDialog,
    resetDmsOutputSave
  };
}
