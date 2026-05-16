{
  "kind": "character",
  "title": "Computed Character Sheet",
  "tags": [
    "sample",
    "computed",
    "character"
  ],
  "sections": [
    {
      "title": "Identity",
      "layout": "grid",
      "fields": {
        "Player": {
          "type": "text",
          "value": "Avery"
        },
        "Class": {
          "type": "text",
          "value": "Ranger"
        },
        "Home Base": {
          "type": "world_link",
          "value": "[[README]]"
        }
      }
    },
    {
      "title": "Abilities",
      "layout": "grid",
      "fields": {
        "STR": {
          "type": "number",
          "value": 10
        },
        "WIS": {
          "type": "number",
          "value": 16
        },
        "Perception_flag": {
          "type": "boolean",
          "value": true
        },
        "WIS Bonus": {
          "type": "computed",
          "formula": "ability_mod(WIS)",
          "format": "signed"
        },
        "Perception_bonus": {
          "type": "computed",
          "formula": "ability_mod(WIS) + Perception_flag * 3",
          "format": "signed"
        },
        "STR Plus Three": {
          "type": "computed",
          "formula": "STR + 3"
        }
      }
    },
    {
      "title": "Notes",
      "fields": {
        "Usage": "Computed fields are display-only. Edit STR, WIS, or Perception_flag to update the derived values."
      }
    }
  ]
}
