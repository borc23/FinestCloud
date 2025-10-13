'use client'

import { createContext, useContext, useState, ReactNode, useCallback } from 'react'

interface PanelData {
  id: string
  name: string
  manufacturer: string
  width: number
  height: number
  power: number
  efficiency: number
}

interface PanelContextType {
  selectedPanel: PanelData | null
  setSelectedPanel: (panel: PanelData | null) => void
  onPanelChangeWhileGenerated?: () => void
  registerPanelChangeCallback: (callback: () => void) => void
}

const PanelContext = createContext<PanelContextType | undefined>(undefined)

const DEFAULT_PANEL: PanelData = {
  id: "sunpower_maxeon_3",
  name: "SunPower Maxeon 3",
  manufacturer: "SunPower",
  width: 1.046,
  height: 1.690,
  power: 400,
  efficiency: 22.6
}

export function PanelProvider({ children }: { children: ReactNode }) {
  const [selectedPanel, setSelectedPanel] = useState<PanelData | null>(DEFAULT_PANEL)
  const [panelChangeCallback, setPanelChangeCallback] = useState<(() => void) | null>(null)

  const registerPanelChangeCallback = useCallback((callback: () => void) => {
    setPanelChangeCallback(() => callback)
  }, [])

  const handleSetSelectedPanel = useCallback((panel: PanelData | null) => {
    setSelectedPanel(panel)
    // Trigger callback if panel changed and callback is registered
    if (panel && panelChangeCallback) {
      panelChangeCallback()
    }
  }, [panelChangeCallback])

  return (
    <PanelContext.Provider value={{
      selectedPanel,
      setSelectedPanel: handleSetSelectedPanel,
      registerPanelChangeCallback
    }}>
      {children}
    </PanelContext.Provider>
  )
}

export function usePanelContext() {
  const context = useContext(PanelContext)
  if (context === undefined) {
    throw new Error('usePanelContext must be used within a PanelProvider')
  }
  return context
}
