import {
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
  useEffect,
  useState
} from "react";
import { type Translator } from "../../lang";
import { type SearchResult } from "../../lib/api";
import { moveSearchResultSelection, selectedSearchResult } from "../../lib/searchPalette";
import { groupSearchResults } from "../../lib/workspace";

export type SearchLoadState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ready"; results: SearchResult[] }
  | { status: "error"; message: string };

function SearchTool({
  inputRef,
  query,
  state,
  t,
  onOpenOtherPane,
  onOpenResult,
  onPeekResult,
  onQueryChange,
  onShowResult,
  onStageResult
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  query: string;
  state: SearchLoadState;
  t: Translator;
  onOpenOtherPane: (result: SearchResult) => void;
  onOpenResult: (result: SearchResult) => void;
  onPeekResult: (result: SearchResult) => void;
  onQueryChange: (query: string) => void;
  onShowResult: (result: SearchResult) => void;
  onStageResult: (result: SearchResult) => void;
}) {
  const groups = state.status === "ready" ? groupSearchResults(state.results) : [];
  const results = groups.flatMap((group) => group.results);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [query, state.status]);

  function handleSearchKeyDown(event: ReactKeyboardEvent<HTMLInputElement>) {
    if (["ArrowDown", "ArrowUp", "Home", "End", "Escape"].includes(event.key)) {
      event.preventDefault();
      setSelectedIndex((index) => moveSearchResultSelection(index, event.key, results.length));
      return;
    }
    if (event.key === "Enter") {
      const selected = selectedSearchResult(results, selectedIndex);
      if (selected) {
        event.preventDefault();
        onOpenResult(selected);
      }
    }
  }

  return (
    <section aria-label={t("search.title")} className="search-tool">
      <label htmlFor="world-search">{t("search.world")}</label>
      <input
        id="world-search"
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={handleSearchKeyDown}
        placeholder={t("search.placeholder")}
        ref={inputRef}
        type="search"
        value={query}
      />
      <div className="search-results">
        {state.status === "idle" && <p>{t("search.idle")}</p>}
        {state.status === "loading" && <p>{t("search.loading")}</p>}
        {state.status === "error" && <p>{state.message}</p>}
        {state.status === "ready" && groups.length === 0 && <p>{t("search.noResults")}</p>}
        {groups.map((group) => (
          <section aria-label={`${group.label} Results`} key={group.label}>
            <h3>{group.label}</h3>
            {group.results.map((result) => {
              const resultIndex = results.findIndex((item) => item.path === result.path);
              return (
              <article
                aria-label={`${result.title} ${result.path}`}
                aria-selected={selectedIndex === resultIndex}
                className="search-result"
                key={result.path}
              >
                <button
                  className="search-result-main"
                  onClick={() => onOpenResult(result)}
                  type="button"
                >
                  <span>{result.title}</span>
                  <small>{result.path}</small>
                  {result.tags.length > 0 && <em>{result.tags.join(", ")}</em>}
                  {result.snippet && <p>{result.snippet}</p>}
                </button>
                <div className="search-result-actions">
                  <button onClick={() => onOpenResult(result)} type="button">
                    {t("search.open")}
                  </button>
                  <button onClick={() => onOpenOtherPane(result)} type="button">
                    {t("search.otherPane")}
                  </button>
                  <button onClick={() => onPeekResult(result)} type="button">
                    {t("search.peek")}
                  </button>
                  <button onClick={() => onStageResult(result)} type="button">
                    {t("search.stage")}
                  </button>
                  <button onClick={() => onShowResult(result)} type="button">
                    {t("search.showOnScreen")}
                  </button>
                </div>
              </article>
            )})}
          </section>
        ))}
      </div>
    </section>
  );
}

export function SearchDialog({
  inputRef,
  onClose,
  onOpenOtherPane,
  onOpenResult,
  onPeekResult,
  onQueryChange,
  onShowResult,
  onStageResult,
  open,
  query,
  state,
  t
}: {
  inputRef: RefObject<HTMLInputElement | null>;
  onClose: () => void;
  onOpenOtherPane: (result: SearchResult) => void;
  onOpenResult: (result: SearchResult) => void;
  onPeekResult: (result: SearchResult) => void;
  onQueryChange: (query: string) => void;
  onShowResult: (result: SearchResult) => void;
  onStageResult: (result: SearchResult) => void;
  open: boolean;
  query: string;
  state: SearchLoadState;
  t: Translator;
}) {
  if (!open) {
    return null;
  }

  return (
    <div className="dialog-overlay" role="presentation" onMouseDown={onClose}>
      <section
        aria-label={t("search.title")}
        className="file-dialog tool-dialog"
        data-help-context="search"
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            onClose();
          }
        }}
        onMouseDown={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="dialog-header">
          <h2>{t("search.title")}</h2>
          <button aria-label={t("search.close")} onClick={onClose} type="button">
            x
          </button>
        </div>
        <SearchTool
          inputRef={inputRef}
          onOpenOtherPane={onOpenOtherPane}
          onOpenResult={onOpenResult}
          onPeekResult={onPeekResult}
          onQueryChange={onQueryChange}
          onShowResult={onShowResult}
          onStageResult={onStageResult}
          query={query}
          state={state}
          t={t}
        />
      </section>
    </div>
  );
}
