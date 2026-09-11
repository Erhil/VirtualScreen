import { useEffect, useState } from "react";

import { fetchAudioLibrary, type WorldEntry } from "../lib/api";
import { flattenWorldPathPickerEntries, type WorldPathPickerFilter } from "../lib/worldPathPicker";
import { type AudioApi } from "./useAudio";

type WorldPathPickerState =
  | { open: false }
  | {
      open: true;
      filter: WorldPathPickerFilter;
      title: string;
      onSelect: (path: string) => void;
    };

export type UsePathPickerOptions = {
  worldTree: WorldEntry | null;
  audio: AudioApi;
};

// The world path picker dialog, opened by other tools to let the DM choose a path.
export function usePathPicker({ worldTree, audio }: UsePathPickerOptions) {
  const [pathPickerState, setPathPickerState] = useState<WorldPathPickerState>({
    open: false
  });

  useEffect(() => {
    if (!pathPickerState.open || pathPickerState.filter !== "audio") {
      return;
    }
    if (audio.audioState.status === "ready" || audio.audioState.status === "loading") {
      return;
    }
    let cancelled = false;
    audio.setAudioState({ status: "loading" });
    fetchAudioLibrary()
      .then((tracks) => {
        if (!cancelled) {
          audio.setAudioState({ status: "ready", tracks });
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          const message = error instanceof Error ? error.message : "Unknown error";
          audio.setAudioState({ status: "error", message });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [audio.audioState.status, pathPickerState]);

  const pathPickerCandidates = flattenWorldPathPickerEntries(
    worldTree,
    audio.audioState.status === "ready" ? audio.audioState.tracks : audio.audioAutocompleteTracks
  );

  function handleOpenWorldPathPicker(
    filter: WorldPathPickerFilter,
    title: string,
    onSelect: (path: string) => void
  ) {
    setPathPickerState({
      open: true,
      filter,
      title,
      onSelect
    });
  }

  function closePathPicker() {
    setPathPickerState({ open: false });
  }

  function selectPath(path: string) {
    if (pathPickerState.open) {
      pathPickerState.onSelect(path);
    }
    setPathPickerState({ open: false });
  }

  return {
    pathPickerState,
    pathPickerCandidates,
    handleOpenWorldPathPicker,
    closePathPicker,
    selectPath
  };
}
