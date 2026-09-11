import type { DmsOutput, WorldFile, WorldMediaKind } from "./api";
import type { Translator } from "../lang";

export type DmsFormInputType = "text" | "number" | "boolean" | "select" | "file";

export type DmsFormField = {
  name: string;
  label: string;
  input_type: DmsFormInputType;
  required: boolean;
  default: string | number | boolean | null;
  options: string[];
};

export type DmsFormValues = Record<string, string | number | boolean>;

export type DmsCommandReferenceEntry = {
  name: string;
  groupKey: string;
  signature: string;
  descriptionKey: string;
  effectKey: string;
  example: string;
};

export const DMS_COMMAND_REFERENCE: DmsCommandReferenceEntry[] = [
  {
    name: "form",
    groupKey: "scripts.command.group.input",
    signature: 'form({"name": "text"})',
    descriptionKey: "scripts.command.form.description",
    effectKey: "scripts.command.form.effect",
    example: 'name = form({"name": "text"})["name"]'
  },
  {
    name: "choose_file",
    groupKey: "scripts.command.group.input",
    signature: 'choose_file("Pick a page", kind="markdown")',
    descriptionKey: "scripts.command.chooseFile.description",
    effectKey: "scripts.command.chooseFile.effect",
    example: 'path = choose_file("Pick a page")'
  },
  {
    name: "roll",
    groupKey: "scripts.command.group.input",
    signature: 'roll("1d20+3")',
    descriptionKey: "scripts.command.roll.description",
    effectKey: "scripts.command.roll.effect",
    example: 'total = roll("1d20+3")'
  },
  {
    name: "table",
    groupKey: "scripts.command.group.input",
    signature: 'table("Tables/random-events.csv")',
    descriptionKey: "scripts.command.table.description",
    effectKey: "scripts.command.table.effect",
    example: 'event = table("Tables/random-events.csv")'
  },
  {
    name: "screen_fs",
    groupKey: "scripts.command.group.screen",
    signature: 'screen_fs("README.md")',
    descriptionKey: "scripts.command.screenFs.description",
    effectKey: "scripts.command.screenFs.effect",
    example: 'screen_fs("Notes/Handout.md")'
  },
  {
    name: "screen_pu",
    groupKey: "scripts.command.group.screen",
    signature: 'screen_pu("NPCs/Captain.md")',
    descriptionKey: "scripts.command.screenPu.description",
    effectKey: "scripts.command.screenPu.effect",
    example: 'screen_pu("NPCs/Captain.md")'
  },
  {
    name: "audio_play",
    groupKey: "scripts.command.group.audio",
    signature: 'audio_play(".music/effects/file.mp3", bus="effect")',
    descriptionKey: "scripts.command.audioPlay.description",
    effectKey: "scripts.command.audioPlay.effect",
    example: 'audio_play(".music/effects/bell.mp3")'
  },
  {
    name: "map_load",
    groupKey: "scripts.command.group.map",
    signature: 'map_load("Media/map.svg", present=True)',
    descriptionKey: "scripts.command.mapLoad.description",
    effectKey: "scripts.command.mapLoad.effect",
    example: 'map_load("Media/map.svg", present=True)'
  },
  {
    name: "map_preset",
    groupKey: "scripts.command.group.map",
    signature: 'map_preset("Session setup", present=True)',
    descriptionKey: "scripts.command.mapPreset.description",
    effectKey: "scripts.command.mapPreset.effect",
    example: 'map_preset("Session setup")'
  },
  {
    name: "map_present",
    groupKey: "scripts.command.group.map",
    signature: "map_present()",
    descriptionKey: "scripts.command.mapPresent.description",
    effectKey: "scripts.command.mapPresent.effect",
    example: "map_present()"
  },
  {
    name: "map_stop",
    groupKey: "scripts.command.group.map",
    signature: "map_stop()",
    descriptionKey: "scripts.command.mapStop.description",
    effectKey: "scripts.command.mapStop.effect",
    example: "map_stop()"
  },
  {
    name: "map_fog",
    groupKey: "scripts.command.group.map",
    signature: "map_fog(True)",
    descriptionKey: "scripts.command.mapFog.description",
    effectKey: "scripts.command.mapFog.effect",
    example: "map_fog(True)"
  },
  {
    name: "render_md",
    groupKey: "scripts.command.group.output",
    signature: 'render_md("# Result")',
    descriptionKey: "scripts.command.renderMd.description",
    effectKey: "scripts.command.renderMd.effect",
    example: 'render_md("# Result")'
  },
  {
    name: "create_note",
    groupKey: "scripts.command.group.world",
    signature: 'create_note("Notes/new.md", "# New")',
    descriptionKey: "scripts.command.createNote.description",
    effectKey: "scripts.command.createNote.effect",
    example: 'create_note("Notes/new.md", "# New")'
  },
  {
    name: "append_note",
    groupKey: "scripts.command.group.world",
    signature: 'append_note("README.md", "\\nMore")',
    descriptionKey: "scripts.command.appendNote.description",
    effectKey: "scripts.command.appendNote.effect",
    example: 'append_note("README.md", "\\nMore")'
  },
  {
    name: "card_template",
    groupKey: "scripts.command.group.world",
    signature: 'card_template("npc", "Captain Mira")',
    descriptionKey: "scripts.command.cardTemplate.description",
    effectKey: "scripts.command.cardTemplate.effect",
    example: 'card = card_template("npc", "Captain Mira")'
  },
  {
    name: "create_card",
    groupKey: "scripts.command.group.world",
    signature: 'create_card("Cards/Mira.cs", card)',
    descriptionKey: "scripts.command.createCard.description",
    effectKey: "scripts.command.createCard.effect",
    example: 'create_card("Cards/Mira.cs", card)'
  }
];

