{
  "kind": "character",
  "title": "Basic Character Sheet",
  "tags": [
    "sample",
    "v2",
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
        "Level": {
          "type": "number",
          "value": 3
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
          "value": 12
        },
        "DEX": {
          "type": "number",
          "value": 16
        },
        "CON": {
          "type": "number",
          "value": 14
        },
        "WIS": {
          "type": "number",
          "value": 15
        }
      }
    },
    {
      "title": "Moves",
      "layout": "table",
      "rows": [
        {
          "Name": "Longbow",
          "Bonus": "+5",
          "Damage": "1d8+3"
        },
        {
          "Name": "Shortsword",
          "Bonus": "+5",
          "Damage": "1d6+3"
        }
      ]
    }
  ]
}
