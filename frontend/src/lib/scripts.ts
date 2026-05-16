import type { CreateWorldFileRequest, DmsOutput, WorldFile, WorldMediaKind } from "./api";

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

const DMS_FORM_TYPES = new Set(["text", "number", "boolean", "select", "file"]);
const DMS_EXTENSIONS: Record<DmsOutput["media_kind"], string> = {
  markdown: "md",
  csv: "csv"
};

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

export function shouldPersistTab(tab: { path: string; [key: string]: unknown }): boolean {
  return !isTemporaryDmsPath(tab.path);
}

export function buildDmsOutputSavePayload(
  output: DmsOutput,
  path: string
): CreateWorldFileRequest {
  return {
    path,
    file_type: output.media_kind,
    content: output.content
  };
}

export function defaultDmsOutputSavePath(output: DmsOutput): string {
  const extension = DMS_EXTENSIONS[output.media_kind];
  return `DMS Outputs/${output.id}.${extension}`;
}

export function isScriptRunAvailable({
  dirty,
  mediaKind,
  running,
  saving
}: {
  dirty: boolean;
  mediaKind: WorldMediaKind | "unsupported";
  saving: boolean;
  running?: boolean;
}): { available: true; reason?: never } | { available: false; reason: string } {
  if (mediaKind !== "script") {
    return { available: false, reason: "Open a DMS script to run it." };
  }
  if (running) {
    return { available: false, reason: "Script is already running." };
  }
  if (saving) {
    return { available: false, reason: "Wait for save to finish." };
  }
  if (dirty) {
    return { available: false, reason: "Save before running." };
  }
  return { available: true };
}
