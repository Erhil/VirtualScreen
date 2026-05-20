import { describe, expect, it } from "vitest";

import {
  LLM_PROMPT_FORM_DEFINITIONS,
  buildLlmContextPreview,
  buildLlmFormPrompt,
  parseUntrustedDraftCardJson,
  type LlmPromptFormInput
} from "./llmForms";

describe("LLM prompt form helpers", () => {
  it("exposes the six MVP prompt forms in stable order", () => {
    expect(LLM_PROMPT_FORM_DEFINITIONS.map((form) => form.id)).toEqual([
      "summarize",
      "rumors",
      "handout-rewrite",
      "consequences",
      "draft-card",
      "recap"
    ]);
  });

  it("builds deterministic prompts from explicit fields and context only", () => {
    const input: LlmPromptFormInput = {
      formId: "rumors",
      subject: "River Gate",
      truth: "The captain closed the gate because the bridge is unsafe.",
      count: 3,
      tone: "Tavern whispers",
      context: [
        {
          label: "Active note",
          text: "The River Gate was sealed after the third bell."
        }
      ],
      contextCharLimit: 240
    };

    const first = buildLlmFormPrompt(input);
    const second = buildLlmFormPrompt(input);

    expect(first).toEqual(second);
    expect(first.formId).toBe("rumors");
    expect(first.prompt).toContain("Form: rumors");
    expect(first.prompt).toContain("Subject:\nRiver Gate");
    expect(first.prompt).toContain("Count:\n3");
    expect(first.prompt).toContain("Source: Active note");
    expect(first.prompt).toContain(
      "Use only the form fields and explicit context in this prompt."
    );
  });

  it("omits context sections when no explicit context is supplied", () => {
    const result = buildLlmFormPrompt({
      formId: "summarize",
      sourceTitle: "Council Notes",
      audience: "GM",
      focus: "betrayals"
    });

    expect(result.contextPreview.text).toBe("");
    expect(result.prompt).not.toContain("Explicit Context");
    expect(result.prompt).toContain("Source Title:\nCouncil Notes");
  });

  it("previews and trims explicit context without adding hidden reads", () => {
    const preview = buildLlmContextPreview(
      [
        { label: "Active note", text: "Alpha beta gamma." },
        {
          label: "Selected text",
          text: "One two three four five six seven eight nine ten."
        }
      ],
      96
    );

    expect(preview.text.length).toBeLessThanOrEqual(96);
    expect(preview.text).toContain("Source: Active note");
    expect(preview.text).toContain("...");
    expect(preview.trimmed).toBe(true);
    expect(preview.sourceCount).toBe(2);
    expect(preview.originalCharacters).toBeGreaterThan(preview.includedCharacters);
  });

  it("marks draft card prompts as untrusted JSON drafts", () => {
    const result = buildLlmFormPrompt({
      formId: "draft-card",
      cardKind: "npc",
      title: "Captain Ilyra",
      details: "Gate captain, formal voice, secretly worried about the bridge.",
      tone: "Grounded fantasy"
    });

    expect(result.outputKind).toBe("card-json");
    expect(result.prompt).toContain("Return only JSON");
    expect(result.prompt).toContain("Treat the output as an untrusted draft");
    expect(result.prompt).toContain('"kind": "npc"');
  });

  it("parses untrusted draft card JSON through the card normalizer", () => {
    const parsed = parseUntrustedDraftCardJson(
      JSON.stringify({
        kind: "npc",
        title: "Captain Ilyra",
        tags: ["ally"],
        sections: [{ title: "Core", fields: { Role: "Gate captain" } }]
      })
    );

    expect(parsed).toMatchObject({ ok: true });
    if (parsed.ok) {
      expect(parsed.card.sections[0].fields[0]).toMatchObject({
        label: "Role",
        value: "Gate captain"
      });
      expect(parsed.serialized).toContain('"kind": "npc"');
    }
  });

  it("rejects invalid or non-object draft card JSON", () => {
    expect(parseUntrustedDraftCardJson('{"kind":')).toEqual({
      ok: false,
      message: "Draft card JSON is invalid."
    });
    expect(parseUntrustedDraftCardJson('"not a card"')).toEqual({
      ok: false,
      message: "Draft card JSON must be an object."
    });
  });
});
