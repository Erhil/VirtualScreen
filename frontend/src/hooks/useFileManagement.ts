import { useRef, useState, type DragEvent, type MouseEvent } from "react";

import {
  DEFAULT_CARD_TEMPLATE_ID,
  selectedCardTemplate,
  type FileDialogState
} from "../components/world/FileManagementDialog";
import type { TrashDialogState } from "../components/world/TrashManagerDialog";
import type { FolderCreateKind } from "../components/world/WorldTree";
import type { WorldTreeContextMenuState } from "../components/world/WorldTreeContextMenu";
import {
  createWorldFile,
  createWorldFolder,
  deleteTrash,
  duplicateWorldPath,
  fetchCardTemplates,
  fetchTrash,
  moveWorldPath,
  restoreTrash,
  trashWorldPath,
  type PageSummary,
  type TrashEntry,
  type WorldEntry,
  type WorldFile
} from "../lib/api";
import {
  builtInCardTemplates,
  defaultCardPath,
  normalizeCardTemplateCatalog,
  renderCardTemplate,
  serializeCard,
  type CardTemplateCatalog
} from "../lib/cards";
import {
  contextualManagedFilePath,
  defaultManagedFileName,
  defaultManagedFilePath,
  defaultManagedFolderPath,
  fileNameFromPath,
  isDescendantPath,
  joinWorldPath,
  managementErrorMessage,
  normalizeDialogPath,
  revealWorldTreePaths,
  validateContextualFileName,
  validateManagedFilePath,
  validateManagedFolderPath,
  type ManagedFileType
} from "../lib/fileManagement";
import { markLocalWrite, unmarkLocalWrite } from "../lib/localWrites";

const DEFAULT_CARD_TITLE = "New Card";
const DEFAULT_CARD_TEMPLATE_CATALOG: CardTemplateCatalog = {
  templates: builtInCardTemplates,
  warnings: []
};

function cardTitleFromPath(path: string): string {
  const name = path.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
  return name.replace(/\.cs$/i, "").trim() || DEFAULT_CARD_TITLE;
}

function createFileDialogState(
  fileType: ManagedFileType,
  folderPath: string,
  contextual = false
): Extract<FileDialogState, { kind: "create" }> {
  const cardTitle = DEFAULT_CARD_TITLE;
  const name = defaultManagedFileName(fileType);
  return {
    kind: "create",
    fileType,
    folderPath,
    contextual,
    name,
    path:
      fileType === "card"
        ? defaultCardPath(folderPath, cardTitle)
        : contextual
          ? contextualManagedFilePath(folderPath, name, fileType)
          : defaultManagedFilePath(folderPath, fileType),
    cardTemplateId: DEFAULT_CARD_TEMPLATE_ID,
    cardTitle,
    cardTemplateCatalog: DEFAULT_CARD_TEMPLATE_CATALOG,
    cardTemplateStatus: fileType === "card" ? "loading" : "idle",
    cardTemplateError: null,
    status: "idle",
    error: null
  };
}

function treePathValidation(path: string, entryKind: "file" | "directory"): string | null {
  if (entryKind === "directory") {
    return validateManagedFolderPath(path);
  }
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return "Enter a world-relative path.";
  }
  if (trimmedPath.startsWith("/") || /^[a-z]:/i.test(trimmedPath)) {
    return "Use a world-relative path.";
  }
  if (trimmedPath.split(/[\\/]/).some((part) => part === "..")) {
    return "Path cannot contain parent-directory traversal.";
  }
  if (trimmedPath.replace(/\\/g, "/").split("/")[0] === ".virtualscreen") {
    return "VirtualScreen internal paths cannot be managed.";
  }
  if (trimmedPath.replace(/\\/g, "/").split("/")[0] === ".music") {
    return "Music library paths cannot be managed here.";
  }
  return null;
}

export type UseFileManagementOptions = {
  // Re-read the tree and page list after a change; resolves to the fresh page list.
  refreshWorldStructure: (paths: string[]) => Promise<PageSummary[]>;
  // Why a path cannot be moved or trashed right now (unsaved edits under it), or null.
  blockedByUnsavedChanges: (path: string) => string | null;
  // What the rest of the app must do when a path moved or went to the trash.
  onPathMoved: (fromPath: string, toPath: string) => void;
  onPathTrashed: (path: string) => void;
  // A file created from the file dialog: open it.
  onFileCreated: (file: WorldFile, pages: PageSummary[]) => void;
};

