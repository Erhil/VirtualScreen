import { describe, expect, it } from "vitest";

import type { WorldFile, WorkspaceTab } from "./api";
import {
  affectedDescendantPaths,
  defaultManagedFilePath,
  defaultManagedFolderPath,
  fileNameFromPath,
  hasDirtyDescendantPath,
  inferManagedFileType,
  isDescendantPath,
  joinWorldPath,
  managementErrorMessage,
  remapMovedWorldPath,
  remapMovedWorkspacePaths,
  removeDescendantWorkspacePaths,
  removeWorkspacePath,
  replaceWorkspacePath,
  validateManagedFolderPath,
  validateManagedFilePath,
  workspaceTabFromWorldFile
} from "./fileManagement";

const markdownFile: WorldFile = {
  path: "Notes/New Note.md",
  name: "New Note.md",
  extension: "md",
  media_kind: "markdown",
  content_type: "text/markdown",
  size: 12,
  modified_at: "2026-05-05T09:00:00Z",
  hash: "abc",
  content: "# New Note\n"
};

const scriptFile: WorldFile = {
  path: "Scripts/hello_world.dms",
  name: "hello_world.dms",
  extension: "dms",
  media_kind: "script",
  content_type: "text/x-dms",
  size: 24,
  modified_at: "2026-05-05T09:00:00Z",
  hash: "def",
  content: "render_md('# Hello')\n"
};

const cardFile: WorldFile = {
  path: "NPCs/Captain Ilyra.cs",
  name: "Captain Ilyra.cs",
  extension: "cs",
  media_kind: "card",
  content_type: "application/json",
  size: 48,
  modified_at: "2026-05-05T09:00:00Z",
  hash: "ghi",
  content: '{"title":"Captain Ilyra","kind":"npc"}\n'
};

const readmeTab: WorkspaceTab = {
  path: "README.md",
  name: "README.md",
  title: "Sample World Guide",
  mediaKind: "markdown"
};

