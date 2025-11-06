'use client'

import { createContext, useContext, useState, ReactNode, useCallback, useRef } from 'react'

interface PanelData {
  readonly id: string
  readonly name: string
  readonly manufacturer: string
  readonly width: number
  readonly height: number
  readonly power: number
  readonly efficiency: number
}

interface PanelContextType {
  selectedPanel: PanelData | null
  setSelectedPanel: (panel: PanelData | null) => void
  registerPanelChangeCallback: (callback: () => void) => () => void
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
  const callbacksRef = useRef<Set<() => void>>(new Set())

  const registerPanelChangeCallback = useCallback((callback: () => void) => {
    callbacksRef.current.add(callback)
    return () => {
      callbacksRef.current.delete(callback)
    }
  }, [])

  const handleSetSelectedPanel = useCallback((panel: PanelData | null) => {
    setSelectedPanel(panel)
    if (panel) {
      callbacksRef.current.forEach(cb => cb())
    }
  }, [])

  const contextValue = {
    selectedPanel,
    setSelectedPanel: handleSetSelectedPanel,
    registerPanelChangeCallback
  }

  return (
    <PanelContext.Provider value={contextValue}>
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
