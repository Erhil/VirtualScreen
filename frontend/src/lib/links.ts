import type { PageLink } from "./api";
import type { OpenTab } from "./tabs";

function displayName(path: string): string {
  return path.split("/").filter(Boolean).at(-1) ?? path;
}

export function linkToOpenTab(link: PageLink): OpenTab | null {
  if (!link.resolved || !link.target_path || !link.target_kind) {
    return null;
  }

  return {
    path: link.target_path,
    name: displayName(link.target_path),
    title:
      link.target_kind === "markdown" || link.target_kind === "card"
        ? link.target_title
        : null,
    mediaKind: link.target_kind
  };
}
