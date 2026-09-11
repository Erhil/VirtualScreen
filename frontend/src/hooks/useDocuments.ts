import {
  useEffect,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent
} from "react";
import { type Translator } from "../lang";
import {
  fetchPage,
  fetchPageBacklinks,
  fetchPageLinks,
  fetchWorldFile,
  saveWorldFile,
  updatePageMetadata,
  type PageSummary,
  type WorkspaceTab,
  type WorldFile
} from "../lib/api";
import { canHavePageLinks, isCardPath, isEditableFile, parseCardJson } from "../components/documents/documentFiles";
import { type FileLoadState } from "../components/documents/FileViewer";
import { type LinksLoadState, type MetadataEditState, type PageLoadState } from "../components/MetadataTool";
import { isRectangularCsv, parseCsv, serializeCsv, type CsvData } from "../lib/csv";
import {
  createEditorDraft,
  editorShortcutIntent,
  isDraftDirty,
  normalizeEditorModeForTarget,
  markDraftConflict,
  markDraftChangedOnDisk,
  markDraftError,
  markDraftSaved,
  markDraftSaving,
  revertDraft,
  setDraftMode,
  supportsEditorMode,
  updateDraftContent,
  type EditorDraft,
  type EditorMode,
  type EditorShortcutIntent
} from "../lib/editor";
import { isDescendantPath, remapMovedWorldPath, tabFromFileWithPages } from "../lib/fileManagement";
import { isLocalWrite, markLocalWrite, unmarkLocalWrite } from "../lib/localWrites";
import { planWorldEventUpdate, type WorldEvent } from "../lib/liveSync";
import {
  isMetadataFormDirty,
  metadataFormFromPage,
  metadataPayloadFromForm,
  validateMetadataForm,
  type MetadataFormState
} from "../lib/metadataEditor";
import { isTemporaryDmsPath } from "../lib/scripts";
import { isVirtualTabPath, type OpenTab } from "../lib/tabs";

function canSaveEditorDraft(file: WorldFile, draft: EditorDraft): boolean {
  if (!isDraftDirty(draft) || draft.status === "saving" || draft.externalChanged) {
    return false;
  }
  if (file.media_kind === "csv" && !isRectangularCsv(parseCsv(draft.content))) {
    return false;
  }
  if (isCardPath(file.path, file.extension) && !parseCardJson(draft.content).ok) {
    return false;
  }
  return true;
}

function remapLoadedFileRecords<T>(records: Record<string, T>, oldPath: string, newPath: string) {
  const nextRecords: Record<string, T> = {};
  Object.entries(records).forEach(([path, value]) => {
    nextRecords[remapMovedWorldPath(path, oldPath, newPath)] = value;
  });
  return nextRecords;
}

function removeLoadedFileRecords<T>(records: Record<string, T>, deletedPath: string) {
  const nextRecords: Record<string, T> = {};
  Object.entries(records).forEach(([path, value]) => {
    if (!isDescendantPath(path, deletedPath)) {
      nextRecords[path] = value;
    }
  });
  return nextRecords;
}

function discardLocalWriteEvent(event: WorldEvent): WorldEvent | null {
  const paths = event.paths.filter((path) => !isLocalWrite(path));
  const deletedPaths = event.deleted_paths.filter((path) => !isLocalWrite(path));

  if (paths.length === 0 && deletedPaths.length === 0) {
    return null;
  }
  return { ...event, paths, deleted_paths: deletedPaths };
}

export const idleFileState: FileLoadState = { status: "idle" };
export const idlePageState: PageLoadState = { status: "idle" };
export const idleLinksState: LinksLoadState = { status: "idle" };

export type UseDocumentsOptions = {
  activeTab: OpenTab | null;
  visiblePaneTabs: OpenTab[];
  t: Translator;
  // Re-read the world tree and page list after a write, clearing loaded pages/links of `paths`.
  refreshWorldStructure: (paths: string[]) => Promise<PageSummary[]>;
  // A file changed on disk (live sync): App refreshes search, favorites/recent and the tree.
  onWorldChanged: (deletedPaths: string[], affectedPaths: string[]) => Promise<void>;
  // Metadata was saved: App retitles the tab and swaps the file in favorites and recent files.
  onMetadataSaved: (path: string, title: string, replacement: WorkspaceTab) => void;
};

