import { useState } from 'react'

/**
 * Hook for managing tool-related state
 */
export function useToolState() {
  const [activeTool, setActiveTool] = useState('')
  const [showToolStrip, setShowToolStrip] = useState(true)
  const [showPanelsTool, setShowPanelsTool] = useState(false)

  return {
    activeTool,
    setActiveTool,
    showToolStrip,
    setShowToolStrip,
    showPanelsTool,
    setShowPanelsTool,
  }
}
