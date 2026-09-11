import { type DragEvent, memo, type MouseEvent } from "react";
import { type Translator } from "../../lang";
import { type WorldEntry } from "../../lib/api";
import { isDescendantPath } from "../../lib/fileManagement";
import { treeEntryLabel } from "../../lib/metadata";

export type FolderCreateKind = "card" | "csv" | "folder" | "markdown" | "script";

function worldEntryContainsFilter(entry: WorldEntry, filter: string): boolean {
  const matches =
    entry.name.toLowerCase().includes(filter) ||
    entry.path.toLowerCase().includes(filter) ||
    (entry.title ?? "").toLowerCase().includes(filter);
  if (entry.kind === "file") {
    return matches;
  }
  return matches || entry.children.some((child) => worldEntryContainsFilter(child, filter));
}

export const WorldTree = memo(function WorldTree({
  dragPath,
  dropPath,
  entry,
  expandedPaths,
  favoritePaths,
  filter,
  menuPath,
  onAdd,
  onContextEntry,
  onDragEnd,
  onDragStart,
  onDragTarget,
  onDropEntry,
  onOpen,
  onToggle,
  onMenuToggle,
  t
}: {
  dragPath: string | null;
  dropPath: string | null;
  entry: WorldEntry;
  expandedPaths: Set<string>;
  favoritePaths: Set<string>;
  filter: string;
  menuPath: string | null;
  onAdd: (folderPath: string, kind: FolderCreateKind) => void;
  onContextEntry: (entry: WorldEntry, event: MouseEvent<HTMLElement>) => void;
  onDragEnd: () => void;
  onDragStart: (entry: WorldEntry, event: DragEvent<HTMLElement>) => void;
  onDragTarget: (path: string | null) => void;
  onDropEntry: (entry: WorldEntry, event: DragEvent<HTMLElement>) => void;
  onToggle: (path: string) => void;
  onMenuToggle: (path: string | null) => void;
  onOpen: (entry: WorldEntry) => void;
  t: Translator;
}) {
  const normalizedFilter = filter.trim().toLowerCase();
  const entryMatches =
    !normalizedFilter ||
    entry.name.toLowerCase().includes(normalizedFilter) ||
    entry.path.toLowerCase().includes(normalizedFilter) ||
    (entry.title ?? "").toLowerCase().includes(normalizedFilter);

  if (entry.kind === "file") {
    if (!entryMatches) {
      return null;
    }
    const label = treeEntryLabel(entry);
    const favorite = favoritePaths.has(entry.path);
    return (
      <li>
        <button
          className={`tree-item file-item${favorite ? " tree-item-favorite" : ""}`}
          draggable
          onClick={() => onOpen(entry)}
          onContextMenu={(event) => onContextEntry(entry, event)}
          onDragEnd={onDragEnd}
          onDragStart={(event) => onDragStart(entry, event)}
          type="button"
        >
          <span className="tree-label">
            <span>{label.primary}</span>
            {label.secondary && <small>{label.secondary}</small>}
          </span>
          {favorite && <span className="tree-favorite-mark">{t("world.tree.favorite")}</span>}
        </button>
      </li>
    );
  }

  const matchingChildren = normalizedFilter
    ? entry.children.filter((child) => worldEntryContainsFilter(child, normalizedFilter))
    : entry.children;
  if (!entryMatches && matchingChildren.length === 0) {
    return null;
  }
  const expanded = normalizedFilter ? true : expandedPaths.has(entry.path);
  const addLabel = entry.path === "" ? t("world.tree.addRoot") : t("world.tree.addFolder", { name: entry.name });

  return (
    <li>
      <div
        className={`tree-folder-row${dropPath === entry.path ? " tree-drop-target" : ""}`}
        onDragLeave={() => {
          if (dropPath === entry.path) {
            onDragTarget(null);
          }
        }}
        onDragOver={(event) => {
          if (dragPath && dragPath !== entry.path && !isDescendantPath(entry.path, dragPath)) {
            event.preventDefault();
            event.dataTransfer.dropEffect = "move";
            onDragTarget(entry.path);
          }
        }}
        onDrop={(event) => onDropEntry(entry, event)}
      >
        <button
          aria-expanded={expanded}
          className="tree-item folder-item"
          draggable={entry.path !== ""}
          onClick={() => onToggle(entry.path)}
          onContextMenu={(event) => onContextEntry(entry, event)}
          onDragEnd={onDragEnd}
          onDragOver={(event) => {
            if (dragPath && dragPath !== entry.path && !isDescendantPath(entry.path, dragPath)) {
              event.preventDefault();
              event.dataTransfer.dropEffect = "move";
              onDragTarget(entry.path);
            }
          }}
          onDragStart={(event) => onDragStart(entry, event)}
          onDrop={(event) => onDropEntry(entry, event)}
          type="button"
        >
          <span aria-hidden>{expanded ? "v" : ">"}</span>
          {entry.path === "" ? entry.name : entry.name}
        </button>
        <button
          aria-label={addLabel}
          className="tree-add-button"
          onClick={() => onMenuToggle(menuPath === entry.path ? null : entry.path)}
          type="button"
        >
          +
        </button>
        {menuPath === entry.path && (
          <div className="tree-add-menu" role="menu">
            <button onClick={() => onAdd(entry.path, "markdown")} type="button">
              {t("world.tree.newMarkdown")}
            </button>
              <button onClick={() => onAdd(entry.path, "card")} type="button">
                {t("world.tree.newCard")}
              </button>
              <button onClick={() => onAdd(entry.path, "csv")} type="button">
                {t("world.tree.newCsv")}
              </button>
              <button onClick={() => onAdd(entry.path, "script")} type="button">
                {t("world.tree.newScript")}
              </button>
              <button onClick={() => onAdd(entry.path, "folder")} type="button">
                {t("world.tree.newFolder")}
              </button>
          </div>
        )}
      </div>
      {expanded && (
        <ul>
          {matchingChildren.map((child) => (
            <WorldTree
              entry={child}
              dragPath={dragPath}
              dropPath={dropPath}
              expandedPaths={expandedPaths}
              favoritePaths={favoritePaths}
              filter={filter}
              key={child.path}
              menuPath={menuPath}
              onAdd={onAdd}
              onContextEntry={onContextEntry}
              onDragEnd={onDragEnd}
              onDragStart={onDragStart}
              onDragTarget={onDragTarget}
              onDropEntry={onDropEntry}
              onMenuToggle={onMenuToggle}
              onOpen={onOpen}
              onToggle={onToggle}
              t={t}
            />
          ))}
        </ul>
      )}
    </li>
  );
});
