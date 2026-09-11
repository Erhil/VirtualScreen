import { useState } from "react";
import { fetchPageBacklinks, fetchPageLinks, fetchWorldFile, type PageLink } from "../lib/api";
import { canHavePageLinks } from "../components/documents/documentFiles";
import { linkToOpenTab } from "../lib/links";
import { type OpenTab } from "../lib/tabs";
import { type PeekState } from "../components/documents/PeekDialog";

// The peek dialog: a lightweight preview of a file or link without opening a tab for it.
export function usePeek() {
  const [peekState, setPeekState] = useState<PeekState>({ open: false });

  function openPeekTab(tab: OpenTab) {
    const peekTab = tab;
    setPeekState({
      open: true,
      tab: peekTab,
      fileState: canHavePageLinks(peekTab) ? { status: "loading" } : { status: "idle" },
      linksState: { status: "idle" }
    });
    if (!canHavePageLinks(peekTab)) {
      return;
    }
    Promise.all([
      fetchWorldFile(peekTab.path),
      fetchPageLinks(peekTab.path),
      fetchPageBacklinks(peekTab.path)
    ])
      .then(([file, outgoing, backlinks]) => {
        setPeekState((current) =>
          current.open && current.tab.path === peekTab.path
            ? {
                open: true,
                tab: peekTab,
                fileState: { status: "ready", file },
                linksState: { status: "ready", outgoing, backlinks }
              }
            : current
        );
      })
      .catch((error: unknown) => {
        setPeekState((current) =>
          current.open && current.tab.path === peekTab.path
            ? {
                open: true,
                tab: peekTab,
                fileState: {
                  status: "error",
                  message: error instanceof Error ? error.message : "Could not load preview."
                },
                linksState: { status: "idle" }
              }
            : current
        );
      });
  }

  function openLinkPeek(link: PageLink) {
    const tab = linkToOpenTab(link);
    if (tab) {
      openPeekTab(tab);
    }
  }

  function closePeek() {
    setPeekState({ open: false });
  }

  return {
    peekState,
    openPeekTab,
    openLinkPeek,
    closePeek
  };
}