// Organising the world's files: the tree's expanded folders, drag and drop and context menu,
// the create/rename/trash dialog, and the trash manager.
export function useFileManagement({
  refreshWorldStructure,
  blockedByUnsavedChanges,
  onPathMoved,
  onPathTrashed,
  onFileCreated
}: UseFileManagementOptions) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set([""]));
  const [fileDialog, setFileDialog] = useState<FileDialogState>({ kind: "closed" });
  const [folderMenuPath, setFolderMenuPath] = useState<string | null>(null);
  const [worldTreeContextMenu, setWorldTreeContextMenu] = useState<WorldTreeContextMenuState>({
    open: false
  });
  const worldTreeContextTriggerRef = useRef<HTMLElement | null>(null);
  const [worldTreeDragPath, setWorldTreeDragPath] = useState<string | null>(null);
  const [worldTreeDropPath, setWorldTreeDropPath] = useState<string | null>(null);
  const [worldTreeStatus, setWorldTreeStatus] = useState<string | null>(null);
  const [trashDialog, setTrashDialog] = useState<TrashDialogState>({ open: false });

  function revealPaths(paths: string[]) {
    setExpandedPaths((current) => revealWorldTreePaths(current, paths));
  }

  function collapseAll() {
    setExpandedPaths(new Set([""]));
  }

  function handleToggleFolder(path: string) {
    setExpandedPaths((paths) => {
      const nextPaths = new Set(paths);
      if (nextPaths.has(path)) {
        nextPaths.delete(path);
      } else {
        nextPaths.add(path);
      }
      return nextPaths;
    });
  }

  function closeWorldTreeContextMenu(restoreFocus = false) {
    setWorldTreeContextMenu({ open: false });
    if (restoreFocus) {
      window.requestAnimationFrame(() => worldTreeContextTriggerRef.current?.focus());
    }
  }

  function handleWorldTreeContextEntry(entry: WorldEntry, event: MouseEvent<HTMLElement>) {
    event.preventDefault();
    worldTreeContextTriggerRef.current = event.currentTarget;
    setFolderMenuPath(null);
    setWorldTreeContextMenu({
      open: true,
      entry,
      x: Math.min(event.clientX, Math.max(8, window.innerWidth - 190)),
      y: Math.min(event.clientY, Math.max(8, window.innerHeight - 190))
    });
  }

  function handleWorldTreeRename(entry: WorldEntry) {
    if (entry.path === "") {
      return;
    }
    setFileDialog({
      kind: "rename",
      path: entry.path,
      newPath: entry.path,
      entryKind: entry.kind,
      status: "idle",
      error: null
    });
  }

  async function handleWorldTreeDuplicate(entry: WorldEntry) {
    if (entry.path === "") {
      return;
    }
    const validation = blockedByUnsavedChanges(entry.path);
    if (validation) {
      setWorldTreeStatus(validation);
      return;
    }
    markLocalWrite([entry.path]);
    try {
      const duplicated = await duplicateWorldPath({ path: entry.path });
      await refreshWorldStructure(duplicated.affected_paths);
      revealPaths([duplicated.path]);
      setWorldTreeStatus(`Duplicated ${entry.path} to ${duplicated.path}.`);
    } catch (error: unknown) {
      unmarkLocalWrite([entry.path]);
      setWorldTreeStatus(managementErrorMessage(error));
    }
  }

  function handleWorldTreeTrash(entry: WorldEntry) {
    if (entry.path === "") {
      return;
    }
    setFileDialog({
      kind: "trash",
      path: entry.path,
      entryKind: entry.kind,
      status: "idle",
      error: null
    });
  }

  function handleWorldTreeDragStart(entry: WorldEntry, event: DragEvent<HTMLElement>) {
    if (entry.path === "") {
      event.preventDefault();
      return;
    }
    setWorldTreeDragPath(entry.path);
    setWorldTreeDropPath(null);
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", entry.path);
  }

  function handleWorldTreeDragEnd() {
    setWorldTreeDragPath(null);
    setWorldTreeDropPath(null);
  }

  async function handleWorldTreeDrop(targetEntry: WorldEntry, event: DragEvent<HTMLElement>) {
    if (targetEntry.kind !== "directory") {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const sourcePath = worldTreeDragPath ?? event.dataTransfer.getData("text/plain");
    handleWorldTreeDragEnd();
    if (!sourcePath || sourcePath === targetEntry.path || isDescendantPath(targetEntry.path, sourcePath)) {
      return;
    }
    const currentParent = sourcePath.split("/").slice(0, -1).join("/");
    if (currentParent === targetEntry.path) {
      return;
    }
    const validation = blockedByUnsavedChanges(sourcePath);
    if (validation) {
      setWorldTreeStatus(validation);
      return;
    }
    const targetPath = joinWorldPath(targetEntry.path, fileNameFromPath(sourcePath));
    markLocalWrite([sourcePath, targetPath]);
    try {
      const moved = await moveWorldPath({ path: sourcePath, new_path: targetPath });
      markLocalWrite([moved.path, ...moved.affected_paths, ...moved.deleted_paths]);
      await refreshWorldStructure([sourcePath, moved.path, ...moved.affected_paths]);
      onPathMoved(sourcePath, moved.path);
      revealPaths([moved.path]);
      setWorldTreeStatus(`Moved ${sourcePath} to ${moved.path}.`);
    } catch (error: unknown) {
      unmarkLocalWrite([sourcePath, targetPath]);
      setWorldTreeStatus(managementErrorMessage(error));
    }
  }

  async function loadCardTemplateCatalog(preferredTemplateId: string) {
    try {
      const catalog = normalizeCardTemplateCatalog(await fetchCardTemplates());
      setFileDialog((state) => {
        if (state.kind !== "create" || state.fileType !== "card") {
          return state;
        }
        return {
          ...state,
          cardTemplateCatalog: catalog,
          cardTemplateId: catalog.templates.some((template) => template.id === preferredTemplateId)
            ? preferredTemplateId
            : catalog.templates[0]?.id ?? DEFAULT_CARD_TEMPLATE_ID,
          cardTemplateStatus: "ready",
          cardTemplateError: null
        };
      });
    } catch (error: unknown) {
      setFileDialog((state) =>
        state.kind === "create" && state.fileType === "card"
          ? {
              ...state,
              cardTemplateCatalog: DEFAULT_CARD_TEMPLATE_CATALOG,
              cardTemplateStatus: "error",
              cardTemplateError: error instanceof Error ? error.message : "Card templates could not load."
            }
          : state
      );
    }
  }

  function handleFolderAdd(folderPath: string, kind: FolderCreateKind) {
    setFolderMenuPath(null);
    if (kind === "folder") {
      setFileDialog({
        kind: "create-folder",
        path: defaultManagedFolderPath(folderPath),
        status: "idle",
        error: null
      });
      return;
    }

    const nextState = createFileDialogState(kind, folderPath, true);
    setFileDialog(nextState);
    if (kind === "card") {
      void loadCardTemplateCatalog(nextState.cardTemplateId);
    }
  }

  function handleOpenNewCardDialog() {
    const nextState = createFileDialogState("card", "");
    setFileDialog(nextState);
    void loadCardTemplateCatalog(nextState.cardTemplateId);
  }

  function handleFileDialogPathChange(path: string) {
    setFileDialog((state) => {
      if (state.kind === "create") {
        if (state.contextual) {
          const nextPath =
            state.fileType === "card"
              ? defaultCardPath(
                  state.folderPath,
                  cardTitleFromPath(contextualManagedFilePath(state.folderPath, path, state.fileType))
                )
              : contextualManagedFilePath(state.folderPath, path, state.fileType);
          return {
            ...state,
            name: path,
            path: nextPath,
            cardTitle: state.fileType === "card" ? cardTitleFromPath(nextPath) : state.cardTitle,
            error: null
          };
        }
        return {
          ...state,
          path,
          folderPath: path.split("/").slice(0, -1).join("/"),
          cardTitle:
            state.fileType === "card" && state.cardTitle === DEFAULT_CARD_TITLE
              ? cardTitleFromPath(path)
              : state.cardTitle,
          error: null
        };
      }
      if (state.kind === "create-folder") {
        return { ...state, path, error: null };
      }
      if (state.kind === "rename") {
        return { ...state, newPath: path, error: null };
      }
      return state;
    });
  }

  function handleFileDialogTypeChange(fileType: ManagedFileType) {
    setFileDialog((state) => {
      if (state.kind !== "create") {
        return state;
      }
      const folderPath = state.folderPath || state.path.split("/").slice(0, -1).join("/");
      const nextState = createFileDialogState(fileType, folderPath, state.contextual);
      if (fileType === "card") {
        void loadCardTemplateCatalog(nextState.cardTemplateId);
      }
      return nextState;
    });
  }

  function handleFileDialogCardTemplateChange(cardTemplateId: string) {
    setFileDialog((state) =>
      state.kind === "create" ? { ...state, cardTemplateId, error: null } : state
    );
  }

  function handleFileDialogCardTitleChange(cardTitle: string) {
    setFileDialog((state) => {
      if (state.kind !== "create") {
        return state;
      }
      const folderPath = state.folderPath || state.path.split("/").slice(0, -1).join("/");
      return { ...state, cardTitle, path: defaultCardPath(folderPath, cardTitle), error: null };
    });
  }

  async function handleCreateFileDialog(state: Extract<FileDialogState, { kind: "create" }>) {
    const path = normalizeDialogPath(state.path);
    const contextualNameError = state.contextual ? validateContextualFileName(state.name) : null;
    if (contextualNameError) {
      setFileDialog({ ...state, path, error: contextualNameError, status: "idle" });
      return;
    }
    if (state.fileType === "card" && !state.cardTitle.trim()) {
      setFileDialog({ ...state, path, error: "Enter a card title.", status: "idle" });
      return;
    }
    const validation = validateManagedFilePath(path, state.fileType);
    if (validation) {
      setFileDialog({ ...state, path, error: validation, status: "idle" });
      return;
    }

    setFileDialog({ ...state, path, status: "submitting", error: null });
    markLocalWrite([path]);
    try {
      const createdFile = await createWorldFile({
        path,
        file_type: state.fileType,
        content:
          state.fileType === "card"
            ? serializeCard(renderCardTemplate(selectedCardTemplate(state), state.cardTitle))
            : undefined
      });
      const nextPages = await refreshWorldStructure([createdFile.path]);
      revealPaths([createdFile.path]);
      onFileCreated(createdFile, nextPages);
      setFileDialog({ kind: "closed" });
    } catch (error: unknown) {
      unmarkLocalWrite([path]);
      setFileDialog({ ...state, path, status: "idle", error: managementErrorMessage(error) });
    }
  }

  async function handleCreateFolderDialog(state: Extract<FileDialogState, { kind: "create-folder" }>) {
    const path = normalizeDialogPath(state.path);
    const validation = validateManagedFolderPath(path);
    if (validation) {
      setFileDialog({ ...state, path, error: validation, status: "idle" });
      return;
    }

    setFileDialog({ ...state, path, status: "submitting", error: null });
    markLocalWrite([path]);
    try {
      const folder = await createWorldFolder({ path });
      await refreshWorldStructure([folder.path]);
      setExpandedPaths((paths) => new Set([...revealWorldTreePaths(paths, [folder.path]), folder.path]));
      setFileDialog({ kind: "closed" });
    } catch (error: unknown) {
      unmarkLocalWrite([path]);
      setFileDialog({ ...state, path, status: "idle", error: managementErrorMessage(error) });
    }
  }

  async function handleRenameFileDialog(state: Extract<FileDialogState, { kind: "rename" }>) {
    const newPath = normalizeDialogPath(state.newPath);
    const validation = blockedByUnsavedChanges(state.path) ?? treePathValidation(newPath, state.entryKind);
    if (
      !validation &&
      state.entryKind === "file" &&
      fileNameFromPath(state.path).split(".").at(-1)?.toLowerCase() !==
        fileNameFromPath(newPath).split(".").at(-1)?.toLowerCase()
    ) {
      setFileDialog({ ...state, newPath, status: "idle", error: "File extension cannot change." });
      return;
    }
    if (validation) {
      setFileDialog({ ...state, newPath, status: "idle", error: validation });
      return;
    }

    setFileDialog({ ...state, newPath, status: "submitting", error: null });
    markLocalWrite([state.path, newPath]);
    try {
      const moved = await moveWorldPath({ path: state.path, new_path: newPath });
      markLocalWrite([moved.path, ...moved.affected_paths, ...moved.deleted_paths]);
      await refreshWorldStructure([state.path, moved.path, ...moved.affected_paths]);
      onPathMoved(state.path, moved.path);
      revealPaths([moved.path]);
      setWorldTreeStatus(`Moved ${state.path} to ${moved.path}.`);
      setFileDialog({ kind: "closed" });
    } catch (error: unknown) {
      unmarkLocalWrite([state.path, newPath]);
      setFileDialog({ ...state, newPath, status: "idle", error: managementErrorMessage(error) });
    }
  }

  async function handleTrashFileDialog(state: Extract<FileDialogState, { kind: "trash" }>) {
    const validation = blockedByUnsavedChanges(state.path);
    if (validation) {
      setFileDialog({ ...state, status: "idle", error: validation });
      return;
    }

    setFileDialog({ ...state, status: "submitting", error: null });
    markLocalWrite([state.path]);
    try {
      const trashed = await trashWorldPath({ path: state.path });
      markLocalWrite(trashed.deleted_paths);
      await refreshWorldStructure([state.path, ...trashed.deleted_paths]);
      onPathTrashed(state.path);
      setWorldTreeStatus(`Moved ${state.path} to trash.`);
      setFileDialog({ kind: "closed" });
    } catch (error: unknown) {
      unmarkLocalWrite([state.path]);
      setFileDialog({ ...state, status: "idle", error: managementErrorMessage(error) });
    }
  }

  function handleSubmitFileDialog() {
    if (fileDialog.kind === "create") {
      void handleCreateFileDialog(fileDialog);
    } else if (fileDialog.kind === "create-folder") {
      void handleCreateFolderDialog(fileDialog);
    } else if (fileDialog.kind === "rename") {
      void handleRenameFileDialog(fileDialog);
    } else if (fileDialog.kind === "trash") {
      void handleTrashFileDialog(fileDialog);
    }
  }

  async function loadTrashDialog() {
    setTrashDialog({
      open: true,
      status: "loading",
      entries: [],
      restorePaths: {},
      confirmDeletePath: null,
      error: null
    });
    try {
      const entries = await fetchTrash();
      setTrashDialog({
        open: true,
        status: "ready",
        entries,
        restorePaths: Object.fromEntries(entries.map((entry) => [entry.trashed_path, entry.original_path])),
        confirmDeletePath: null,
        error: null
      });
    } catch (error: unknown) {
      setTrashDialog({
        open: true,
        status: "error",
        entries: [],
        restorePaths: {},
        confirmDeletePath: null,
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }

  function handleTrashRestorePathChange(entry: TrashEntry, path: string) {
    setTrashDialog((state) =>
      state.open
        ? { ...state, restorePaths: { ...state.restorePaths, [entry.trashed_path]: path }, error: null }
        : state
    );
  }

  async function handleRestoreTrashEntry(entry: TrashEntry) {
    if (!trashDialog.open) {
      return;
    }
    const restorePath = normalizeDialogPath(
      trashDialog.restorePaths[entry.trashed_path] ?? entry.original_path
    );
    const validation = validateManagedFilePath(restorePath) ?? null;
    if (validation && entry.kind === "file") {
      setTrashDialog({ ...trashDialog, error: validation });
      return;
    }

    setTrashDialog({ ...trashDialog, status: "submitting", error: null });
    markLocalWrite([restorePath]);
    try {
      await restoreTrash({
        trashed_path: entry.trashed_path,
        ...(restorePath !== entry.original_path ? { restore_path: restorePath } : {})
      });
      await refreshWorldStructure([restorePath]);
      revealPaths([restorePath]);
      await loadTrashDialog();
    } catch (error: unknown) {
      unmarkLocalWrite([restorePath]);
      setTrashDialog({ ...trashDialog, status: "ready", error: managementErrorMessage(error) });
    }
  }

  async function handleDeleteTrashEntry(entry: TrashEntry) {
    if (!trashDialog.open) {
      return;
    }
    setTrashDialog({ ...trashDialog, status: "submitting", error: null });
    try {
      await deleteTrash({ trashed_path: entry.trashed_path });
      await loadTrashDialog();
    } catch (error: unknown) {
      setTrashDialog({ ...trashDialog, status: "ready", error: managementErrorMessage(error) });
    }
  }

  return {
    fileDialog,
    trashDialog,
    worldTreeStatus,
    folderMenuPath,
    setFolderMenuPath,
    worldTreeContextMenu,
    worldTreeDragPath,
    worldTreeDropPath,
    setWorldTreeDropPath,
    expandedPaths,
    revealPaths,
    collapseAll,
    closeFileDialog: () => setFileDialog({ kind: "closed" }),
    closeTrashDialog: () => setTrashDialog({ open: false }),
    setTrashConfirmDelete: (path: string | null) =>
      setTrashDialog((state) => (state.open ? { ...state, confirmDeletePath: path } : state)),
    closeWorldTreeContextMenu,
    handleWorldTreeContextEntry,
    handleWorldTreeRename,
    handleWorldTreeDuplicate,
    handleWorldTreeTrash,
    handleWorldTreeDragStart,
    handleWorldTreeDragEnd,
    handleWorldTreeDrop,
    handleFolderAdd,
    handleOpenNewCardDialog,
    handleFileDialogPathChange,
    handleFileDialogTypeChange,
    handleFileDialogCardTemplateChange,
    handleFileDialogCardTitleChange,
    handleSubmitFileDialog,
    loadTrashDialog,
    handleTrashRestorePathChange,
    handleRestoreTrashEntry,
    handleDeleteTrashEntry,
    handleToggleFolder
  };
}
