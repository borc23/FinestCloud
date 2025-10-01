'use client'

import dynamic from 'next/dynamic'
import ToolStrip from '@/components/ToolStrip'
import FloatingSearch from '@/components/FloatingSearch'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useState } from 'react'

const MapContainer = dynamic(() => import('@/components/MapContainer'), {
  ssr: false,
  loading: () => <LoadingSpinner />
})

export default function HomePage() {
  const [activeTool, setActiveTool] = useState('')
  const [showToolStrip, setShowToolStrip] = useState(true)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [showPanelsTool, setShowPanelsTool] = useState(false)

  const handleToolSelect = (tool: string) => {
    setActiveTool(activeTool === tool ? '' : tool)
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

          {activeTool === 'search' && <FloatingSearch map={map} />}
        </div>
      </div>
    </div>
  )
}