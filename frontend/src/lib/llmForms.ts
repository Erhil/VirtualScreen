import {
  normalizeCard,
  serializeCard,
  type StructuredCard
} from "./cards";

export const LLM_CONTEXT_CHAR_LIMIT = 4000;

export const LLM_PROMPT_FORM_DEFINITIONS = [
  {
    id: "summarize",
    titleKey: "llm.forms.summarize.title",
    descriptionKey: "llm.forms.summarize.description",
    outputKind: "markdown"
  },
  {
    id: "rumors",
    titleKey: "llm.forms.rumors.title",
    descriptionKey: "llm.forms.rumors.description",
    outputKind: "markdown"
  },
  {
    id: "handout-rewrite",
    titleKey: "llm.forms.handout-rewrite.title",
    descriptionKey: "llm.forms.handout-rewrite.description",
    outputKind: "markdown"
  },
  {
    id: "consequences",
    titleKey: "llm.forms.consequences.title",
    descriptionKey: "llm.forms.consequences.description",
    outputKind: "markdown"
  },
  {
    id: "draft-card",
    titleKey: "llm.forms.draft-card.title",
    descriptionKey: "llm.forms.draft-card.description",
    outputKind: "card-json"
  },
  {
    id: "recap",
    titleKey: "llm.forms.recap.title",
    descriptionKey: "llm.forms.recap.description",
    outputKind: "markdown"
  }
] as const;

export type LlmPromptFormDefinition = (typeof LLM_PROMPT_FORM_DEFINITIONS)[number];
export type LlmPromptFormId = LlmPromptFormDefinition["id"];
export type LlmPromptOutputKind = LlmPromptFormDefinition["outputKind"];
export type LlmDraftCardKind = "npc" | "location" | "item" | "card";

export type LlmPromptContextSource = {
  label: string;
  text: string;
};

type LlmBasePromptInput = {
  context?: readonly LlmPromptContextSource[];
  contextCharLimit?: number;
  tone?: string;
};

export type LlmSummarizePromptInput = LlmBasePromptInput & {
  formId: "summarize";
  sourceTitle?: string;
  audience?: string;
  focus?: string;
};

export type LlmRumorsPromptInput = LlmBasePromptInput & {
  formId: "rumors";
  subject?: string;
  truth?: string;
  count?: number;
};

export type LlmHandoutRewritePromptInput = LlmBasePromptInput & {
  formId: "handout-rewrite";
  sourceTitle?: string;
  sourceText?: string;
  audience?: string;
};

export type LlmConsequencesPromptInput = LlmBasePromptInput & {
  formId: "consequences";
  event?: string;
  actors?: string;
  timeframe?: string;
  stakes?: string;
};

export type LlmDraftCardPromptInput = LlmBasePromptInput & {
  formId: "draft-card";
  cardKind: LlmDraftCardKind;
  title?: string;
  details?: string;
  tags?: string;
};

export type LlmRecapPromptInput = LlmBasePromptInput & {
  formId: "recap";
  sessionTitle?: string;
  events?: string;
  openThreads?: string;
};

export type LlmPromptFormInput =
  | LlmSummarizePromptInput
  | LlmRumorsPromptInput
  | LlmHandoutRewritePromptInput
  | LlmConsequencesPromptInput
  | LlmDraftCardPromptInput
  | LlmRecapPromptInput;

export type LlmContextPreview = {
  text: string;
  sourceCount: number;
  originalCharacters: number;
  includedCharacters: number;
  trimmed: boolean;
};

export type LlmBuiltPrompt = {
  formId: LlmPromptFormId;
  outputKind: LlmPromptOutputKind;
  prompt: string;
  contextPreview: LlmContextPreview;
};

