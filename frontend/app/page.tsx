'use client'

import ToolStrip from '@/components/ToolStrip'
import MapContainer from '@/components/MapContainer'
import FloatingSearch from '@/components/FloatingSearch'
import LoadingSpinner from '@/components/LoadingSpinner'
import Navbar from '@/components/Navbar'
import { useState } from 'react'

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTool, setActiveTool] = useState('select')
  const [showToolStrip, setShowToolStrip] = useState(true)
  const [showSearch, setShowSearch] = useState(true)
  const [map, setMap] = useState<any>(null)


  return (
    <div className="app-container">
      <div className="app-layout">
        <Navbar
          onMenuToggle={() => setShowToolStrip(!showToolStrip)}
          onSearch={() => setShowSearch(!showSearch)}
          onSettings={() => {}}
        />

        <div className="main-content">
          <MapContainer
            activeTool={activeTool}
            onMapReady={setMap}
          />

          {showToolStrip && (
            <ToolStrip
              activeTool={activeTool}
              onToolSelect={setActiveTool}
              onStatsToggle={() => {}}
            />
          )}

          {showSearch && <FloatingSearch map={map} />}

        </div>
      </div>

      {isLoading && <LoadingSpinner />}
    </div>
  )
}