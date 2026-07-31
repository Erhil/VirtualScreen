import { createContext, useContext, type ReactNode } from "react";

import type { MapApi } from "../hooks/useMap";
import type { Translator } from "../lang";
import type { WorldPathPickerFilter } from "../lib/worldPathPicker";

export type MapContextValue = MapApi & {
  t: Translator;
  onPickPath: (
    filter: WorldPathPickerFilter,
    title: string,
    onSelect: (path: string) => void
  ) => void;
};

const MapContext = createContext<MapContextValue | null>(null);

export function MapProvider({
  value,
  children
}: {
  value: MapContextValue;
  children: ReactNode;
}) {
  return <MapContext.Provider value={value}>{children}</MapContext.Provider>;
}

export function useMapContext(): MapContextValue {
  const context = useContext(MapContext);
  if (!context) {
    throw new Error("useMapContext must be used within MapProvider");
  }
  return context;
}
