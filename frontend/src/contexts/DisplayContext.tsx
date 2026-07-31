import { createContext, useContext, type ReactNode } from "react";

import type { DisplayApi } from "../hooks/useDisplay";
import type { Translator } from "../lang";
import type { WorldPathPickerFilter } from "../lib/worldPathPicker";

export type DisplayContextValue = DisplayApi & {
  onBlank: () => void;
  onClearAndShowFullscreen: (path?: string) => void;
  onRotatePrimary: () => void;
  onShowFullscreen: (path?: string) => void;
  t: Translator;
  onPickPath: (
    filter: WorldPathPickerFilter,
    title: string,
    onSelect: (path: string) => void
  ) => void;
};

const DisplayContext = createContext<DisplayContextValue | null>(null);

export function DisplayProvider({
  value,
  children
}: {
  value: DisplayContextValue;
  children: ReactNode;
}) {
  return <DisplayContext.Provider value={value}>{children}</DisplayContext.Provider>;
}

export function useDisplayContext(): DisplayContextValue {
  const context = useContext(DisplayContext);
  if (!context) {
    throw new Error("useDisplayContext must be used within DisplayProvider");
  }
  return context;
}