// Documents: what is loaded for the open tabs and what the DM is editing - file/page/links
// load states, PDF jump targets, editor drafts, metadata edits, the editor shortcuts, saving,
// reloading, and reacting to files changing on disk.
export function useDocuments({
  activeTab,
  visiblePaneTabs,
  t,
  refreshWorldStructure,
  onWorldChanged,
  onMetadataSaved
}: UseDocumentsOptions) {
  const [pdfTargets, setPdfTargets] = useState<Record<string, string | null>>({});
  const [fileStates, setFileStates] = useState<Record<string, FileLoadState>>({});
  const [pageStates, setPageStates] = useState<Record<string, PageLoadState>>({});
  const [linksStates, setLinksStates] = useState<Record<string, LinksLoadState>>({});
  const [editorDrafts, setEditorDrafts] = useState<Record<string, EditorDraft>>({});
  const [metadataEdits, setMetadataEdits] = useState<Record<string, MetadataEditState>>({});

  const dirtyPaths = new Set(
    Object.entries(editorDrafts)
      .filter(([, draft]) => isDraftDirty(draft))
      .map(([path]) => path)
  );
  const hasDirtyDrafts = dirtyPaths.size > 0;
  const activeFileState = activeTab
    ? fileStates[activeTab.path] ?? idleFileState
    : idleFileState;
  const activePageState = activeTab
    ? pageStates[activeTab.path] ?? idlePageState
    : idlePageState;
  const activeLinksState = activeTab
    ? linksStates[activeTab.path] ?? idleLinksState
    : idleLinksState;
  const activeDraft = activeTab ? editorDrafts[activeTab.path] ?? null : null;
  const activeMetadataEdit: MetadataEditState = activeTab
    ? metadataEdits[activeTab.path] ?? { mode: "view" }
    : { mode: "view" };
  const activeContentDirty = activeDraft ? isDraftDirty(activeDraft) : false;
  const visiblePanePathKey = visiblePaneTabs.map((tab) => tab.path).join("\u0000");

  useEffect(() => {
    function handleEditorKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented) {
        return;
      }
      const shortcut = Boolean(event.ctrlKey || event.metaKey);
      const key = event.key.toLowerCase();
      const saveShortcut = shortcut && (key === "s" || event.code === "KeyS");
      const splitShortcut = shortcut && event.key === "\\";
      const editorEscape = !shortcut && event.key === "Escape";
      if (!saveShortcut && !splitShortcut && !editorEscape) {
        return;
      }
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest("[role='dialog'],[role='menu']")) {
        return;
      }
      if (!activeDraft || activeFileState.status !== "ready" || !isEditableFile(activeFileState.file)) {
        return;
      }
      const intent = editorShortcutIntent(event, {
        dirty: isDraftDirty(activeDraft),
        mode: activeDraft.mode,
        supportsSplit: supportsEditorMode(activeFileState.file, "split")
      });
      if (!intent) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      runEditorShortcutIntent(activeFileState.file, activeDraft, intent);
    }

    window.addEventListener("keydown", handleEditorKeyDown, true);
    return () => window.removeEventListener("keydown", handleEditorKeyDown, true);
  }, [activeDraft, activeFileState]);

  useEffect(() => {
    if (!hasDirtyDrafts) {
      return;
    }
    function handleBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [hasDirtyDrafts]);

  const syncStateRef = useRef({
    activeContentDirty,
    activeDraft,
    activeMetadataEdit,
    activePageState,
    activeTab
  });
  syncStateRef.current = {
    activeContentDirty,
    activeDraft,
    activeMetadataEdit,
    activePageState,
    activeTab
  };

  useEffect(() => {
    for (const tab of visiblePaneTabs) {
      if (
        isVirtualTabPath(tab.path) ||
        tab.mediaKind === "image" ||
        tab.mediaKind === "pdf" ||
        tab.mediaKind === "video" ||
        tab.mediaKind === "folder" ||
        tab.mediaKind === "unsupported"
      ) {
        continue;
      }

      const currentState = fileStates[tab.path];
      if (
        currentState?.status === "loading" ||
        currentState?.status === "ready" ||
        currentState?.status === "removed"
      ) {
        continue;
      }

      setFileStates((states) => ({
        ...states,
        [tab.path]: { status: "loading" }
      }));

      fetchWorldFile(tab.path)
        .then((file) => {
          setFileStates((states) => ({
            ...states,
            [tab.path]: { status: "ready", file }
          }));
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Unknown error";
          setFileStates((states) => ({
            ...states,
            [tab.path]: { status: "error", message }
          }));
        });
    }
  }, [visiblePanePathKey, fileStates]);

  useEffect(() => {
    if (activeFileState.status !== "ready" || !isEditableFile(activeFileState.file)) {
      return;
    }

    const file = activeFileState.file;
    setEditorDrafts((drafts) => {
      const currentDraft = drafts[file.path];
      if (!currentDraft) {
        return { ...drafts, [file.path]: createEditorDraft(file) };
      }
      if (isLocalWrite(file.path)) {
        return drafts;
      }
      if (currentDraft.status === "saving" || currentDraft.status === "saved") {
        return drafts;
      }

      if (
        currentDraft.hash !== file.hash &&
        !isDraftDirty(currentDraft) &&
        currentDraft.status !== "conflict"
      ) {
        return { ...drafts, [file.path]: createEditorDraft(file) };
      }

      return drafts;
    });
  }, [activeFileState]);

  useEffect(() => {
    for (const tab of visiblePaneTabs) {
      if (isVirtualTabPath(tab.path) || tab.mediaKind === "folder") {
        continue;
      }

      const currentState = pageStates[tab.path];
      if (
        currentState?.status === "loading" ||
        currentState?.status === "ready" ||
        currentState?.status === "error"
      ) {
        continue;
      }

      setPageStates((states) => ({
        ...states,
        [tab.path]: { status: "loading" }
      }));

      fetchPage(tab.path)
        .then((page) => {
          setPageStates((states) => ({
            ...states,
            [tab.path]: { status: "ready", page }
          }));
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Unknown error";
          setPageStates((states) => ({
            ...states,
            [tab.path]: { status: "error", message }
          }));
        });
    }
  }, [visiblePanePathKey, pageStates]);

  useEffect(() => {
    for (const tab of visiblePaneTabs) {
      if (isVirtualTabPath(tab.path) || !canHavePageLinks(tab)) {
        continue;
      }

      const currentState = linksStates[tab.path];
      if (
        currentState?.status === "loading" ||
        currentState?.status === "ready" ||
        currentState?.status === "error"
      ) {
        continue;
      }

      setLinksStates((states) => ({
        ...states,
        [tab.path]: { status: "loading" }
      }));

      Promise.all([fetchPageLinks(tab.path), fetchPageBacklinks(tab.path)])
        .then(([outgoing, backlinks]) => {
          setLinksStates((states) => ({
            ...states,
            [tab.path]: { status: "ready", outgoing, backlinks }
          }));
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : "Unknown error";
          setLinksStates((states) => ({
            ...states,
            [tab.path]: { status: "error", message }
          }));
        });
    }
  }, [visiblePanePathKey, linksStates]);

  function confirmDiscardDirtyDrafts(message: string): boolean {
    return !hasDirtyDrafts || window.confirm(message);
  }

  function handleStartMetadataEdit() {
    if (!activeTab || activePageState.status !== "ready") {
      return;
    }

    setMetadataEdits((states) => ({
      ...states,
      [activeTab.path]: {
        mode: "edit",
        form: metadataFormFromPage(activePageState.page),
        status: "idle",
        message: null,
        expectedHash: activePageState.page.hash
      }
    }));
  }

  function handleChangeMetadataEdit(form: MetadataFormState) {
    if (!activeTab || activeMetadataEdit.mode !== "edit") {
      return;
    }

    setMetadataEdits((states) => ({
      ...states,
      [activeTab.path]: { ...activeMetadataEdit, form, status: "idle", message: null }
    }));
  }

  function handleCancelMetadataEdit() {
    if (!activeTab) {
      return;
    }

    setMetadataEdits((states) => {
      const nextStates = { ...states };
      delete nextStates[activeTab.path];
      return nextStates;
    });
  }

  function handleRevertMetadataEdit() {
    if (!activeTab || activePageState.status !== "ready" || activeMetadataEdit.mode !== "edit") {
      return;
    }

    setMetadataEdits((states) => ({
      ...states,
      [activeTab.path]: {
        ...activeMetadataEdit,
        form: metadataFormFromPage(activePageState.page),
        status: "idle",
        message: null,
        expectedHash: activePageState.page.hash
      }
    }));
  }

  async function handleReloadMetadataEdit() {
    if (!activeTab) {
      return;
    }
    const path = activeTab.path;
    handleCancelMetadataEdit();
    clearDerivedFileState(path);
    if (
      activeTab.mediaKind !== "image" &&
      activeTab.mediaKind !== "pdf" &&
      activeTab.mediaKind !== "video" &&
      activeTab.mediaKind !== "unsupported"
    ) {
      await handleReloadActiveFile();
    }
  }

  async function handleSaveMetadataEdit() {
    if (
      !activeTab ||
      activeMetadataEdit.mode !== "edit" ||
      activePageState.status !== "ready"
    ) {
      return;
    }

    const validation = validateMetadataForm(activeMetadataEdit.form);
    if (
      validation ||
      activeContentDirty ||
      !activeMetadataEdit.expectedHash
    ) {
      setMetadataEdits((states) => ({
        ...states,
        [activeTab.path]: {
          ...activeMetadataEdit,
          status: "error",
          message:
            validation ??
            (activeContentDirty
              ? "Save or revert content before editing metadata."
              : "Reload metadata before saving.")
        }
      }));
      return;
    }

    setMetadataEdits((states) => ({
      ...states,
      [activeTab.path]: { ...activeMetadataEdit, status: "saving", message: null }
    }));

    markLocalWrite([activeTab.path]);
    try {
      const response = await updatePageMetadata(activeTab.path, {
        metadata: metadataPayloadFromForm(activeMetadataEdit.form),
        expected_hash: activeMetadataEdit.expectedHash
      });
      const nextPages = await refreshWorldStructure([activeTab.path]);
      const replacement = tabFromFileWithPages(response.file, [response.page, ...nextPages]);

      setFileStates((states) => ({
        ...states,
        [activeTab.path]: { status: "ready", file: response.file }
      }));
      setPageStates((states) => ({
        ...states,
        [activeTab.path]: { status: "ready", page: response.page }
      }));
      setEditorDrafts((drafts) => {
        const currentDraft = drafts[activeTab.path];
        if (currentDraft && isDraftDirty(currentDraft)) {
          return drafts;
        }
        return { ...drafts, [activeTab.path]: createEditorDraft(response.file) };
      });
      onMetadataSaved(activeTab.path, response.page.title, replacement);
      setMetadataEdits((states) => {
        const nextStates = { ...states };
        delete nextStates[activeTab.path];
        return nextStates;
      });
    } catch (error: unknown) {
      unmarkLocalWrite([activeTab.path]);
      const message = error instanceof Error ? error.message : "Unknown error";
      setMetadataEdits((states) => ({
        ...states,
        [activeTab.path]: {
          ...activeMetadataEdit,
          status: message.includes("409") ? "conflict" : "error",
          message: message.includes("409") ? "World file changed on disk." : message
        }
      }));
    }
  }

  function handleDraftModeChange(mode: EditorMode) {
    if (!activeTab || !activeDraft || activeFileState.status !== "ready") {
      return;
    }

    const nextMode = normalizeEditorModeForTarget(activeFileState.file, mode);
    setEditorDrafts((drafts) => ({
      ...drafts,
      [activeTab.path]: setDraftMode(activeDraft, nextMode)
    }));
  }

  function handleDraftContentChange(content: string) {
    if (!activeTab || !activeDraft) {
      return;
    }

    setEditorDrafts((drafts) => ({
      ...drafts,
      [activeTab.path]: updateDraftContent(activeDraft, content)
    }));
  }

  function handleCsvDraftChange(data: CsvData) {
    handleDraftContentChange(serializeCsv(data));
  }

  function clearDerivedFileStates(paths: string[]) {
    setPageStates((states) => {
      const nextStates = { ...states };
      paths.forEach((path) => {
        delete nextStates[path];
      });
      return nextStates;
    });
    setLinksStates((states) => {
      const nextStates = { ...states };
      paths.forEach((path) => {
        delete nextStates[path];
      });
      return nextStates;
    });
  }

  function clearDerivedFileState(path: string) {
    clearDerivedFileStates([path]);
  }

  function clearFailedDerivedFileState(path: string) {
    setPageStates((states) => {
      if (states[path]?.status !== "error") {
        return states;
      }
      const nextStates = { ...states };
      delete nextStates[path];
      return nextStates;
    });
    setLinksStates((states) => {
      if (states[path]?.status !== "error") {
        return states;
      }
      const nextStates = { ...states };
      delete nextStates[path];
      return nextStates;
    });
  }

  async function handleSaveDraft() {
    if (!activeTab || !activeDraft || activeFileState.status !== "ready") {
      return;
    }

    if (activeDraft.externalChanged) {
      setEditorDrafts((drafts) => ({
        ...drafts,
        [activeTab.path]: markDraftConflict(activeDraft, "World file changed on disk.")
      }));
      return;
    }

    setEditorDrafts((drafts) => ({
      ...drafts,
      [activeTab.path]: markDraftSaving(activeDraft)
    }));

    markLocalWrite([activeTab.path]);
    try {
      const savedFile = await saveWorldFile(activeTab.path, {
        content: activeDraft.content,
        expected_hash: activeDraft.hash
      });
      setFileStates((states) => ({
        ...states,
        [activeTab.path]: { status: "ready", file: savedFile }
      }));
      setEditorDrafts((drafts) => ({
        ...drafts,
        [activeTab.path]: markDraftSaved(activeDraft, savedFile)
      }));
      await refreshWorldStructure([activeTab.path]);
    } catch (error: unknown) {
      unmarkLocalWrite([activeTab.path]);
      const message = error instanceof Error ? error.message : "Unknown error";
      setEditorDrafts((drafts) => ({
        ...drafts,
        [activeTab.path]: message.includes("409")
          ? markDraftConflict(activeDraft, "World file changed on disk.")
          : markDraftError(activeDraft, message)
      }));
    }
  }

  async function reloadTabFile(tab: OpenTab) {
    setFileStates((states) => ({
      ...states,
      [tab.path]: { status: "loading" }
    }));

    try {
      const file = await fetchWorldFile(tab.path);
      setFileStates((states) => ({
        ...states,
        [tab.path]: { status: "ready", file }
      }));
      setEditorDrafts((drafts) => ({
        ...drafts,
        [tab.path]: createEditorDraft(file)
      }));
      clearDerivedFileState(tab.path);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Unknown error";
      setFileStates((states) => ({
        ...states,
        [tab.path]: message.includes("404")
          ? { status: "removed", message: "File removed from disk." }
          : { status: "error", message }
      }));
    }
  }

  async function handleReloadActiveFile() {
    if (!activeTab) {
      return;
    }

    await reloadTabFile(activeTab);
  }

  async function handleWorldEvent(event: WorldEvent) {
    const syncEvent = discardLocalWriteEvent(event);
    if (!syncEvent) {
      return;
    }

    const latest = syncStateRef.current;
    const metadataDirty =
      latest.activeMetadataEdit.mode === "edit" &&
      latest.activePageState.status === "ready" &&
      isMetadataFormDirty(latest.activeMetadataEdit.form, latest.activePageState.page);
    const activeDirty =
      (latest.activeDraft ? isDraftDirty(latest.activeDraft) : false) || metadataDirty;
    const plan = planWorldEventUpdate(syncEvent, latest.activeTab?.path ?? null, activeDirty);

    await onWorldChanged(syncEvent.deleted_paths, plan.affectedPaths);

    if (!latest.activeTab) {
      return;
    }
    const eventActiveTab = latest.activeTab;

    if (plan.activeDeleted) {
      setFileStates((states) => ({
        ...states,
        [eventActiveTab.path]: {
          status: "removed",
          message: "File removed from disk."
        }
      }));
      setMetadataEdits((states) => {
        const nextStates = { ...states };
        delete nextStates[eventActiveTab.path];
        return nextStates;
      });
      return;
    }

    if (plan.markDraftChanged) {
      if (latest.activeDraft && isDraftDirty(latest.activeDraft)) {
        setEditorDrafts((drafts) => {
          const draft = drafts[eventActiveTab.path];
          return draft
            ? { ...drafts, [eventActiveTab.path]: markDraftChangedOnDisk(draft) }
            : drafts;
        });
      }
      if (metadataDirty) {
        setMetadataEdits((states) => {
          const current = states[eventActiveTab.path];
          return current?.mode === "edit"
            ? {
                ...states,
                [eventActiveTab.path]: {
                  ...current,
                  status: "conflict",
                  message: "World file changed on disk."
                }
              }
            : states;
        });
      }
      return;
    }

    if (
      plan.refetchActive &&
      eventActiveTab.mediaKind !== "image" &&
      eventActiveTab.mediaKind !== "pdf" &&
      eventActiveTab.mediaKind !== "video" &&
      eventActiveTab.mediaKind !== "unsupported"
    ) {
      await reloadTabFile(eventActiveTab);
    }
  }

  function requestEditMode(path: string, file: WorldFile) {
    if (!isEditableFile(file)) {
      return;
    }
    setEditorDrafts((drafts) => {
      const draft = drafts[path] ?? createEditorDraft(file);
      return { ...drafts, [path]: setDraftMode(draft, "edit") };
    });
  }

  function handlePaneDoubleClick(
    paneActive: boolean,
    tab: OpenTab | null,
    fileState: FileLoadState,
    event: MouseEvent<HTMLElement>
  ) {
    if (!paneActive || !tab || fileState.status !== "ready") {
      return;
    }
    const target = event.target instanceof HTMLElement ? event.target : null;
    if (target?.closest("button,a,input,textarea,select,[role='menu'],[role='dialog']")) {
      return;
    }
    requestEditMode(tab.path, fileState.file);
  }

  function setDraftMessage(draft: EditorDraft, message: string) {
    setEditorDrafts((drafts) => ({
      ...drafts,
      [draft.path]: { ...draft, message }
    }));
  }

  // The three editor intents below are named functions rather than branches inside
  // runEditorShortcutIntent because the toolbar buttons call them too. While they lived
  // only inside the shortcut runner there was no pointer-driven way to save or leave an
  // edit at all, which made editing on a touchscreen a trap: double-tap got you in, and
  // nothing got you out.
  function handleEditorSave(file: WorldFile, draft: EditorDraft) {
    if (canSaveEditorDraft(file, draft)) {
      void handleSaveDraft();
      return;
    }
    if (isDraftDirty(draft)) {
      setDraftMessage(draft, t("document.fixBeforeSaving"));
    }
  }

  function handleEditorExit(draft: EditorDraft) {
    if (isDraftDirty(draft)) {
      setDraftMessage(draft, t("document.saveOrRevertFirst"));
      return;
    }
    handleDraftModeChange("preview");
  }

  function handleEditorRevert(draft: EditorDraft) {
    if (!window.confirm(t("document.confirmRevert"))) {
      return;
    }
    setEditorDrafts((drafts) => ({
      ...drafts,
      [draft.path]: setDraftMode(revertDraft(draft), "preview")
    }));
  }

  function runEditorShortcutIntent(file: WorldFile, draft: EditorDraft, intent: EditorShortcutIntent) {
    if (intent === "save") {
      handleEditorSave(file, draft);
      return;
    }

    if (intent === "toggle-split") {
      handleDraftModeChange(draft.mode === "split" ? "edit" : "split");
      return;
    }

    if (intent === "dirty-escape") {
      setDraftMessage(draft, t("document.saveOrRevertFirst"));
      return;
    }

    if (intent === "exit-edit") {
      handleDraftModeChange("preview");
      return;
    }

    if (intent === "revert") {
      handleEditorRevert(draft);
    }
  }

  function handlePaneKeyDown(
    paneActive: boolean,
    fileState: FileLoadState,
    draft: EditorDraft | null,
    event: ReactKeyboardEvent<HTMLElement>
  ) {
    if (!paneActive || fileState.status !== "ready" || !draft || !isEditableFile(fileState.file)) {
      return;
    }
    const intent = editorShortcutIntent(event, {
      dirty: isDraftDirty(draft),
      mode: draft.mode,
      supportsSplit: supportsEditorMode(fileState.file, "split")
    });
    if (!intent) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    runEditorShortcutIntent(fileState.file, draft, intent);
  }

  function renameDocumentPath(oldPath: string, newPath: string) {
    setFileStates((states) => remapLoadedFileRecords(states, oldPath, newPath));
    setPageStates((states) => remapLoadedFileRecords(states, oldPath, newPath));
    setLinksStates((states) => remapLoadedFileRecords(states, oldPath, newPath));
    setEditorDrafts((drafts) => remapLoadedFileRecords(drafts, oldPath, newPath));
  }

  function forgetDocumentPath(path: string) {
    setFileStates((states) => removeLoadedFileRecords(states, path));
    setPageStates((states) => removeLoadedFileRecords(states, path));
    setLinksStates((states) => removeLoadedFileRecords(states, path));
    setEditorDrafts((drafts) => removeLoadedFileRecords(drafts, path));
  }

  function forgetDraft(path: string) {
    setEditorDrafts((drafts) => {
      if (!drafts[path]) {
        return drafts;
      }
      const nextDrafts = { ...drafts };
      delete nextDrafts[path];
      return nextDrafts;
    });
  }

  function adoptFile(file: WorldFile, withDraft: boolean) {
    setFileStates((states) => ({ ...states, [file.path]: { status: "ready", file } }));
    if (withDraft) {
      setEditorDrafts((drafts) => ({ ...drafts, [file.path]: createEditorDraft(file) }));
    }
  }

  function replaceTemporaryFile(temporaryPath: string, createdFile: WorldFile) {
    setFileStates((states) => {
      const nextStates = { ...states };
      delete nextStates[temporaryPath];
      nextStates[createdFile.path] = { status: "ready", file: createdFile };
      return nextStates;
    });
  }

  function setPdfTarget(path: string, heading: string | null) {
    setPdfTargets((targets) => ({ ...targets, [path]: heading }));
  }

  // A DMS run may have rewritten any file, so forget everything loaded except the run's own
  // temporary outputs, which exist only here.
  function dropLoadedWorldFiles() {
    setFileStates((states) =>
      Object.fromEntries(Object.entries(states).filter(([path]) => isTemporaryDmsPath(path)))
    );
    setPageStates({});
    setLinksStates({});
  }

  function resetDocuments() {
    setFileStates({});
    setPageStates({});
    setLinksStates({});
    setEditorDrafts({});
    setMetadataEdits({});
  }

  return {
    pdfTargets,
    fileStates,
    linksStates,
    editorDrafts,
    dirtyPaths,
    activeFileState,
    activePageState,
    activeLinksState,
    activeMetadataEdit,
    activeContentDirty,
    confirmDiscardDirtyDrafts,
    handleStartMetadataEdit,
    handleChangeMetadataEdit,
    handleCancelMetadataEdit,
    handleRevertMetadataEdit,
    handleReloadMetadataEdit,
    handleSaveMetadataEdit,
    handleDraftContentChange,
    handleCsvDraftChange,
    clearDerivedFileStates,
    clearFailedDerivedFileState,
    handleReloadActiveFile,
    reloadTabFile,
    requestEditMode,
    handlePaneDoubleClick,
    handleEditorSave,
    handleEditorExit,
    handleEditorRevert,
    handlePaneKeyDown,
    handleWorldEvent,
    renameDocumentPath,
    forgetDocumentPath,
    forgetDraft,
    adoptFile,
    replaceTemporaryFile,
    setPdfTarget,
    dropLoadedWorldFiles,
    resetDocuments
  };
}
