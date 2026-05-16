{
  "kind": "monster",
  "title": "Monster Stat Card",
  "tags": [
    "sample",
    "v2",
    "monster"
  ],
  "sections": [
    {
      "title": "Stats",
      "layout": "grid",
      "fields": {
        "Type": {
          "type": "text",
          "value": "Clockwork scout"
        },
        "Armor": {
          "type": "number",
          "value": 15
        },
        "HP": {
          "type": "number",
          "value": 27
        },
        "Morale": {
          "type": "select",
          "value": "steady",
          "options": [
            "shaky",
            "steady",
            "fanatic"
          ]
        }
      }
    },
    {
      "title": "Tactics",
      "layout": "list",
      "fields": {
        "Opening": {
          "type": "long_text",
          "value": "Marks the loudest intruder, then retreats toward [[Cards/Clockwork Gull.cs]]."
        },
        "Weakness": {
          "type": "text",
          "value": "Saltwater locks its wing joints."
        }
      }
    }
  ]
}
