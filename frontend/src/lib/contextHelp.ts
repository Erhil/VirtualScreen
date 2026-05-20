import type { WorldMediaKind } from "./api";
import type { ActionsToolTabId, ScreenToolTabId } from "./toolPanel";

export const HELP_CONTEXT_IDS = [
  "world-tree",
  "document-empty",
  "document-markdown",
  "document-csv",
  "document-card",
  "document-dms",
  "document-media",
  "metadata",
  "screen-display",
  "screen-map",
  "audio",
  "dice",
  "assistant",
  "hp",
  "actions-slots",
  "actions-state",
  "actions-keys",
  "actions-midi",
  "scripts",
  "search",
  "capture",
  "prep-health",
  "path-picker",
  "settings"
] as const;

export type HelpContextId = (typeof HELP_CONTEXT_IDS)[number];
export type HelpTopicId = HelpContextId;

export type ContextHelpTopic = {
  id: HelpTopicId;
  titleKey: string;
  bodyKeys: string[];
  shortcutKeys: string[];
};

export type ContextHelpInput = {
  activeMediaKind?: WorldMediaKind | null;
  actionsTab?: ActionsToolTabId;
  focusedContext?: string | null;
  isPlayerScreen?: boolean;
  screenTab?: ScreenToolTabId;
};

const HELP_CONTEXT_SET = new Set<string>(HELP_CONTEXT_IDS);

export const CONTEXT_HELP_TOPICS: Record<HelpTopicId, ContextHelpTopic> =
  Object.fromEntries(
    HELP_CONTEXT_IDS.map((id) => [
      id,
      {
        id,
        titleKey: `help.${id}.title`,
        bodyKeys: [`help.${id}.body1`, `help.${id}.body2`, `help.${id}.body3`],
        shortcutKeys: [`help.${id}.shortcut1`]
      }
    ])
  ) as Record<HelpTopicId, ContextHelpTopic>;

export function isHelpContextId(value: string | null | undefined): value is HelpContextId {
  return Boolean(value && HELP_CONTEXT_SET.has(value));
}

export function helpContextForMediaKind(mediaKind: WorldMediaKind | null | undefined): HelpContextId {
  if (mediaKind === "markdown") {
    return "document-markdown";
  }
  if (mediaKind === "csv") {
    return "document-csv";
  }
  if (mediaKind === "card") {
    return "document-card";
  }
  if (mediaKind === "script") {
    return "document-dms";
  }
  if (mediaKind === "image" || mediaKind === "pdf" || mediaKind === "video" || mediaKind === "text") {
    return "document-media";
  }
  return "document-empty";
}

export function helpContextForActionsTab(tab: ActionsToolTabId): HelpContextId {
  if (tab === "state") {
    return "actions-state";
  }
  if (tab === "keys") {
    return "actions-keys";
  }
  if (tab === "midi") {
    return "actions-midi";
  }
  return "actions-slots";
}

export function helpContextForScreenTab(tab: ScreenToolTabId): HelpContextId {
  return tab === "map" ? "screen-map" : "screen-display";
}

export function resolveContextHelpTopic(input: ContextHelpInput): ContextHelpTopic | null {
  if (input.isPlayerScreen) {
    return null;
  }
  if (isHelpContextId(input.focusedContext)) {
    return CONTEXT_HELP_TOPICS[input.focusedContext];
  }
  return CONTEXT_HELP_TOPICS[helpContextForMediaKind(input.activeMediaKind)];
}

export function contextHelpKeys(): string[] {
  return Object.values(CONTEXT_HELP_TOPICS).flatMap((topic) => [
    topic.titleKey,
    ...topic.bodyKeys,
    ...topic.shortcutKeys
  ]);
}
