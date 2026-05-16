import type { ManagedPageMetadata, PageDetail } from "./api";

export type MetadataFieldRow = {
  key: string;
  value: string;
};

export type MetadataFormState = {
  title: string;
  type: string;
  tagsText: string;
  aliasesText: string;
  fields: MetadataFieldRow[];
};

function normalizeList(values: string[]): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

export function listToText(values: string[]): string {
  return normalizeList(values).join(", ");
}

export function textToList(value: string): string[] {
  return normalizeList(value.split(","));
}

export function metadataFormFromPage(page: PageDetail): MetadataFormState {
  return {
    title: page.title,
    type: page.page_type ?? "",
    tagsText: listToText(page.tags),
    aliasesText: listToText(page.aliases),
    fields: Object.entries(page.fields).map(([key, value]) => ({
      key,
      value: String(value ?? "")
    }))
  };
}

export function addMetadataFieldRow(form: MetadataFormState): MetadataFormState {
  return { ...form, fields: [...form.fields, { key: "", value: "" }] };
}

export function removeMetadataFieldRow(
  form: MetadataFormState,
  index: number
): MetadataFormState {
  return {
    ...form,
    fields: form.fields.filter((_, rowIndex) => rowIndex !== index)
  };
}

export function updateMetadataFieldRow(
  form: MetadataFormState,
  index: number,
  patch: Partial<MetadataFieldRow>
): MetadataFormState {
  return {
    ...form,
    fields: form.fields.map((field, rowIndex) =>
      rowIndex === index ? { ...field, ...patch } : field
    )
  };
}

export function metadataPayloadFromForm(form: MetadataFormState): ManagedPageMetadata {
  const fields: Record<string, string> = {};
  for (const row of form.fields) {
    const key = row.key.trim();
    if (key) {
      fields[key] = row.value;
    }
  }

  return {
    title: form.title.trim(),
    type: form.type.trim() || null,
    tags: textToList(form.tagsText),
    aliases: textToList(form.aliasesText),
    fields
  };
}

export function validateMetadataForm(form: MetadataFormState): string | null {
  if (!form.title.trim()) {
    return "Title is required.";
  }

  const seenKeys = new Set<string>();
  for (const row of form.fields) {
    const key = row.key.trim();
    if (!key && row.value.trim()) {
      return "Custom field key is required.";
    }
    if (!key) {
      continue;
    }
    if (seenKeys.has(key)) {
      return "Custom field keys must be unique.";
    }
    seenKeys.add(key);
  }
  return null;
}

export function isMetadataFormDirty(form: MetadataFormState, page: PageDetail): boolean {
  return (
    JSON.stringify(metadataPayloadFromForm(form)) !==
    JSON.stringify(metadataPayloadFromForm(metadataFormFromPage(page)))
  );
}
