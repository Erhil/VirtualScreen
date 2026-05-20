import { describe, expect, it } from "vitest";

import {
  CONTEXT_HELP_TOPICS,
  contextHelpKeys,
  helpContextForActionsTab,
  helpContextForMediaKind,
  helpContextForScreenTab,
  isHelpContextId,
  resolveContextHelpTopic
} from "./contextHelp";

describe("context help helpers", () => {
  it("recognizes stable help context ids", () => {
    expect(isHelpContextId("world-tree")).toBe(true);
    expect(isHelpContextId("screen-map")).toBe(true);
    expect(isHelpContextId("dice")).toBe(true);
    expect(isHelpContextId("assistant")).toBe(true);
    expect(isHelpContextId("missing")).toBe(false);
    expect(isHelpContextId(null)).toBe(false);
  });

  it("resolves explicit focused contexts before document fallback", () => {
    expect(
      resolveContextHelpTopic({
        activeMediaKind: "markdown",
        focusedContext: "audio"
      })?.id
    ).toBe("audio");
    expect(resolveContextHelpTopic({ focusedContext: "assistant" })?.id).toBe(
      "assistant"
    );
  });

  it("falls back to document media kind when focus has no context", () => {
    expect(helpContextForMediaKind("markdown")).toBe("document-markdown");
    expect(helpContextForMediaKind("csv")).toBe("document-csv");
    expect(helpContextForMediaKind("card")).toBe("document-card");
    expect(helpContextForMediaKind("script")).toBe("document-dms");
    expect(helpContextForMediaKind("image")).toBe("document-media");
    expect(helpContextForMediaKind("unsupported")).toBe("document-empty");
  });

  it("returns stable contexts for tool sub-tabs", () => {
    expect(helpContextForActionsTab("slots")).toBe("actions-slots");
    expect(helpContextForActionsTab("state")).toBe("actions-state");
    expect(helpContextForActionsTab("keys")).toBe("actions-keys");
    expect(helpContextForActionsTab("midi")).toBe("actions-midi");
    expect(helpContextForScreenTab("display")).toBe("screen-display");
    expect(helpContextForScreenTab("map")).toBe("screen-map");
  });

  it("handles empty workspace, unsupported files, and player screen", () => {
    expect(resolveContextHelpTopic({ activeMediaKind: null })?.id).toBe("document-empty");
    expect(resolveContextHelpTopic({ activeMediaKind: "unsupported" })?.id).toBe(
      "document-empty"
    );
    expect(resolveContextHelpTopic({ activeMediaKind: "markdown", isPlayerScreen: true })).toBeNull();
  });

  it("exposes translation keys for every topic", () => {
    expect(CONTEXT_HELP_TOPICS["document-markdown"].titleKey).toBe(
      "help.document-markdown.title"
    );
    expect(CONTEXT_HELP_TOPICS["document-markdown"].bodyKeys).toHaveLength(3);
    expect(CONTEXT_HELP_TOPICS["document-markdown"].shortcutKeys).toHaveLength(1);
    expect(contextHelpKeys()).toContain("help.assistant.title");
    expect(contextHelpKeys()).toContain("help.settings.shortcut1");
  });
});
