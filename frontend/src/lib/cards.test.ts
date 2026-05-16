import { describe, expect, it } from "vitest";

import {
  addCardField,
  addCardSection,
  addCardTag,
  addCardTableColumn,
  addCardTableRow,
  addTypedCardField,
  builtInCardTemplates,
  cardTemplate,
  cardTemplateOptions,
  computedCardFieldPreview,
  defaultCardPath,
  duplicateCardField,
  duplicateCardSection,
  duplicateCardTableRow,
  evaluateCardField,
  evaluateCardFormula,
  mergeCardTemplateCatalogs,
  normalizeCardTemplateCatalog,
  parseCard,
  removeCardField,
  removeCardSection,
  removeCardTag,
  removeCardTableColumn,
  removeCardTableRow,
  renderCardTemplate,
  reorderCardField,
  reorderCardSection,
  reorderCardTableRow,
  serializeCard,
  setCardSectionLayout,
  updateCardTableCell,
  updateCardField,
  updateCardKind,
  updateCardSection,
  updateCardTitle
} from "./cards";

describe("card helpers", () => {
  it("exposes built-in card template catalog data as the frontend fallback", () => {
    expect(builtInCardTemplates.map((template) => template.id)).toEqual([
      "npc",
      "monster",
      "character",
      "spell",
      "item",
      "location",
      "reference",
      "custom"
    ]);
    expect(builtInCardTemplates.every((template) => template.source === "built_in")).toBe(
      true
    );
    expect(builtInCardTemplates[0]).toMatchObject({
      id: "npc",
      name: "NPC",
      kind: "npc",
      card: {
        kind: "npc",
        title: "{{title}}",
        tags: []
      }
    });
  });

  it("builds template cards for supported card kinds", () => {
    expect(cardTemplateOptions).toEqual([
      "npc",
      "monster",
      "character",
      "spell",
      "item",
      "location",
      "reference",
      "custom"
    ]);

    for (const kind of cardTemplateOptions) {
      const template = cardTemplate(kind, "Captain Mira");
      const parsed = parseCard(serializeCard(template));

      expect(parsed).toEqual(template);
      expect(parsed).toMatchObject({
        title: "Captain Mira",
        kind,
        tags: []
      });
      expect(parsed.sections.length).toBeGreaterThan(0);
    }
  });

  it("renders {{title}} recursively in template string values", () => {
    const card = renderCardTemplate(
      {
        id: "npc-contact",
        name: "NPC Contact",
        kind: "npc",
        description: "Creates {{title}} contacts",
        source: "world",
        card: {
          title: "{{title}}",
          kind: "npc",
          tags: ["npc", "{{title}}"],
          sections: [
            {
              title: "{{title}} Core",
              layout: "grid",
              fields: [
                { label: "Name", type: "text", value: "{{title}}" },
                {
                  label: "{{title}} Link",
                  type: "world_link",
                  value: "[[NPCs/{{title}}]]"
                },
                { label: "{{title}} Hook", type: "long_text", value: "Find **{{title}}** at dusk" }
              ],
              rows: [{ Name: "{{title}}", Note: "Bring {{title}} home" }]
            }
          ]
        }
      },
      "Captain Mira"
    );

    expect(card).toEqual({
      title: "Captain Mira",
      kind: "npc",
      tags: ["npc", "Captain Mira"],
      sections: [
        {
          title: "Captain Mira Core",
          layout: "grid",
          fields: [
            { label: "Name", type: "text", value: "Captain Mira" },
            {
              label: "Captain Mira Link",
              type: "world_link",
              value: "[[NPCs/Captain Mira]]"
            },
            {
              label: "Captain Mira Hook",
              type: "long_text",
              value: "Find **Captain Mira** at dusk"
            }
          ],
          rows: [{ Name: "Captain Mira", Note: "Bring Captain Mira home" }]
        }
      ]
    });
  });

  it("merges world templates over built-ins by id with stable ordering", () => {
    const catalog = mergeCardTemplateCatalogs({
      templates: [
        {
          id: "spell",
          name: "World Spell",
          kind: "spell",
          source: "world",
          card: {
            kind: "spell",
            title: "{{title}}",
            tags: ["world-spell"],
            sections: [{ title: "World", fields: [{ label: "Source", value: "world" }] }]
          }
        },
        {
          id: "faction",
          name: "Faction",
          kind: "reference",
          source: "world",
          card: {
            kind: "reference",
            title: "{{title}}",
            tags: ["faction"],
            sections: []
          }
        }
      ],
      warnings: [{ source: "world", message: "Ignored duplicate" }]
    });

    expect(catalog.templates.map((template) => template.id)).toEqual([
      "npc",
      "monster",
      "character",
      "spell",
      "item",
      "location",
      "reference",
      "custom",
      "faction"
    ]);
    expect(catalog.templates[3]).toMatchObject({
      id: "spell",
      name: "World Spell",
      source: "world"
    });
    expect(catalog.warnings).toEqual([{ source: "world", message: "Ignored duplicate" }]);
  });

  it("normalizes invalid or missing catalogs back to built-ins with warnings", () => {
    expect(normalizeCardTemplateCatalog(null).templates).toEqual(builtInCardTemplates);

    const catalog = normalizeCardTemplateCatalog({
      templates: [
        {
          id: "npc-contact",
          name: "NPC Contact",
          kind: "npc",
          source: "world",
          card: {
            kind: "npc",
            title: "{{title}}",
            tags: ["npc"],
            sections: [{ title: "Core", fields: { Role: "" } }]
          }
        },
        { id: "", name: "Broken", card: {} },
        "not a template"
      ],
      warnings: [{ source: "world", message: "Backend warning" }]
    });

    expect(catalog.templates.map((template) => template.id)).toEqual([
      "npc",
      "monster",
      "character",
      "spell",
      "item",
      "location",
      "reference",
      "custom",
      "npc-contact"
    ]);
    expect(catalog.templates.at(-1)).toMatchObject({
      id: "npc-contact",
      source: "world",
      card: {
        sections: [{ title: "Core", fields: [{ label: "Role", value: "" }] }]
      }
    });
    expect(catalog.warnings.map((warning) => warning.message)).toEqual([
      "Backend warning",
      "Template is missing an id.",
      "Template is not an object."
    ]);
  });

  it("falls back to built-ins when a catalog has no valid templates", () => {
    const catalog = normalizeCardTemplateCatalog({
      templates: [{ id: "broken", name: "", card: null }]
    });

    expect(catalog.templates).toEqual(builtInCardTemplates);
    expect(catalog.warnings.map((warning) => warning.message)).toContain(
      "No valid world templates found; using built-in templates."
    );
  });

  it("generates stable default card paths", () => {
    expect(defaultCardPath("Cards", "Captain Mira")).toBe("Cards/Captain Mira.cs");
    expect(defaultCardPath("Cards/", "Captain Mira")).toBe("Cards/Captain Mira.cs");
    expect(defaultCardPath("", "Captain Mira")).toBe("Captain Mira.cs");
    expect(defaultCardPath("Cards", "  Captain Mira  ")).toBe("Cards/Captain Mira.cs");
  });

  it("normalizes missing arrays, sections, and fields when parsing", () => {
    expect(parseCard('{"title":"Captain Ilyra","kind":"npc"}')).toEqual({
      title: "Captain Ilyra",
      kind: "npc",
      tags: [],
      sections: []
    });

    expect(
      parseCard(
        '{"title":"Captain Ilyra","type":"npc","tags":["ally"],"sections":[{"title":"Hooks","fields":{"Voice":"calm"}}]}'
      )
    ).toEqual({
      title: "Captain Ilyra",
      kind: "npc",
      tags: ["ally"],
      sections: [{ title: "Hooks", fields: [{ label: "Voice", type: "text", value: "calm" }] }]
    });

    expect(
      parseCard(
        '{"title":"Moonlit Key","kind":"Clue","fields":[{"name":"Owner","value":"[[NPCs/Captain Ilyra]]"}]}'
      )
    ).toEqual({
      title: "Moonlit Key",
      kind: "Clue",
      tags: [],
      sections: [
        {
          title: "Core",
          fields: [{ label: "Owner", type: "text", value: "[[NPCs/Captain Ilyra]]" }]
        }
      ]
    });
  });

  it("normalizes V2 typed fields and tables into the editor model", () => {
    expect(
      parseCard(
        JSON.stringify({
          kind: "character",
          title: "Mira",
          tags: ["pc"],
          sections: [
            {
              title: "Abilities",
              layout: "grid",
              fields: {
                STR: { type: "number", value: 12 },
                DEX: { type: "number", value: 14 },
                Favorite: { type: "world_link", value: "[[NPCs/Captain Ilyra]]" },
                Notes: { type: "long_text", value: "Met at [[Places/Docks]]" },
                "WIS Bonus": { type: "computed", formula: "ability_mod(WIS)" }
              }
            },
            {
              title: "Attacks",
              layout: "table",
              rows: [{ Name: "Saber", Bonus: "+5", Damage: "1d8+3" }]
            }
          ]
        })
      )
    ).toEqual({
      title: "Mira",
      kind: "character",
      tags: ["pc"],
      sections: [
        {
          title: "Abilities",
          layout: "grid",
          fields: [
            { label: "STR", type: "number", value: "12" },
            { label: "DEX", type: "number", value: "14" },
            { label: "Favorite", type: "world_link", value: "[[NPCs/Captain Ilyra]]" },
            { label: "Notes", type: "long_text", value: "Met at [[Places/Docks]]" },
            { label: "WIS Bonus", type: "computed", value: "", formula: "ability_mod(WIS)" }
          ]
        },
        {
          title: "Attacks",
          layout: "table",
          fields: [],
          columns: ["Name", "Bonus", "Damage"],
          rows: [{ Name: "Saber", Bonus: "+5", Damage: "1d8+3" }]
        }
      ]
    });
  });

  it("serializes cards as stable pretty JSON", () => {
    expect(
      serializeCard({
        title: "Captain Ilyra",
        kind: "npc",
        tags: ["ally"],
        sections: [
          {
            title: "Hooks",
            fields: [{ label: "Voice", value: "calm and formal" }]
          }
        ]
      })
    ).toBe(
      [
        "{",
        '  "kind": "npc",',
        '  "title": "Captain Ilyra",',
        '  "tags": [',
        '    "ally"',
        "  ],",
        '  "sections": [',
        "    {",
        '      "title": "Hooks",',
        '      "fields": {',
        '        "Voice": {',
        '          "type": "text",',
        '          "value": "calm and formal"',
        "        }",
        "      }",
        "    }",
        "  ]",
        "}",
        ""
      ].join("\n")
    );
  });

  it("serializes V2 typed fields and table rows as stable pretty JSON", () => {
    const card = parseCard(
      JSON.stringify({
        title: "Mira",
        kind: "character",
        tags: ["pc"],
        sections: [
          {
            title: "Abilities",
            layout: "grid",
            fields: {
              STR: { type: "number", value: 12 },
              "Has Shield": { type: "boolean", value: true },
              Contact: { type: "world_link", value: "[[NPCs/Captain Ilyra]]" },
              Notes: { type: "long_text", value: "Met at [[Places/Docks]]" }
            }
          },
          {
            title: "Attacks",
            layout: "table",
            rows: [{ Name: "Saber", Bonus: "+5" }]
          }
        ]
      })
    );

    expect(serializeCard(card)).toBe(
      [
        "{",
        '  "kind": "character",',
        '  "title": "Mira",',
        '  "tags": [',
        '    "pc"',
        "  ],",
        '  "sections": [',
        "    {",
        '      "title": "Abilities",',
        '      "layout": "grid",',
        '      "fields": {',
        '        "STR": {',
        '          "type": "number",',
        '          "value": 12',
        "        },",
        '        "Has Shield": {',
        '          "type": "boolean",',
        '          "value": true',
        "        },",
        '        "Contact": {',
        '          "type": "world_link",',
        '          "value": "[[NPCs/Captain Ilyra]]"',
        "        },",
        '        "Notes": {',
        '          "type": "long_text",',
        '          "value": "Met at [[Places/Docks]]"',
        "        }",
        "      }",
        "    },",
        "    {",
        '      "title": "Attacks",',
        '      "layout": "table",',
        '      "rows": [',
        "        {",
        '          "Name": "Saber",',
        '          "Bonus": "+5"',
        "        }",
        "      ]",
        "    }",
        "  ]",
        "}",
        ""
      ].join("\n")
    );
  });

  it("preserves computed fields while normalizing and serializing cards", () => {
    const card = parseCard(
      JSON.stringify({
        title: "Mira",
        kind: "character",
        tags: ["pc"],
        sections: [
          {
            title: "Abilities",
            layout: "grid",
            fields: {
              WIS: { type: "number", value: 16 },
              Perception_flag: { type: "boolean", value: true },
              Perception_bonus: {
                type: "computed",
                formula: "ability_mod(WIS) + Perception_flag * 3",
                format: "signed"
              }
            }
          }
        ]
      })
    );

    expect(card.sections[0].fields).toEqual([
      { label: "WIS", type: "number", value: "16" },
      { label: "Perception_flag", type: "boolean", value: "true" },
      {
        label: "Perception_bonus",
        type: "computed",
        value: "",
        formula: "ability_mod(WIS) + Perception_flag * 3",
        format: "signed"
      }
    ]);
    expect(serializeCard(card)).toContain('"type": "computed"');
    expect(serializeCard(card)).toContain('"formula": "ability_mod(WIS) + Perception_flag * 3"');
    expect(serializeCard(card)).toContain('"format": "signed"');
  });

  it("evaluates safe computed formulas with numeric literals, fields, and boolean flags", () => {
    const card = parseCard(
      JSON.stringify({
        title: "Mira",
        kind: "character",
        tags: [],
        sections: [
          {
            title: "Abilities",
            fields: {
              STR: { type: "number", value: 12 },
              WIS: { type: "number", value: 16 },
              Perception_flag: { type: "boolean", value: true },
              Sneak_flag: { type: "boolean", value: false },
              WIS_bonus: { type: "computed", formula: "ability_mod(WIS)", format: "signed" }
            }
          }
        ]
      })
    );

    expect(evaluateCardFormula("STR + 3", card)).toMatchObject({
      ok: true,
      value: 15,
      display: "15"
    });
    expect(evaluateCardFormula("ability_mod(WIS)", card)).toMatchObject({
      ok: true,
      value: 3,
      display: "3"
    });
    expect(evaluateCardFormula("ability_mod(WIS) + Perception_flag * 3", card)).toMatchObject({
      ok: true,
      value: 6,
      display: "6"
    });
    expect(evaluateCardFormula("ability_mod(WIS) + Sneak_flag * 3", card)).toMatchObject({
      ok: true,
      value: 3,
      display: "3"
    });
    expect(evaluateCardFormula("min(10, STR) + floor(2.9) * -2", card)).toMatchObject({
      ok: true,
      value: 6,
      display: "6"
    });
    expect(evaluateCardField(card, card.sections[0].fields[4])).toMatchObject({
      ok: true,
      value: 3,
      display: "+3"
    });
  });

  it("returns compact errors for unsafe or invalid computed formulas", () => {
    const card = parseCard(
      JSON.stringify({
        title: "Mira",
        kind: "character",
        tags: [],
        sections: [
          {
            title: "Core",
            fields: {
              STR: { type: "number", value: 12 },
              Name: { type: "text", value: "Mira" },
              Duplicate: { type: "number", value: 1 },
              Computed: { type: "computed", formula: "STR + 1" }
            }
          },
          {
            title: "Other",
            fields: {
              Duplicate: { type: "number", value: 2 }
            }
          }
        ]
      })
    );

    expect(evaluateCardFormula("Missing + 1", card)).toMatchObject({
      ok: false,
      message: "Unknown field Missing."
    });
    expect(evaluateCardFormula("Name + 1", card)).toMatchObject({
      ok: false,
      message: "Field Name is not numeric."
    });
    expect(evaluateCardFormula("Computed + 1", card)).toMatchObject({
      ok: false,
      message: "Computed field Computed cannot be used in formulas."
    });
    expect(evaluateCardFormula("Duplicate + 1", card)).toMatchObject({
      ok: false,
      message: "Field Duplicate is duplicated."
    });
    expect(evaluateCardFormula("STR / 0", card)).toMatchObject({
      ok: false,
      message: "Division by zero."
    });
    expect(evaluateCardFormula("alert(1)", card)).toMatchObject({
      ok: false,
      message: "Unknown function alert."
    });
  });

  it("updates card title, kind, tags, sections, and fields immutably", () => {
    const card = parseCard('{"title":"Old","kind":"npc"}');
    const titled = updateCardTitle(card, "Captain Ilyra");
    const typed = updateCardKind(titled, "ally");
    const tagged = addCardTag(addCardTag(typed, "city-watch"), "ally");
    const deduped = addCardTag(tagged, "ally");
    const withSection = updateCardSection(addCardSection(deduped), 0, {
      title: "Hooks"
    });
    const withField = updateCardField(addCardField(withSection, 0), 0, 0, {
      label: "Voice",
      value: "calm and formal"
    });

    expect(card).toEqual({ title: "Old", kind: "npc", tags: [], sections: [] });
    expect(deduped.tags).toEqual(["city-watch", "ally"]);
    expect(withField).toEqual({
      title: "Captain Ilyra",
      kind: "ally",
      tags: ["city-watch", "ally"],
      sections: [
        {
          title: "Hooks",
          fields: [{ label: "Voice", type: "text", value: "calm and formal" }]
        }
      ]
    });
    expect(removeCardField(withField, 0, 0).sections[0].fields).toEqual([]);
    expect(removeCardSection(withField, 0).sections).toEqual([]);
    expect(removeCardTag(withField, "ally").tags).toEqual(["city-watch"]);
  });

  it("adds, updates, and removes typed fields immutably", () => {
    const card = updateCardSection(addCardSection(parseCard('{"title":"Mira","kind":"npc"}')), 0, {
      title: "Core"
    });
    const withField = addTypedCardField(card, 0, {
      label: "Level",
      type: "number",
      value: "3"
    });
    const updated = updateCardField(withField, 0, 0, {
      type: "select",
      value: "veteran",
      options: ["novice", "veteran"]
    });

    expect(card.sections[0].fields).toEqual([]);
    expect(updated.sections[0].fields).toEqual([
      { label: "Level", type: "select", value: "veteran", options: ["novice", "veteran"] }
    ]);
    expect(removeCardField(updated, 0, 0).sections[0].fields).toEqual([]);
  });

  it("duplicates and reorders sections immutably", () => {
    const card = parseCard(
      JSON.stringify({
        title: "Mira",
        kind: "character",
        tags: [],
        sections: [
          { title: "Core", fields: { Role: "Scout" } },
          { title: "Notes", fields: { Hook: "Map" } },
          { title: "Gear", fields: { Weapon: "Saber" } }
        ]
      })
    );

    const duplicated = duplicateCardSection(card, 0);
    const reordered = reorderCardSection(duplicated, 3, 1);

    expect(card.sections.map((section) => section.title)).toEqual(["Core", "Notes", "Gear"]);
    expect(duplicated.sections.map((section) => section.title)).toEqual([
      "Core",
      "Core",
      "Notes",
      "Gear"
    ]);
    expect(duplicated.sections[1]).toEqual(card.sections[0]);
    expect(duplicated.sections[1]).not.toBe(card.sections[0]);
    expect(reordered.sections.map((section) => section.title)).toEqual([
      "Core",
      "Gear",
      "Core",
      "Notes"
    ]);
    expect(reorderCardSection(card, -1, 1)).toBe(card);
    expect(duplicateCardSection(card, 99)).toBe(card);
  });

  it("duplicates and reorders fields inside list and grid sections immutably", () => {
    const card = parseCard(
      JSON.stringify({
        title: "Mira",
        kind: "character",
        tags: [],
        sections: [
          { title: "Core", fields: { Role: "Scout", Voice: "Calm" } },
          {
            title: "Abilities",
            layout: "grid",
            fields: {
              STR: { type: "number", value: 12 },
              DEX: { type: "number", value: 14 }
            }
          }
        ]
      })
    );

    const duplicatedList = duplicateCardField(card, 0, 0);
    const reorderedGrid = reorderCardField(card, 1, 1, 0);

    expect(card.sections[0].fields.map((field) => field.label)).toEqual(["Role", "Voice"]);
    expect(duplicatedList.sections[0].fields.map((field) => field.label)).toEqual([
      "Role",
      "Role",
      "Voice"
    ]);
    expect(duplicatedList.sections[0].fields[1]).toEqual(card.sections[0].fields[0]);
    expect(duplicatedList.sections[0].fields[1]).not.toBe(card.sections[0].fields[0]);
    expect(reorderedGrid.sections[1].fields.map((field) => field.label)).toEqual(["DEX", "STR"]);
    expect(duplicateCardField(card, 99, 0)).toBe(card);
    expect(reorderCardField(card, 0, 0, 99)).toBe(card);
  });

  it("adds, updates, and removes table columns and rows immutably", () => {
    const card = updateCardSection(addCardSection(parseCard('{"title":"Mira","kind":"npc"}')), 0, {
      title: "Attacks"
    });
    const table = setCardSectionLayout(card, 0, "table");
    const withName = addCardTableColumn(table, 0, "Name");
    const withBonus = addCardTableColumn(withName, 0, "Bonus");
    const withRow = addCardTableRow(withBonus, 0);
    const updated = updateCardTableCell(withRow, 0, 0, "Name", "Saber");
    const removedColumn = removeCardTableColumn(updated, 0, "Bonus");

    expect(card.sections[0]).toEqual({ title: "Attacks", fields: [] });
    expect(updated.sections[0]).toEqual({
      title: "Attacks",
      layout: "table",
      fields: [],
      columns: ["Name", "Bonus"],
      rows: [{ Name: "Saber", Bonus: "" }]
    });
    expect(removedColumn.sections[0]).toEqual({
      title: "Attacks",
      layout: "table",
      fields: [],
      columns: ["Name"],
      rows: [{ Name: "Saber" }]
    });
    expect(removeCardTableRow(updated, 0, 0).sections[0].rows).toEqual([]);
  });

  it("duplicates and reorders table rows immutably", () => {
    const card = parseCard(
      JSON.stringify({
        title: "Mira",
        kind: "npc",
        tags: [],
        sections: [
          {
            title: "Attacks",
            layout: "table",
            rows: [
              { Name: "Saber", Bonus: "+5" },
              { Name: "Dagger", Bonus: "+4" },
              { Name: "Bow", Bonus: "+3" }
            ]
          }
        ]
      })
    );

    const duplicated = duplicateCardTableRow(card, 0, 1);
    const reordered = reorderCardTableRow(duplicated, 0, 3, 0);

    expect(card.sections[0].rows?.map((row) => row.Name)).toEqual(["Saber", "Dagger", "Bow"]);
    expect(duplicated.sections[0].rows?.map((row) => row.Name)).toEqual([
      "Saber",
      "Dagger",
      "Dagger",
      "Bow"
    ]);
    expect(duplicated.sections[0].rows?.[2]).toEqual(card.sections[0].rows?.[1]);
    expect(duplicated.sections[0].rows?.[2]).not.toBe(card.sections[0].rows?.[1]);
    expect(reordered.sections[0].rows?.map((row) => row.Name)).toEqual([
      "Bow",
      "Saber",
      "Dagger",
      "Dagger"
    ]);
    expect(duplicateCardTableRow(card, 0, -1)).toBe(card);
    expect(reorderCardTableRow(card, 0, 0, 9)).toBe(card);
  });

  it("previews computed fields with the existing formula evaluator", () => {
    const card = parseCard(
      JSON.stringify({
        title: "Mira",
        kind: "character",
        tags: [],
        sections: [
          {
            title: "Abilities",
            fields: {
              WIS: { type: "number", value: 16 },
              Perception_bonus: {
                type: "computed",
                formula: "ability_mod(WIS)",
                format: "signed"
              },
              Name: { type: "text", value: "Mira" }
            }
          }
        ]
      })
    );

    expect(computedCardFieldPreview(card, card.sections[0].fields[1])).toEqual("+3");
    expect(computedCardFieldPreview(card, card.sections[0].fields[2])).toBe("");
    expect(
      computedCardFieldPreview(card, {
        label: "Broken",
        type: "computed",
        value: "",
        formula: "Name + 1"
      })
    ).toBe("Field Name is not numeric.");
  });
});