export type UntrustedDraftCardParseResult =
  | { ok: true; card: StructuredCard; serialized: string }
  | { ok: false; message: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function valueText(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  return String(value).trim();
}

function fieldBlock(label: string, value: string | number | boolean | null | undefined): string[] {
  const text = valueText(value);
  return text ? [`${label}:\n${text}`] : [];
}

function trimWithEllipsis(text: string, maxCharacters: number): string {
  if (text.length <= maxCharacters) {
    return text;
  }
  if (maxCharacters <= 0) {
    return "";
  }
  if (maxCharacters <= 3) {
    return ".".repeat(maxCharacters);
  }
  return `${text.slice(0, maxCharacters - 3).trimEnd()}...`;
}

export function buildLlmContextPreview(
  context: readonly LlmPromptContextSource[] = [],
  maxCharacters = LLM_CONTEXT_CHAR_LIMIT
): LlmContextPreview {
  const blocks = context.flatMap((source) => {
    const label = singleLine(source.label) || "Context";
    const text = source.text.trim();
    return text ? [`Source: ${label}\n${text}`] : [];
  });
  const fullText = blocks.join("\n\n");
  const text = trimWithEllipsis(fullText, Math.max(0, maxCharacters));

  return {
    text,
    sourceCount: blocks.length,
    originalCharacters: fullText.length,
    includedCharacters: text.length,
    trimmed: text.length < fullText.length
  };
}

function outputKindForForm(formId: LlmPromptFormId): LlmPromptOutputKind {
  return LLM_PROMPT_FORM_DEFINITIONS.find((form) => form.id === formId)?.outputKind ?? "markdown";
}

function taskForForm(input: LlmPromptFormInput): string {
  switch (input.formId) {
    case "summarize":
      return "Summarize the supplied material for table use. Preserve named facts and separate confirmed facts from uncertainties.";
    case "rumors":
      return "Create table-ready rumors about the subject. Mix true, false, and partial rumors only from supplied facts.";
    case "handout-rewrite":
      return "Rewrite the source as a player-facing handout. Preserve facts, remove GM-only framing, and keep it ready to paste into a note.";
    case "consequences":
      return "List plausible consequences of the event. Separate immediate effects, later fallout, and choices the players can notice.";
    case "draft-card":
      return "Draft a VirtualScreen card JSON object for the requested kind.";
    case "recap":
      return "Write a concise session recap with key events, unresolved threads, and next-session hooks.";
  }
}

function fieldsForForm(input: LlmPromptFormInput): string[] {
  switch (input.formId) {
    case "summarize":
      return [
        ...fieldBlock("Source Title", input.sourceTitle),
        ...fieldBlock("Audience", input.audience),
        ...fieldBlock("Focus", input.focus),
        ...fieldBlock("Tone", input.tone)
      ];
    case "rumors":
      return [
        ...fieldBlock("Subject", input.subject),
        ...fieldBlock("Truth", input.truth),
        ...fieldBlock("Count", input.count),
        ...fieldBlock("Tone", input.tone)
      ];
    case "handout-rewrite":
      return [
        ...fieldBlock("Source Title", input.sourceTitle),
        ...fieldBlock("Audience", input.audience),
        ...fieldBlock("Tone", input.tone),
        ...fieldBlock("Source Text", input.sourceText)
      ];
    case "consequences":
      return [
        ...fieldBlock("Event", input.event),
        ...fieldBlock("Actors", input.actors),
        ...fieldBlock("Timeframe", input.timeframe),
        ...fieldBlock("Stakes", input.stakes),
        ...fieldBlock("Tone", input.tone)
      ];
    case "draft-card":
      return [
        ...fieldBlock("Card Kind", input.cardKind),
        ...fieldBlock("Title", input.title),
        ...fieldBlock("Details", input.details),
        ...fieldBlock("Tags", input.tags),
        ...fieldBlock("Tone", input.tone)
      ];
    case "recap":
      return [
        ...fieldBlock("Session Title", input.sessionTitle),
        ...fieldBlock("Events", input.events),
        ...fieldBlock("Open Threads", input.openThreads),
        ...fieldBlock("Tone", input.tone)
      ];
  }
}

function outputInstructions(input: LlmPromptFormInput): string {
  if (input.formId !== "draft-card") {
    return "Return concise Markdown. Do not include hidden assumptions.";
  }

  const title = valueText(input.title) || "Untitled";
  return [
    "Return only JSON for a VirtualScreen card shaped like this:",
    "{",
    `  "kind": "${input.cardKind}",`,
    `  "title": "${title}",`,
    '  "tags": [],',
    '  "sections": [',
    '    { "title": "Core", "fields": { "Field": { "type": "text", "value": "" } } }',
    "  ]",
    "}",
    "Treat the output as an untrusted draft. Do not include scripts, HTML, or explanations."
  ].join("\n");
}

export function buildLlmFormPrompt(input: LlmPromptFormInput): LlmBuiltPrompt {
  const contextPreview = buildLlmContextPreview(
    input.context,
    input.contextCharLimit ?? LLM_CONTEXT_CHAR_LIMIT
  );
  const formFields = fieldsForForm(input);
  const lines = [
    "VirtualScreen prompt-form assistant.",
    `Form: ${input.formId}`,
    "",
    "Safety:",
    "- Use only the form fields and explicit context in this prompt.",
    "- Do not read hidden world files, search indexes, campaign notes, or external sources.",
    "- If a detail is not provided, say what is missing instead of inventing it.",
    "",
    "Task:",
    taskForForm(input),
    "",
    "Form Fields:",
    ...(formFields.length > 0 ? formFields : ["None provided."])
  ];

  if (contextPreview.text) {
    lines.push(
      "",
      `Explicit Context (${contextPreview.includedCharacters}/${contextPreview.originalCharacters} characters):`,
      contextPreview.text
    );
  }

  lines.push("", "Output:", outputInstructions(input));

  return {
    formId: input.formId,
    outputKind: outputKindForForm(input.formId),
    prompt: `${lines.join("\n")}\n`,
    contextPreview
  };
}

export function parseUntrustedDraftCardJson(
  content: string
): UntrustedDraftCardParseResult {
  let value: unknown;
  try {
    value = JSON.parse(content);
  } catch {
    return { ok: false, message: "Draft card JSON is invalid." };
  }

  if (!isRecord(value)) {
    return { ok: false, message: "Draft card JSON must be an object." };
  }

  const card = normalizeCard(value);
  return {
    ok: true,
    card,
    serialized: serializeCard(card)
  };
}