const DMS_FORM_TYPES = new Set(["text", "number", "boolean", "select", "file"]);

export function normalizeDmsFormSchema(schema: Record<string, unknown>): DmsFormField[] {
  return Object.entries(schema).flatMap(([name, value]) => {
    if (typeof value === "string" && DMS_FORM_TYPES.has(value)) {
      return [
        {
          name,
          label: name,
          input_type: value as DmsFormInputType,
          required: true,
          default: value === "boolean" ? false : value === "number" ? 0 : "",
          options: []
        }
      ];
    }
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return [];
    }
    const data = value as Record<string, unknown>;
    const type = typeof data.type === "string" ? data.type : data.input_type;
    if (typeof type !== "string" || !DMS_FORM_TYPES.has(type)) {
      return [];
    }
    const options = Array.isArray(data.options)
      ? data.options.filter((option): option is string => typeof option === "string")
      : [];
    return [
      {
        name,
        label: typeof data.label === "string" ? data.label : name,
        input_type: type as DmsFormInputType,
        required: typeof data.required === "boolean" ? data.required : true,
        default:
          typeof data.default === "string" ||
          typeof data.default === "number" ||
          typeof data.default === "boolean"
            ? data.default
            : null,
        options
      }
    ];
  });
}

export function buildDmsFormDefaults(fields: DmsFormField[]): DmsFormValues {
  return Object.fromEntries(
    fields.map((field) => {
      if (field.default !== null) {
        return [field.name, field.default];
      }
      if (field.input_type === "number") {
        return [field.name, 0];
      }
      if (field.input_type === "boolean") {
        return [field.name, false];
      }
      if (field.input_type === "select") {
        return [field.name, field.options[0] ?? ""];
      }
      if (field.input_type === "file") {
        return [field.name, ""];
      }
      return [field.name, ""];
    })
  );
}

export function dmsOutputToWorldFile(output: DmsOutput): WorldFile {
  const extension = output.media_kind === "markdown" ? "md" : "csv";
  return {
    path: output.virtual_path,
    name: output.name,
    extension,
    media_kind: output.media_kind,
    content_type: output.media_kind === "markdown" ? "text/markdown" : "text/csv",
    size: output.content.length,
    modified_at: "",
    hash: "",
    content: output.content
  };
}

export function isTemporaryDmsPath(path: string): boolean {
  return path.startsWith("dms://");
}

export function isScriptRunAvailable({
  dirty,
  mediaKind,
  running,
  saving,
  t
}: {
  dirty: boolean;
  mediaKind: WorldMediaKind | "unsupported";
  saving: boolean;
  running?: boolean;
  t?: Translator;
}): { available: true; reason?: never } | { available: false; reason: string } {
  if (mediaKind !== "script") {
    return { available: false, reason: t?.("scripts.runUnavailable.openScript") ?? "Open a DMS script to run it." };
  }
  if (running) {
    return { available: false, reason: t?.("scripts.runUnavailable.running") ?? "Script is already running." };
  }
  if (saving) {
    return { available: false, reason: t?.("scripts.runUnavailable.saving") ?? "Wait for save to finish." };
  }
  if (dirty) {
    return { available: false, reason: t?.("scripts.runUnavailable.dirty") ?? "Save before running." };
  }
  return { available: true };
}
