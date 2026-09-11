import { type DragEvent, useEffect, useMemo, useState } from "react";
import { type Translator } from "../../lang";
import {
  createWorldFile,
  fetchPage,
  fetchWorldFile,
  type PageDetail,
  saveWorldFile,
  updatePageMetadata,
  type WorldEntry
} from "../../lib/api";
import { parseCard } from "../../lib/cards";
import {
  buildFolderKanbanColumns,
  buildFolderKanbanEntities,
  createKanbanCardContent,
  findWorldEntry,
  type FolderKanbanEntity,
  folderKanbanGroupOptions,
  kanbanCardPath,
  pageMetadataForKanbanMove,
  serializeCardWithKanbanValue,
  supportedFolderKanbanEntries
} from "../../lib/folderKanban";
import { markLocalWrite, unmarkLocalWrite } from "../../lib/localWrites";
import { type OpenTab } from "../../lib/tabs";

type FolderKanbanStatus =
  | { status: "idle"; message: string | null }
  | { status: "loading"; message: string | null }
  | { status: "ready"; message: string | null }
  | { status: "saving"; message: string | null }
  | { status: "error"; message: string };

function folderKanbanStorageKey(path: string): string {
  return `virtualscreen.folderKanban.group.${path}`;
}

function loadFolderKanbanGroup(path: string): string {
  try {
    return window.localStorage.getItem(folderKanbanStorageKey(path)) || "Status";
  } catch {
    return "Status";
  }
}

function saveFolderKanbanGroup(path: string, value: string) {
  try {
    window.localStorage.setItem(folderKanbanStorageKey(path), value);
  } catch {
  }
}

