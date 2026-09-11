import { type WorldFile } from "../../lib/api";
import { parseCard, type StructuredCard } from "../../lib/cards";
import { type ManagedFileType } from "../../lib/fileManagement";
import { isTemporaryDmsPath } from "../../lib/scripts";
import { type OpenTab } from "../../lib/tabs";

export function canHavePageLinks(tab: OpenTab): boolean {
  return (
    tab.mediaKind === "markdown" ||
    tab.mediaKind === "card" ||
    tab.mediaKind === "csv" ||
    tab.mediaKind === "text"
  );
}

export function isCardPath(path: string, extension?: string | null): boolean {
  return extension?.toLowerCase() === "cs" || path.toLowerCase().endsWith(".cs");
}

export function parseCardJson(
  content: string
): { ok: true; card: StructuredCard } | { ok: false; message: string } {
  try {
    return { ok: true, card: parseCard(content) };
  } catch (error: unknown) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Card content is not valid JSON."
    };
  }
}

function managedTypeForFile(file: WorldFile): ManagedFileType | null {
  if (
    file.media_kind === "markdown" ||
    file.media_kind === "csv" ||
    file.media_kind === "script" ||
    file.media_kind === "card"
  ) {
    return file.media_kind;
  }
  return null;
}

export function isEditableFile(file: WorldFile): boolean {
  if (isTemporaryDmsPath(file.path)) {
    return false;
  }
  return managedTypeForFile(file) !== null || isCardPath(file.path, file.extension);
}
