// Tracks world paths that were just written by this app (not by an external
// editor, sync tool, or another process). The backend's file watcher reindexes
// and pushes a world event on any change, including our own writes; consulting
// this registry lets the UI ignore its own writes while still reacting to
// genuine external changes.
const localWritePaths = new Set<string>();

const LOCAL_WRITE_TIMEOUT_MS = 15000;

export function markLocalWrite(paths: string[]): void {
  for (const path of paths) {
    localWritePaths.add(path);
  }
  // Use the global timer functions (not window.setTimeout) so this module
  // behaves identically in the browser and under Node-based unit tests.
  setTimeout(() => {
    for (const path of paths) {
      localWritePaths.delete(path);
    }
  }, LOCAL_WRITE_TIMEOUT_MS);
}

export function unmarkLocalWrite(paths: string[]): void {
  for (const path of paths) {
    localWritePaths.delete(path);
  }
}

export function isLocalWrite(path: string): boolean {
  return localWritePaths.has(path);
}

export function clearLocalWrites(): void {
  localWritePaths.clear();
}
