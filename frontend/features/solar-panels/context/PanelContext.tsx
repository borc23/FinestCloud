"use client";

import { createContext, useContext, useState, ReactNode } from "react";

export interface PanelData {
  readonly id: string;
  readonly name: string;
  readonly manufacturer: string;
  readonly width: number;
  readonly height: number;
  readonly power: number;
  readonly efficiency: number;
}

interface PanelContextType {
  selectedPanel: PanelData | null;
  setSelectedPanel: (panel: PanelData | null) => void;
}

const PanelContext = createContext<PanelContextType | undefined>(undefined);

const DEFAULT_PANEL: PanelData = {
  id: "sunpower_maxeon_3",
  name: "SunPower Maxeon 3",
  manufacturer: "SunPower",
  width: 1.046,
  height: 1.69,
  power: 400,
  efficiency: 22.6,
};

export function PanelProvider({ children }: { children: ReactNode }) {
  const [selectedPanel, setSelectedPanel] = useState<PanelData | null>(
    DEFAULT_PANEL,
  );

  return (
    <PanelContext.Provider value={{ selectedPanel, setSelectedPanel }}>
      {children}
    </PanelContext.Provider>
  );
}

export function usePanelContext() {
  const context = useContext(PanelContext);
  if (context === undefined) {
    throw new Error("usePanelContext must be used within a PanelProvider");
  }
  return context;
}
