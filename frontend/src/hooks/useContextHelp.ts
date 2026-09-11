import { useEffect, useRef, useState } from "react";

import type { WorldMediaKind } from "../lib/api";
import { resolveContextHelpTopic, type ContextHelpTopic } from "../lib/contextHelp";

function helpContextFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof HTMLElement)) {
    return null;
  }
  return target.closest("[data-help-context]")?.getAttribute("data-help-context") ?? null;
}

// F1 context help: which topic is open, what F1 refers to (the last focused element that
// declares a help context, else the open document), and handing focus back on close.
export function useContextHelp(activeMediaKind: WorldMediaKind | null) {
  const [contextHelpTopic, setContextHelpTopic] = useState<ContextHelpTopic | null>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const lastContextRef = useRef<string | null>(null);

  function openContextHelp(context: string | null = null, restoreFocusTo?: HTMLElement | null) {
    const topic = resolveContextHelpTopic({
      activeMediaKind,
      focusedContext: context ?? lastContextRef.current
    });
    if (!topic) {
      return;
    }
    returnFocusRef.current =
      restoreFocusTo ??
      (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    setContextHelpTopic(topic);
  }

  function closeContextHelp() {
    setContextHelpTopic(null);
    window.requestAnimationFrame(() => returnFocusRef.current?.focus());
  }

  useEffect(() => {
    function handleFocusIn(event: FocusEvent) {
      const context = helpContextFromTarget(event.target);
      if (context) {
        lastContextRef.current = context;
      }
    }

    window.addEventListener("focusin", handleFocusIn);
    return () => window.removeEventListener("focusin", handleFocusIn);
  }, []);

  useEffect(() => {
    function handleHelpKeyDown(event: KeyboardEvent) {
      if (event.key !== "F1" || contextHelpTopic) {
        return;
      }
      const context = helpContextFromTarget(event.target);
      const topic = resolveContextHelpTopic({
        activeMediaKind,
        focusedContext: context ?? lastContextRef.current
      });
      if (!topic) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      returnFocusRef.current =
        event.target instanceof HTMLElement
          ? event.target
          : document.activeElement instanceof HTMLElement
            ? document.activeElement
            : null;
      setContextHelpTopic(topic);
    }

    window.addEventListener("keydown", handleHelpKeyDown, true);
    return () => window.removeEventListener("keydown", handleHelpKeyDown, true);
  }, [activeMediaKind, contextHelpTopic]);

  return { contextHelpTopic, openContextHelp, closeContextHelp };
}
