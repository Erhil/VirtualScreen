import { useEffect, useRef, useState } from "react";

import { type SearchLoadState } from "../components/dialogs/SearchDialog";
import { searchWorld } from "../lib/api";

// The search dialog: its query, debounced results, and open/closed state.
export function useSearch() {
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchState, setSearchState] = useState<SearchLoadState>({ status: "idle" });
  const [searchRevision, setSearchRevision] = useState(0);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const searchButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!searchDialogOpen) {
      return;
    }

    const query = searchQuery.trim();
    if (!query) {
      setSearchState({ status: "idle" });
      return;
    }

    let cancelled = false;
    setSearchState({ status: "loading" });
    const timeout = window.setTimeout(() => {
      searchWorld({ q: query, limit: 20 })
        .then((results) => {
          if (!cancelled) {
            setSearchState({ status: "ready", results });
          }
        })
        .catch((error: unknown) => {
          if (!cancelled) {
            const message = error instanceof Error ? error.message : "Unknown error";
            setSearchState({ status: "error", message });
          }
        });
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [searchDialogOpen, searchQuery, searchRevision]);

  useEffect(() => {
    if (searchDialogOpen) {
      searchInputRef.current?.focus();
    }
  }, [searchDialogOpen]);

  function openSearchDialog() {
    setSearchDialogOpen(true);
    window.setTimeout(() => searchInputRef.current?.focus(), 0);
  }

  function closeSearchDialog() {
    setSearchDialogOpen(false);
    window.setTimeout(() => searchButtonRef.current?.focus(), 0);
  }

  // World content changed, so re-run the current query.
  function invalidateSearch() {
    setSearchRevision((revision) => revision + 1);
  }

  function resetSearch() {
    setSearchQuery("");
    setSearchState({ status: "idle" });
  }

  return {
    searchDialogOpen,
    setSearchDialogOpen,
    searchQuery,
    setSearchQuery,
    searchState,
    searchInputRef,
    searchButtonRef,
    openSearchDialog,
    closeSearchDialog,
    invalidateSearch,
    resetSearch
  };
}
