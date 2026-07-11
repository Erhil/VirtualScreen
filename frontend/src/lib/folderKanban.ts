import type { ManagedPageMetadata, PageDetail, WorldEntry, WorldMediaKind, WorkspaceTab } from "./api";
import {
  serializeCard,
  type CardField,
  type CardSection,
  type StructuredCard
} from "./cards";
import { contextualManagedFilePath } from "./fileManagement";
import { mediaKindForEntry } from "./tabs";

export const FOLDER_KANBAN_DEFAULT_GROUP = "Status";
export const FOLDER_KANBAN_UNASSIGNED = "";

const SUPPORTED_KINDS = new Set<WorldMediaKind>(["markdown", "csv", "card"]);

export type FolderKanbanEntity = {
  path: string;
  name: string;
  title: string;
  mediaKind: "markdown" | "csv" | "card";
  pageType: string | null;
  fields: Record<string, unknown>;
  modified_at: string;
  hash: string;
};

export type FolderKanbanColumn = {
  value: string;
  label: string;
  entities: FolderKanbanEntity[];
};

export function findWorldEntry(root: WorldEntry | null, path: string): WorldEntry | null {
  if (!root) {
    return null;
  }
  if (root.path === path) {
    return root;
  }
  for (const child of root.children) {
    const match = findWorldEntry(child, path);
    if (match) {
      return match;
    }
  }
  return null;
}

export function folderKanbanTab(entry: WorldEntry): WorkspaceTab {
  return {
    path: entry.path,
    name: entry.name,
    title: entry.path || entry.name,
    mediaKind: "folder"
  };
}

export function supportedFolderKanbanEntries(folder: WorldEntry | null): WorldEntry[] {
  if (!folder || folder.kind !== "directory") {
    return [];
  }
  return folder.children.filter((entry) => {
    if (entry.kind !== "file") {
      return false;
    }
    return SUPPORTED_KINDS.has(mediaKindForEntry(entry) as WorldMediaKind);
  });
}

export function buildFolderKanbanEntities(
  folder: WorldEntry | null,
  pages: PageDetail[]
): FolderKanbanEntity[] {
  const pagesByPath = new Map(pages.map((page) => [page.path, page]));
  return supportedFolderKanbanEntries(folder)
    .flatMap((entry) => {
      const page = pagesByPath.get(entry.path);
      const mediaKind = mediaKindForEntry(entry);
      if (!page || !SUPPORTED_KINDS.has(mediaKind as WorldMediaKind)) {
        return [];
      }
      return [
        {
          path: page.path,
          name: page.name,
          title: page.title || entry.title || entry.name,
          mediaKind: mediaKind as "markdown" | "csv" | "card",
          pageType: page.page_type,
          fields: page.fields,
          modified_at: page.modified_at,
          hash: page.hash
        }
      ];
    })
    .sort((first, second) => first.title.localeCompare(second.title));
}

export function folderKanbanGroupOptions(entities: FolderKanbanEntity[]): string[] {
  const fields = new Set<string>([FOLDER_KANBAN_DEFAULT_GROUP]);
  for (const entity of entities) {
    for (const key of Object.keys(entity.fields)) {
      if (key.trim()) {
        fields.add(key);
        const leaf = key.split(".").pop()?.trim();
        if (leaf) {
          fields.add(leaf);
        }
      }
    }
  }
  return ["type", ...Array.from(fields).sort((a, b) => a.localeCompare(b))];
}

function matchingFieldValue(fields: Record<string, unknown>, groupBy: string): unknown {
  if (Object.prototype.hasOwnProperty.call(fields, groupBy)) {
    return fields[groupBy];
  }
  const suffix = `.${groupBy}`;
  const matchingKey = Object.keys(fields).find((key) => key.endsWith(suffix));
  return matchingKey ? fields[matchingKey] : undefined;
}

