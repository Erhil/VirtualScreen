# DMS Cookbook

DMS scripts are trusted local `.dms` files stored in the active world. They run from the
editor toolbar, Scripts tool, or a Run script fast slot. Save scripts before running them;
dirty drafts are not executed.

## Inputs

```python
schema = {
    "name": "text",
    "level": {"type": "number", "default": 3},
    "tone": {"type": "select", "options": ["warm", "tense"], "default": "warm"},
    "secret": {"type": "boolean", "default": False},
}
values = form(schema)
```

Use `choose_file()` when the script needs a world path selected by the DM:

```python
target = choose_file("Pick a clue", kind="markdown", folder="Notes")
render_md(f"# Selected\n\n{target}")
```

## Tables And Dice

```python
event = table("Tables/random-events.csv")
roll_total = roll("1d20+3")
render_md(f"# Event\n\n- Event: {event['event']}\n- Roll: {roll_total}")
```

`table()` reads a CSV and returns one row as a dict. It only accepts safe world CSV paths.

## Rendering Temporary Outputs

```python
render_md("# NPC\n\nCaptain Mira waits by the river gate.")
render_csv("result,event\n1,A courier arrives\n")
```

Rendered output opens as a temporary tab. Use Save As in the editor toolbar to turn it
into a real Markdown or CSV file in the world.

## Screen And Audio Control

```python
screen_fs("Media/sample-map.svg")
screen_pu("Notes/letter.md")
audio_play(".music/effects/broken-glass.wav")
audio_play(".music/ambient/Tavern/tavern-crowd.wav", bus="ambient", volume=60)
```

Screen commands update `/screen`. Audio plays locally in the DM browser; the default bus is
`effect`.

## Note Writes

```python
create_note("Notes/generated-session.md", "# Generated Session\n\nA clue appears.")
append_note("README.md", "\n\nDMS appended note")
```

Writes are deferred until the script finishes successfully. Failed, cancelled, timed-out,
or form-waiting scripts do not write files. Appends create backups and refresh the index.

## Card Writes

```python
card = card_template("npc", "Captain Mira")
card["tags"].append("harbor")
card["sections"][0]["fields"]["Hook"] = "Carries the moonlit ledger."
create_card("Cards/Captain Mira.cs", card)
```

`card_template(kind, title)` returns editable card JSON for built-in template ids such
as `npc`, `monster`, `character`, `spell`, `item`, `location`, `reference`, or `custom`,
and for world-local template ids from `.virtualscreen/card-templates/*.json`. `create_card()`
writes `.cs` card files only after the script finishes successfully, using the same
deferred-write safety as note writes.

World-local templates can include V2 card layouts with typed fields, data-only table
rows, and safe display-only computed fields. Computed fields are just JSON values:

```python
card = card_template("computed-character-v1", "Captain Mira")
card["sections"][1]["fields"]["WIS"]["value"] = 16
card["sections"][1]["fields"]["Perception_flag"]["value"] = True
create_card("Cards/Captain Mira Sheet.cs", card)
```

Computed formulas are evaluated by the card viewer only. They cannot run Python, call DMS,
read files, use the network, or mutate the card.

## Legacy Compatibility

Legacy deprecated `/api/scenarios` routes and `.virtualscreen/scenarios` manifests remain
for old integrations and compatibility tests. New DM automation should use `.dms` files.