describe("file management helpers", () => {
  it("infers supported editable file types from extensions", () => {
    expect(inferManagedFileType("README.md")).toBe("markdown");
    expect(inferManagedFileType("Notes/Page.markdown")).toBe("markdown");
    expect(inferManagedFileType("Tables/events.csv")).toBe("csv");
    expect(inferManagedFileType("Scripts/hello_world.dms")).toBe("script");
    expect(inferManagedFileType("NPCs/Captain Ilyra.cs")).toBe("card");
    expect(inferManagedFileType("Media/map.svg")).toBeNull();
  });

  it("extracts filename labels from nested paths", () => {
    expect(fileNameFromPath("NPCs/Captain Ilyra.md")).toBe("Captain Ilyra.md");
    expect(fileNameFromPath("README.md")).toBe("README.md");
  });

  it("builds folder-relative default file and folder paths", () => {
    expect(joinWorldPath("NPCs/Tavern", "Rumor.md")).toBe("NPCs/Tavern/Rumor.md");
    expect(joinWorldPath("", "Rumor.md")).toBe("Rumor.md");
    expect(defaultManagedFilePath("NPCs", "markdown")).toBe("NPCs/New Note.md");
    expect(defaultManagedFilePath("NPCs", "card")).toBe("NPCs/New Card.cs");
    expect(defaultManagedFilePath("Tables", "csv")).toBe("Tables/new-table.csv");
    expect(defaultManagedFilePath("Scripts", "script")).toBe("Scripts/new-script.dms");
    expect(defaultManagedFolderPath("NPCs")).toBe("NPCs/New Folder");
  });

  it("builds workspace tabs from saved world files", () => {
    expect(workspaceTabFromWorldFile(markdownFile)).toEqual({
      path: "Notes/New Note.md",
      name: "New Note.md",
      title: "New Note",
      mediaKind: "markdown"
    });
    expect(workspaceTabFromWorldFile(scriptFile)).toEqual({
      path: "Scripts/hello_world.dms",
      name: "hello_world.dms",
      title: "hello_world",
      mediaKind: "script"
    });
    expect(workspaceTabFromWorldFile(cardFile)).toEqual({
      path: "NPCs/Captain Ilyra.cs",
      name: "Captain Ilyra.cs",
      title: "Captain Ilyra",
      mediaKind: "card"
    });
  });

  it("replaces workspace paths without reordering items", () => {
    const replacement = {
      path: "Home.md",
      name: "Home.md",
      title: "Home",
      mediaKind: "markdown" as const
    };

    expect(replaceWorkspacePath([readmeTab], "README.md", replacement)).toEqual([replacement]);
  });

  it("removes workspace paths from ordered lists", () => {
    expect(removeWorkspacePath([readmeTab], "README.md")).toEqual([]);
  });

  it("detects paths inside a folder without matching sibling prefixes", () => {
    expect(isDescendantPath("NPCs/Tavern/Rumor.md", "NPCs/Tavern")).toBe(true);
    expect(isDescendantPath("NPCs/Tavern", "NPCs/Tavern")).toBe(true);
    expect(isDescendantPath("NPCs/Tavernkeepers.md", "NPCs/Tavern")).toBe(false);
    expect(isDescendantPath("NPCs/Tavern/Rumor.md", "NPCs\\Tavern\\")).toBe(true);
  });

  it("returns affected descendant paths in their original order", () => {
    expect(
      affectedDescendantPaths(
        ["README.md", "NPCs/Tavern/Rumor.md", "NPCs/Tavernkeepers.md"],
        "NPCs/Tavern"
      )
    ).toEqual(["NPCs/Tavern/Rumor.md"]);
  });

  it("remaps moved folder paths without touching similarly named siblings", () => {
    expect(remapMovedWorldPath("NPCs/Tavern/Rumor.md", "NPCs/Tavern", "Locations/Tavern")).toBe(
      "Locations/Tavern/Rumor.md"
    );
    expect(remapMovedWorldPath("NPCs/Tavern", "NPCs/Tavern", "Locations/Tavern")).toBe(
      "Locations/Tavern"
    );
    expect(remapMovedWorldPath("NPCs/Tavernkeepers.md", "NPCs/Tavern", "Locations/Tavern")).toBe(
      "NPCs/Tavernkeepers.md"
    );
  });

  it("remaps moved workspace tabs and removes trashed descendants", () => {
    const tabs: WorkspaceTab[] = [
      {
        path: "NPCs/Tavern/Rumor.md",
        name: "Rumor.md",
        title: "Rumor",
        mediaKind: "markdown"
      },
      {
        path: "NPCs/Tavernkeepers.md",
        name: "Tavernkeepers.md",
        title: "Tavernkeepers",
        mediaKind: "markdown"
      }
    ];

    expect(remapMovedWorkspacePaths(tabs, "NPCs/Tavern", "Locations/Tavern")).toEqual([
      {
        path: "Locations/Tavern/Rumor.md",
        name: "Rumor.md",
        title: "Rumor",
        mediaKind: "markdown"
      },
      tabs[1]
    ]);
    expect(removeDescendantWorkspacePaths(tabs, "NPCs/Tavern")).toEqual([tabs[1]]);
  });

  it("blocks folder operations when a dirty descendant is open", () => {
    expect(hasDirtyDescendantPath(new Set(["NPCs/Tavern/Rumor.md"]), "NPCs/Tavern")).toBe(
      true
    );
    expect(hasDirtyDescendantPath(["NPCs/Tavernkeepers.md"], "NPCs/Tavern")).toBe(false);
  });

  it("validates managed paths before opening dialogs", () => {
    expect(validateManagedFilePath("", "markdown")).toBe("Enter a world-relative path.");
    expect(validateManagedFilePath(".virtualscreen/hidden.md", "markdown")).toContain(
      "internal"
    );
    expect(validateManagedFilePath("../escape.md", "markdown")).toContain("traversal");
    expect(validateManagedFilePath("image.png", "markdown")).toContain(
      "Markdown, CSV, DMS, and Cards"
    );
    expect(validateManagedFilePath("events.csv", "markdown")).toContain("selected type");
    expect(validateManagedFilePath("events.csv", "csv")).toBeNull();
    expect(validateManagedFilePath("Scripts/hello_world.dms", "script")).toBeNull();
    expect(validateManagedFilePath("NPCs/Captain Ilyra.cs", "card")).toBeNull();
  });

  it("validates managed folder paths", () => {
    expect(validateManagedFolderPath("")).toContain("folder path");
    expect(validateManagedFolderPath(".virtualscreen/trash")).toContain("internal");
    expect(validateManagedFolderPath("../escape")).toContain("traversal");
    expect(validateManagedFolderPath("NPCs/New.md")).toContain("Folder names");
    expect(validateManagedFolderPath("NPCs/Tavern")).toBeNull();
  });

  it("formats conflict and validation errors for dialogs", () => {
    expect(managementErrorMessage(new Error("Request failed with 409"))).toContain(
      "changed on disk"
    );
    expect(managementErrorMessage(new Error("Request failed with 415"))).toContain(
      "Cards"
    );
  });
});
