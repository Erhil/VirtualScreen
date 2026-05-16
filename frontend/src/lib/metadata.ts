import type { PageDetail, WorldEntry } from "./api";

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

export function formatMetadataList(values: string[]): string {
  return values.length > 0 ? values.join(", ") : "None";
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === "") {
    return "None";
  }
  if (Array.isArray(value)) {
    return value.map(String).join(", ");
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}

export function buildMetadataViewModel(page: PageDetail): MetadataEntry[] {
  const entries: MetadataEntry[] = [
    { label: "Title", value: page.title },
    { label: "Type", value: page.page_type ?? "None" },
    { label: "Tags", value: formatMetadataList(page.tags) },
    { label: "Aliases", value: formatMetadataList(page.aliases) }
  ];

  for (const [label, value] of Object.entries(page.fields)) {
    entries.push({ label, value: formatValue(value) });
  }

  return entries;
}
