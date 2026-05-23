import type { WorldFile, WorkspaceTab } from "./api";

export type ManagedFileType = "markdown" | "card" | "csv" | "script";

const MARKDOWN_EXTENSIONS = new Set(["md", "markdown"]);
const MANAGED_FILE_TYPES_MESSAGE =
  "Only Markdown, CSV, DMS, and Cards files can be managed.";

export function fileNameFromPath(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

export function joinWorldPath(folderPath: string, name: string): string {
  const folder = folderPath.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const fileName = name.trim().replace(/\\/g, "/").replace(/^\/+/, "");
  return folder ? `${folder}/${fileName}` : fileName;
}

export function defaultManagedFilePath(
  folderPath: string,
  fileType: ManagedFileType
): string {
  if (fileType === "csv") {
    return joinWorldPath(folderPath, "new-table.csv");
  }
  if (fileType === "card") {
    return joinWorldPath(folderPath, "New Card.cs");
  }
  if (fileType === "script") {
    return joinWorldPath(folderPath, "new-script.dms");
  }
  return joinWorldPath(folderPath, "New Note.md");
}

export function defaultManagedFileName(fileType: ManagedFileType): string {
  if (fileType === "csv") {
    return "new-table";
  }
  if (fileType === "card") {
    return "New Card";
  }
  if (fileType === "script") {
    return "new-script";
  }
  return "New Note";
}

export function managedFileExtension(fileType: ManagedFileType): string {
  if (fileType === "csv") {
    return ".csv";
  }
  if (fileType === "card") {
    return ".cs";
  }
  if (fileType === "script") {
    return ".dms";
  }
  return ".md";
}

export function contextualManagedFilePath(
  folderPath: string,
  name: string,
  fileType: ManagedFileType
): string {
  const normalizedName = name.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
  const extension = managedFileExtension(fileType);
  const hasExtension =
    fileType === "markdown"
      ? /\.(md|markdown)$/i.test(normalizedName)
      : normalizedName.toLowerCase().endsWith(extension);
  return joinWorldPath(folderPath, hasExtension ? normalizedName : `${normalizedName}${extension}`);
}

export function validateContextualFileName(name: string): string | null {
  const trimmed = name.trim();
  if (!trimmed) {
    return "Enter a name.";
  }
  if (/[\\/]/.test(trimmed)) {
    return "Enter a filename, not a path.";
  }
  return null;
}

export function ancestorDirectoryPaths(path: string): string[] {
  const parts = path.trim().replace(/\\/g, "/").split("/").filter(Boolean);
  const ancestors = [""];
  for (let index = 0; index < parts.length - 1; index += 1) {
    ancestors.push(parts.slice(0, index + 1).join("/"));
  }
  return ancestors;
}

export function revealWorldTreePaths(
  expandedPaths: Iterable<string>,
  affectedPaths: Iterable<string>
): Set<string> {
  const nextPaths = new Set(expandedPaths);
  nextPaths.add("");
  for (const path of affectedPaths) {
    for (const ancestor of ancestorDirectoryPaths(path)) {
      nextPaths.add(ancestor);
    }
  }
  return nextPaths;
}

export function defaultManagedFolderPath(folderPath: string): string {
  return joinWorldPath(folderPath, "New Folder");
}

export function inferManagedFileType(path: string): ManagedFileType | null {
  const extension = fileNameFromPath(path).split(".").at(-1)?.toLowerCase() ?? "";
  if (MARKDOWN_EXTENSIONS.has(extension)) {
    return "markdown";
  }
  if (extension === "csv") {
    return "csv";
  }
  if (extension === "dms") {
    return "script";
  }
  if (extension === "cs") {
    return "card";
  }
  return null;
}

export function workspaceTabFromWorldFile(file: WorldFile): WorkspaceTab {
  return {
    path: file.path,
    name: file.name,
    title:
      file.media_kind === "markdown" ||
      file.media_kind === "script" ||
      file.media_kind === "card"
        ? file.name.replace(/\.(cs|dms|md|markdown)$/i, "")
        : null,
    mediaKind: file.media_kind
  };
}

export function replaceWorkspacePath(
  items: WorkspaceTab[],
  oldPath: string,
  replacement: WorkspaceTab
): WorkspaceTab[] {
  return items.map((item) => (item.path === oldPath ? replacement : item));
}

export function removeWorkspacePath(items: WorkspaceTab[], path: string): WorkspaceTab[] {
  return items.filter((item) => item.path !== path);
}

function normalizeWorldPath(path: string): string {
  return path.trim().replace(/\\/g, "/").replace(/^\/+|\/+$/g, "");
}

export function isDescendantPath(path: string, parentPath: string): boolean {
  const normalizedPath = normalizeWorldPath(path);
  const normalizedParent = normalizeWorldPath(parentPath);
  return (
    normalizedParent === "" ||
    normalizedPath === normalizedParent ||
    normalizedPath.startsWith(`${normalizedParent}/`)
  );
}

export function affectedDescendantPaths(paths: string[], parentPath: string): string[] {
  return paths.filter((path) => isDescendantPath(path, parentPath));
}

export function remapMovedWorldPath(
  path: string,
  oldParentPath: string,
  newParentPath: string
): string {
  const normalizedPath = normalizeWorldPath(path);
  const normalizedOldParent = normalizeWorldPath(oldParentPath);
  const normalizedNewParent = normalizeWorldPath(newParentPath);

  if (!isDescendantPath(normalizedPath, normalizedOldParent)) {
    return path;
  }
  if (normalizedPath === normalizedOldParent) {
    return normalizedNewParent;
  }

  return joinWorldPath(
    normalizedNewParent,
    normalizedPath.slice(normalizedOldParent.length + 1)
  );
}

export function remapMovedWorkspacePaths(
  items: WorkspaceTab[],
  oldParentPath: string,
  newParentPath: string
): WorkspaceTab[] {
  return items.map((item) => {
    const nextPath = remapMovedWorldPath(item.path, oldParentPath, newParentPath);
    if (nextPath === item.path) {
      return item;
    }
    return {
      ...item,
      path: nextPath,
      name: fileNameFromPath(nextPath)
    };
  });
}

export function removeDescendantWorkspacePaths(
  items: WorkspaceTab[],
  parentPath: string
): WorkspaceTab[] {
  return items.filter((item) => !isDescendantPath(item.path, parentPath));
}

export function hasDirtyDescendantPath(
  dirtyPaths: Iterable<string>,
  parentPath: string
): boolean {
  for (const path of dirtyPaths) {
    if (isDescendantPath(path, parentPath)) {
      return true;
    }
  }
  return false;
}

export function validateManagedFilePath(
  path: string,
  expectedType?: ManagedFileType
): string | null {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return "Enter a world-relative path.";
  }
  if (trimmedPath.startsWith("/") || /^[a-z]:/i.test(trimmedPath)) {
    return "Use a world-relative path.";
  }
  if (trimmedPath.split(/[\\/]/).some((part) => part === "..")) {
    return "Path cannot contain parent-directory traversal.";
  }
  if (trimmedPath.replace(/\\/g, "/").split("/")[0] === ".virtualscreen") {
    return "VirtualScreen internal paths cannot be managed.";
  }

  const inferredType = inferManagedFileType(trimmedPath);
  if (!inferredType) {
    return MANAGED_FILE_TYPES_MESSAGE;
  }
  if (expectedType && inferredType !== expectedType) {
    return "File extension does not match the selected type.";
  }
  return null;
}

export function validateManagedFolderPath(path: string): string | null {
  const trimmedPath = path.trim();
  if (!trimmedPath) {
    return "Enter a world-relative folder path.";
  }
  if (trimmedPath.startsWith("/") || /^[a-z]:/i.test(trimmedPath)) {
    return "Use a world-relative path.";
  }
  if (trimmedPath.split(/[\\/]/).some((part) => part === "..")) {
    return "Path cannot contain parent-directory traversal.";
  }
  if (trimmedPath.replace(/\\/g, "/").split("/")[0] === ".virtualscreen") {
    return "VirtualScreen internal paths cannot be managed.";
  }
  if (fileNameFromPath(trimmedPath).includes(".")) {
    return "Folder names cannot include a file extension.";
  }
  return null;
}

export function managementErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : "Unknown error";
  if (message.includes("409")) {
    return "World file changed on disk or target already exists.";
  }
  if (message.includes("415")) {
    return MANAGED_FILE_TYPES_MESSAGE;
  }
  if (message.includes("400")) {
    return "Check the world-relative path and try again.";
  }
  if (message.includes("404")) {
    return "World file was not found.";
  }
  return message;
}
