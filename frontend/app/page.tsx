'use client'

import ToolStrip from '@/components/ToolStrip'
import MapContainer from '@/components/MapContainer'
import FloatingSearch from '@/components/FloatingSearch'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useState, useCallback } from 'react'

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTool, setActiveTool] = useState('')
  const [showToolStrip, setShowToolStrip] = useState(true)
  const [showSearch, setShowSearch] = useState(false)
  const [map, setMap] = useState<any>(null)
  const [showPanelsTool, setShowPanelsTool] = useState(false)

  const handleToolSelect = (tool: string) => {
    if (tool === 'search') {
      setShowSearch(!showSearch)
    } else {
      setActiveTool(tool)
    }
  }

  return (
    <div className="app-container">
      <div className="app-layout">
        <div className="main-content">
          <MapContainer
            activeTool={activeTool}
            onMapReady={setMap}
            onToolChange={setActiveTool}
            onPanelsAvailable={setShowPanelsTool}
          />

          {showToolStrip && (
            <ToolStrip
              activeTool={activeTool}
              onToolSelect={handleToolSelect}
              onStatsToggle={() => {}}
              showPanelsTool={showPanelsTool}
            />
          )}

          {showSearch && <FloatingSearch map={map} />}
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
    </div>
  )
}