export function FolderKanbanView({
  dirtyPaths,
  onChanged,
  onOpenEntity,
  tab,
  t,
  worldTree
}: {
  dirtyPaths: ReadonlySet<string>;
  onChanged: (paths: string[]) => Promise<void>;
  onOpenEntity: (path: string) => void;
  tab: OpenTab;
  t: Translator;
  worldTree: WorldEntry | null;
}) {
  const [pageDetails, setPageDetails] = useState<PageDetail[]>([]);
  const [groupBy, setGroupBy] = useState(() => loadFolderKanbanGroup(tab.path));
  const [status, setStatus] = useState<FolderKanbanStatus>({ status: "idle", message: null });
  const [extraColumns, setExtraColumns] = useState<string[]>([]);
  const [newColumn, setNewColumn] = useState("");
  const [cardNames, setCardNames] = useState<Record<string, string>>({});
  const folder = useMemo(() => findWorldEntry(worldTree, tab.path), [tab.path, worldTree]);
  const childEntries = useMemo(() => supportedFolderKanbanEntries(folder), [folder]);
  const childPathKey = childEntries.map((entry) => entry.path).join("\u0000");

  useEffect(() => {
    setGroupBy(loadFolderKanbanGroup(tab.path));
    setExtraColumns([]);
    setCardNames({});
  }, [tab.path]);

  useEffect(() => {
    let cancelled = false;
    if (!folder || folder.kind !== "directory") {
      setPageDetails([]);
      setStatus({ status: "error", message: t("kanban.folderMissing") });
      return;
    }
    if (childEntries.length === 0) {
      setPageDetails([]);
      setStatus({ status: "ready", message: null });
      return;
    }
    setStatus({ status: "loading", message: null });
    Promise.all(childEntries.map((entry) => fetchPage(entry.path)))
      .then((details) => {
        if (cancelled) {
          return;
        }
        setPageDetails(details);
        setStatus({ status: "ready", message: null });
      })
      .catch((error: unknown) => {
        if (cancelled) {
          return;
        }
        setStatus({
          status: "error",
          message: error instanceof Error ? error.message : t("kanban.loadError")
        });
      });
    return () => {
      cancelled = true;
    };
  }, [childEntries.length, childPathKey, folder, t]);

  const entities = useMemo(
    () => buildFolderKanbanEntities(folder, pageDetails),
    [folder, pageDetails]
  );
  const groupOptions = useMemo(() => {
    const options = folderKanbanGroupOptions(entities);
    return options.includes(groupBy) ? options : [...options, groupBy];
  }, [entities, groupBy]);
  const columns = useMemo(
    () => buildFolderKanbanColumns(entities, groupBy, extraColumns),
    [entities, extraColumns, groupBy]
  );
  const entitiesByPath = useMemo(
    () => new Map(entities.map((entity) => [entity.path, entity])),
    [entities]
  );

  function handleGroupChange(value: string) {
    setGroupBy(value);
    saveFolderKanbanGroup(tab.path, value);
  }

  function handleDragStart(event: DragEvent<HTMLElement>, entity: FolderKanbanEntity) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", entity.path);
  }

  async function moveEntity(entity: FolderKanbanEntity, value: string) {
    if (dirtyPaths.has(entity.path)) {
      setStatus({ status: "error", message: t("kanban.dirtyBlocked", { name: entity.title }) });
      return;
    }
    setStatus({ status: "saving", message: null });
    try {
      if (entity.mediaKind === "card") {
        const file = await fetchWorldFile(entity.path);
        const card = parseCard(file.content);
        await saveWorldFile(entity.path, {
          content: serializeCardWithKanbanValue(card, groupBy, value),
          expected_hash: file.hash
        });
        const updatedPage = await fetchPage(entity.path);
        setPageDetails((details) => details.map((detail) =>
          detail.path === entity.path
            ? updatedPage
            : detail
        ));
      } else {
        const page = await fetchPage(entity.path);
        const updated = await updatePageMetadata(entity.path, {
          metadata: pageMetadataForKanbanMove(page, groupBy, value),
          expected_hash: page.hash
        });
        setPageDetails((details) => details.map((detail) =>
          detail.path === entity.path ? updated.page : detail
        ));
      }
      await onChanged([entity.path]);
      setStatus({ status: "ready", message: t("kanban.moved", { name: entity.title }) });
    } catch (error: unknown) {
      setStatus({
        status: "error",
        message: error instanceof Error ? error.message : t("kanban.moveError")
      });
    }
  }

  function handleDrop(event: DragEvent<HTMLElement>, value: string) {
    event.preventDefault();
    const path = event.dataTransfer.getData("text/plain");
    const entity = entitiesByPath.get(path);
    if (!entity) {
      return;
    }
    void moveEntity(entity, value);
  }

  function handleAddColumn() {
    const value = newColumn.trim();
    if (!value) {
      return;
    }
    setExtraColumns((columns) => (columns.includes(value) ? columns : [...columns, value]));
    setNewColumn("");
  }

  async function handleCreateCard(columnValue: string) {
    const name = (cardNames[columnValue] ?? "").trim();
    if (!name) {
      setStatus({ status: "error", message: t("kanban.cardNameRequired") });
      return;
    }
    const path = kanbanCardPath(tab.path, name);
    setStatus({ status: "saving", message: null });
    markLocalWrite([path]);
    try {
      const file = await createWorldFile({
        path,
        file_type: "card",
        content: createKanbanCardContent(name, groupBy, columnValue)
      });
      await onChanged([file.path]);
      const page = await fetchPage(file.path);
      setPageDetails((details) => [...details, page]);
      setCardNames((names) => ({ ...names, [columnValue]: "" }));
      setStatus({ status: "ready", message: t("kanban.created", { path: file.path }) });
    } catch (error: unknown) {
      unmarkLocalWrite([path]);
      setStatus({
        status: "error",
        message: error instanceof Error ? error.message : t("kanban.createError")
      });
    }
  }

  return (
    <section className="folder-kanban" data-help-context="document-folder">
      <header className="folder-kanban-header">
        <div>
          <h2>{t("kanban.title", { folder: tab.title ?? tab.name })}</h2>
          <p>{t("kanban.subtitle")}</p>
        </div>
        <label className="compact-inline-control">
          {t("kanban.groupBy")}
          <select onChange={(event) => handleGroupChange(event.target.value)} value={groupBy}>
            {groupOptions.map((option) => (
              <option key={option} value={option}>
                {option === "type" ? t("kanban.type") : option}
              </option>
            ))}
          </select>
        </label>
        <div className="inline-input-action folder-kanban-add-column">
          <input
            aria-label={t("kanban.newColumn")}
            onChange={(event) => setNewColumn(event.target.value)}
            placeholder={t("kanban.newColumn")}
            value={newColumn}
          />
          <button onClick={handleAddColumn} type="button">
            {t("kanban.addColumn")}
          </button>
        </div>
      </header>
      {status.message ? (
        <p
          className={status.status === "error" ? "folder-kanban-error" : "folder-kanban-status"}
          role={status.status === "error" ? "alert" : "status"}
        >
          {status.message}
        </p>
      ) : null}
      {status.status === "loading" ? <p>{t("kanban.loading")}</p> : null}
      {status.status !== "loading" && entities.length === 0 ? (
        <p>{t("kanban.empty")}</p>
      ) : null}
      <div className="folder-kanban-board">
        {columns.map((column) => (
          <section
            aria-label={column.label}
            className="folder-kanban-column"
            key={column.value}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, column.value)}
          >
            <h3>
              <span>{column.label}</span>
              <small>{column.entities.length}</small>
            </h3>
            <div className="folder-kanban-cards">
              {column.entities.map((entity) => (
                <button
                  className="folder-kanban-card"
                  draggable
                  key={entity.path}
                  onClick={() => onOpenEntity(entity.path)}
                  onDragStart={(event) => handleDragStart(event, entity)}
                  type="button"
                >
                  <strong>{entity.title}</strong>
                  <small>{entity.mediaKind.toUpperCase()}</small>
                  <span>{entity.path}</span>
                </button>
              ))}
            </div>
            <div className="folder-kanban-new-card">
              <input
                aria-label={t("kanban.cardName")}
                onChange={(event) =>
                  setCardNames((names) => ({ ...names, [column.value]: event.target.value }))
                }
                placeholder={t("kanban.cardName")}
                value={cardNames[column.value] ?? ""}
              />
              <button onClick={() => void handleCreateCard(column.value)} type="button">
                {t("kanban.addCard")}
              </button>
            </div>
          </section>
        ))}
      </div>
    </section>
  );
}
