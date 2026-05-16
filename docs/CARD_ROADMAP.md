# Card Roadmap

This roadmap stages future `.cs` card improvements without turning VirtualScreen into a
rules engine. Cards should remain editable world files and useful daily-DM material.

## Current Card Model

- `.cs` cards are normal JSON files in the world.
- Built-in app templates create NPC, monster, character, spell, item, location,
  reference, and custom cards.
- The Card Creator opens from workspace controls and folder `+` menus.
- DMS scripts can create cards with `card_template()` and `create_card()`.
- Card values support plain strings, typed values, world links, data-only tables, and
  safe display-only computed fields.
- V2 card layouts are implemented for character sheets, stat blocks, compact reference
  cards, and data-only tables through `layout`, typed field values, and `rows`.

External tools can already create or fill cards by writing valid `.cs` JSON files
directly into the world. World-local Card Creator templates now live under
`.virtualscreen/card-templates/*.json`.

## Stage 1: World-Local Card Templates V1

Status: implemented. A DM can add and maintain templates with an external editor or script.
These files are world-local configuration, not ordinary campaign handouts: they stay
hidden from the normal world tree and search, but can be edited directly on disk by
external tools.

Proposed storage:

```text
.virtualscreen/card-templates/
  npc-contact.json
  dnd5e-basic-character.json
  spell-reference.json
```

Proposed template shape:

```json
{
  "id": "npc-contact",
  "name": "NPC Contact",
  "kind": "npc",
  "description": "Compact NPC card for live table use.",
  "card": {
    "kind": "npc",
    "title": "{{title}}",
    "tags": ["npc"],
    "sections": [
      {
        "title": "Core",
        "fields": {
          "Role": "",
          "Location": "",
          "Need": ""
        }
      }
    ]
  }
}
```

Rules:
- Templates are hidden from normal world tree/search.
- Templates are ordinary JSON files that external editors, sync tools, or generators can
  update without going through VirtualScreen UI.
- Built-in templates remain as fallbacks.
- Card Creator lists built-in and world-local templates together.
- Invalid template files are ignored with a clear Prep Check warning later.
- World-local templates may include safe display-only computed fields.

Implemented coverage:
- Backend tests for listing valid templates and ignoring invalid/traversal paths.
- Frontend tests for template selection, title substitution, and validation.
- Playwright test creating a card from an externally added template.

## Stage 2: Complex Card Layout V2

Status: implemented. V2 supports character sheets, stat blocks, compact reference cards, and quick tables
without system-specific automation.

Backward-compatible card extension:

```json
{
  "kind": "character",
  "title": "Mira",
  "tags": ["pc"],
  "sections": [
    {
      "title": "Abilities",
      "layout": "grid",
      "fields": {
        "STR": { "type": "number", "value": 12 },
        "DEX": { "type": "number", "value": 14 },
        "WIS": { "type": "number", "value": 16 }
      }
    },
    {
      "title": "Attacks",
      "layout": "table",
      "rows": [
        { "Name": "Saber", "Bonus": "+5", "Damage": "1d8+3" }
      ]
    }
  ]
}
```

Rules:
- Existing V1 string-field cards keep working.
- Supported field types stay simple: text, number, boolean, select, long text, world link.
- Repeating table rows are data-only; no inventory engine or spell slot engine.
- Card editor stays compact and generic.

Implemented coverage:
- Parser/serializer tests for old and new card shapes.
- Viewer/editor tests for typed fields and table sections.
- Playwright tests for editing a character sheet and monster stat card.

## Stage 3: Safe Computed Fields V1

Status: implemented. Cards can show useful derived values such as ability bonuses
without arbitrary code or file mutation.

Example:

```json
{
  "sections": [
    {
      "title": "Abilities",
      "fields": {
        "WIS": { "type": "number", "value": 16 },
        "WIS Bonus": { "type": "computed", "formula": "ability_mod(WIS)" }
      }
    }
  ]
}
```

Rules:
- Computed fields are display-only derived values.
- Source fields remain ordinary editable values.
- Formula language is tiny and whitelisted: numeric literals, identifiers,
  parentheses, arithmetic, `ability_mod`, `floor`, `ceil`, `min`, `max`, and `sum`.
- Boolean fields are numeric flags in formulas: `true` is `1`, `false` is `0`.
- Numeric literals are first-class formula values, so formulas like `STR + 3` work.
- Skill-flag formulas like `ability_mod(WIS) + Perception_flag * 3` are supported.
- No Python, JavaScript, imports, filesystem, network, DMS execution, or side effects.
- Invalid formulas show a compact error in the field instead of breaking the card.

Implemented coverage:
- Pure evaluator tests for whitelisted helpers and rejected expressions.
- Card rendering tests for computed values and formula errors.
- Playwright tests for `WIS = 16` displaying `+3`, editing `WIS` to `8`, boolean
  flag formulas, invalid formula errors, Card Creator templates, DMS-created cards,
  search, peek, and player-screen display.

## Explicit Non-Goals

- Foundry-style actor automation.
- System-specific rules engines.
- Arbitrary script execution inside cards.
- Silent file mutation from formulas.
- External API calls from card formulas.
