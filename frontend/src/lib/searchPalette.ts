export type SearchPaletteKey = "ArrowDown" | "ArrowUp" | "Home" | "End" | "Escape" | string;

function normalizeSearchSelection(
  selectedIndex: number | null,
  resultCount: number
): number | null {
  if (resultCount <= 0) {
    return null;
  }
  if (selectedIndex === null || selectedIndex < 0 || selectedIndex >= resultCount) {
    return null;
  }
  return selectedIndex;
}

export function moveSearchResultSelection(
  selectedIndex: number | null,
  key: SearchPaletteKey,
  resultCount: number
): number | null {
  if (resultCount <= 0) {
    return null;
  }

  const currentIndex = normalizeSearchSelection(selectedIndex, resultCount);

  if (key === "ArrowDown") {
    return currentIndex === null ? 0 : (currentIndex + 1) % resultCount;
  }
  if (key === "ArrowUp") {
    return currentIndex === null ? resultCount - 1 : (currentIndex - 1 + resultCount) % resultCount;
  }
  if (key === "Home") {
    return 0;
  }
  if (key === "End") {
    return resultCount - 1;
  }
  if (key === "Escape") {
    return null;
  }
  return currentIndex;
}

export function selectedSearchResult<T>(results: T[], selectedIndex: number | null): T | null {
  if (selectedIndex === null || selectedIndex < 0 || selectedIndex >= results.length) {
    return null;
  }
  return results[selectedIndex];
}