export function folderKanbanValue(entity: FolderKanbanEntity, groupBy: string): string {
  if (groupBy === "type") {
    return entity.pageType ?? FOLDER_KANBAN_UNASSIGNED;
  }
  const value = matchingFieldValue(entity.fields, groupBy);
  return typeof value === "string" ? value : value === null || value === undefined ? "" : String(value);
}

export function buildFolderKanbanColumns(
  entities: FolderKanbanEntity[],
  groupBy: string,
  extraValues: string[] = []
): FolderKanbanColumn[] {
  const values = new Set<string>([FOLDER_KANBAN_UNASSIGNED]);
  for (const entity of entities) {
    values.add(folderKanbanValue(entity, groupBy));
  }
  for (const value of extraValues) {
    values.add(value.trim());
  }
  return Array.from(values)
    .sort((first, second) => {
      if (first === FOLDER_KANBAN_UNASSIGNED) {
        return -1;
      }
      if (second === FOLDER_KANBAN_UNASSIGNED) {
        return 1;
      }
      return first.localeCompare(second);
    })
    .map((value) => ({
      value,
      label: value || "Unassigned",
      entities: entities.filter((entity) => folderKanbanValue(entity, groupBy) === value)
    }));
}

export function pageMetadataForKanbanMove(
  page: PageDetail,
  groupBy: string,
  value: string
): ManagedPageMetadata {
  const fields = Object.fromEntries(
    Object.entries(page.fields).map(([key, fieldValue]) => [key, String(fieldValue ?? "")])
  );
  if (groupBy === "type") {
    return {
      title: page.title,
      type: value.trim() || null,
      tags: page.tags,
      aliases: page.aliases,
      fields
    };
  }
  if (value.trim()) {
    fields[groupBy] = value.trim();
  } else {
    delete fields[groupBy];
  }
  return {
    title: page.title,
    type: page.page_type,
    tags: page.tags,
    aliases: page.aliases,
    fields
  };
}

function textField(label: string, value: string): CardField {
  return { label, type: "text", value };
}

function firstEditableSection(card: StructuredCard): CardSection {
  return card.sections.find((section) => section.layout !== "table") ?? {
    title: "Core",
    fields: []
  };
}

export function cardWithKanbanValue(
  card: StructuredCard,
  groupBy: string,
  value: string
): StructuredCard {
  if (groupBy === "type") {
    return { ...card, kind: value.trim() || "custom" };
  }

  const nextSections = card.sections.length > 0 ? card.sections : [{ title: "Core", fields: [] }];
  let updated = false;
  const sections = nextSections.map((section) => {
    if (section.layout === "table" || updated) {
      return section;
    }
    const existingIndex = section.fields.findIndex((field) => field.label === groupBy);
    if (!value.trim()) {
      if (existingIndex === -1) {
        updated = true;
        return section;
      }
      updated = true;
      return {
        ...section,
        fields: section.fields.filter((_, index) => index !== existingIndex)
      };
    }
    updated = true;
    if (existingIndex === -1) {
      return { ...section, fields: [...section.fields, textField(groupBy, value.trim())] };
    }
    return {
      ...section,
      fields: section.fields.map((field, index) =>
        index === existingIndex ? { ...field, value: value.trim() } : field
      )
    };
  });

  if (!updated && value.trim()) {
    const section = firstEditableSection(card);
    sections.push({ ...section, fields: [...section.fields, textField(groupBy, value.trim())] });
  }
  return { ...card, sections };
}

export function serializeCardWithKanbanValue(
  card: StructuredCard,
  groupBy: string,
  value: string
): string {
  return serializeCard(cardWithKanbanValue(card, groupBy, value));
}

export function createKanbanCardContent(title: string, groupBy: string, value: string): string {
  return serializeCardWithKanbanValue(
    {
      title: title.trim() || "New Card",
      kind: "custom",
      tags: [],
      sections: [{ title: "Core", fields: [textField("Notes", "")] }]
    },
    groupBy,
    value
  );
}

export function kanbanCardPath(folderPath: string, name: string): string {
  return contextualManagedFilePath(folderPath, name, "card");
}
