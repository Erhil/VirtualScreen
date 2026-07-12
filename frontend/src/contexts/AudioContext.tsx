import { createContext, useContext, type ReactNode } from "react";

import type { AudioApi } from "../hooks/useAudio";
import type { Translator } from "../lang";
import type { WorldPathPickerFilter } from "../lib/worldPathPicker";

export type AudioContextValue = AudioApi & {
  t: Translator;
  onPickPath: (
    filter: WorldPathPickerFilter,
    title: string,
    onSelect: (path: string) => void
  ) => void;
};

const AudioContext = createContext<AudioContextValue | null>(null);

export function AudioProvider({
  value,
  children
}: {
  value: AudioContextValue;
  children: ReactNode;
}) {
  return <AudioContext.Provider value={value}>{children}</AudioContext.Provider>;
}

export function useAudioContext(): AudioContextValue {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error("useAudioContext must be used within AudioProvider");
  }
  return context;
}
