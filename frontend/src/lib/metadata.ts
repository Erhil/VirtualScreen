import type { PageDetail, WorldEntry } from "./api";
import type { Translator } from "../lang";

export type MetadataEntry = {
  label: string;
  value: string;
};

export function treeEntryLabel(entry: WorldEntry): { primary: string; secondary: string | null } {
  if (entry.title) {
    return { primary: entry.title, secondary: entry.name };
  }

  return { primary: entry.name, secondary: null };
}

export function formatMetadataList(values: string[], t?: Translator): string {
  return values.length > 0 ? values.join(", ") : t?.("app.none") ?? "None";
}

function formatValue(value: unknown, t?: Translator): string {
  if (value === null || value === undefined || value === "") {
    return t?.("app.none") ?? "None";
  }
  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function buildMetadataViewModel(page: PageDetail, t?: Translator): MetadataEntry[] {
  const entries: MetadataEntry[] = [
    { label: t?.("metadata.field.title") ?? "Title", value: page.title },
    { label: t?.("metadata.field.type") ?? "Type", value: page.page_type ?? t?.("app.none") ?? "None" },
    { label: t?.("metadata.field.tags") ?? "Tags", value: formatMetadataList(page.tags, t) },
    { label: t?.("metadata.field.aliases") ?? "Aliases", value: formatMetadataList(page.aliases, t) }
  ];

  for (const [label, value] of Object.entries(page.fields)) {
    entries.push({ label, value: formatValue(value, t) });
  }

  return entries;
}
