import { type KeyboardEvent, useEffect, useId, useMemo, useRef, useState } from "react";

import {
  filterWorldPathPickerCandidates,
  flattenWorldPathPickerEntries,
  moveWorldPathPickerActiveIndex,
  searchWorldPathPickerCandidates,
  selectedWorldPathPickerCandidate,
  type WorldPathPickerCandidate,
  type WorldPathPickerFilter
} from "./lib/worldPathPicker";
import type { AudioTrack, WorldEntry } from "./lib/api";

export type WorldPathPickerProps = {
  open: boolean;
  audioTracks?: AudioTrack[];
  candidates?: WorldPathPickerCandidate[];
  tree?: WorldEntry | null;
  filter?: WorldPathPickerFilter;
  filterLabel?: string;
  initialQuery?: string;
  mode?: "dialog" | "popover";
  placeholder?: string;
  title?: string;
  emptyMessage?: string;
  onClose: () => void;
  onSelect: (path: string, candidate: WorldPathPickerCandidate) => void;
};

export function WorldPathPicker({
  open,
  audioTracks = [],
  candidates,
  tree = null,
  filter,
  filterLabel,
  initialQuery = "",
  mode = "dialog",
  placeholder = "Search world paths",
  title = "Choose World Path",
  emptyMessage = "No matching paths.",
  onClose,
  onSelect
}: WorldPathPickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const titleId = useId();
  const inputId = useId();
  const listId = useId();

  const baseCandidates = useMemo(
    () => candidates ?? flattenWorldPathPickerEntries(tree, audioTracks),
    [audioTracks, candidates, tree]
  );
  const results = useMemo(
    () => searchWorldPathPickerCandidates(filterWorldPathPickerCandidates(baseCandidates, filter ?? "any"), query),
    [baseCandidates, filter, query]
  );
  const activeResult = selectedWorldPathPickerCandidate(results, selectedIndex);
  const activeOptionId = activeResult ? worldPathPickerOptionId(listId, activeResult) : undefined;
  const resolvedFilterLabel = filterLabel ?? worldPathPickerFilterLabel(filter ?? "any");

  useEffect(() => {
    if (!open) {
      return;
    }

    setQuery(initialQuery);
    setSelectedIndex(null);
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [initialQuery, open]);

  useEffect(() => {
    setSelectedIndex((index) =>
      index === null || index >= results.length ? (results.length > 0 ? 0 : null) : index
    );
  }, [results.length]);

  if (!open) {
    return null;
  }

  function selectResult(result: WorldPathPickerCandidate) {
    onSelect(result.path, result);
  }

  function handleKeyDown(event: KeyboardEvent<HTMLElement>) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }

    if (event.key === "Enter") {
      const result = selectedWorldPathPickerCandidate(results, selectedIndex);
      if (result) {
        event.preventDefault();
        selectResult(result);
      }
      return;
    }

    if (
      event.key === "ArrowDown" ||
      event.key === "ArrowUp" ||
      event.key === "Home" ||
      event.key === "End"
    ) {
      event.preventDefault();
      setSelectedIndex((index) => moveWorldPathPickerActiveIndex(index, event.key, results.length));
    }
  }

  const picker = (
    <section
      aria-label="Choose World Path"
      className={`world-path-picker world-path-picker-${mode}`}
      onKeyDown={handleKeyDown}
      role="dialog"
    >
      <div className="dialog-header world-path-picker-header">
        <div>
          <h2 id={titleId}>{title}</h2>
          <span>{resolvedFilterLabel}</span>
        </div>
        <button aria-label={`Close ${title}`} onClick={onClose} type="button">
          x
        </button>
      </div>

      <label className="world-path-picker-search" htmlFor={inputId}>
        <span>Search</span>
        <input
          aria-activedescendant={activeOptionId}
          aria-controls={listId}
          aria-label="Filter world paths"
          autoComplete="off"
          id={inputId}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={placeholder}
          ref={inputRef}
          type="search"
          value={query}
        />
      </label>

      <div
        aria-label="World path results"
        className="world-path-picker-results"
        id={listId}
        role="listbox"
      >
        {results.length === 0 ? (
          <p className="world-path-picker-empty">{emptyMessage}</p>
        ) : (
          results.map((result, index) => (
            <button
              data-active={index === selectedIndex ? "true" : "false"}
              className="world-path-picker-result"
              id={worldPathPickerOptionId(listId, result)}
              key={result.path}
              onClick={() => setSelectedIndex(index)}
              onDoubleClick={() => selectResult(result)}
              onFocus={() => setSelectedIndex(index)}
              type="button"
            >
              <span>{result.displayName}</span>
              <small>{result.path}</small>
            </button>
          ))
        )}
      </div>
      <div className="dialog-actions">
        <button onClick={onClose} type="button">
          Cancel
        </button>
        <button disabled={!activeResult} onClick={() => activeResult && selectResult(activeResult)} type="button">
          Use Selected Path
        </button>
      </div>
    </section>
  );

  if (mode === "popover") {
    return picker;
  }

  return (
    <div className="dialog-overlay" onMouseDown={onClose} role="presentation">
      <div onMouseDown={(event) => event.stopPropagation()}>{picker}</div>
    </div>
  );
}

function worldPathPickerOptionId(listId: string, result: WorldPathPickerCandidate): string {
  return `${listId}-${result.path.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}

function worldPathPickerFilterLabel(filter: WorldPathPickerFilter): string {
  if (filter === "any") {
    return "All paths";
  }
  if (filter === "displayable") {
    return "Displayable paths";
  }
  return `${filter[0].toUpperCase()}${filter.slice(1)} paths`;
}
