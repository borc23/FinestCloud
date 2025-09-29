'use client'

import ToolStrip from '@/components/ToolStrip'
import MapContainer from '@/components/MapContainer'
import FloatingSearch from '@/components/FloatingSearch'
import LoadingSpinner from '@/components/LoadingSpinner'
import Navbar from '@/components/Navbar'
import { useState, useCallback } from 'react'

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTool, setActiveTool] = useState('')
  const [showToolStrip, setShowToolStrip] = useState(true)
  const [showSearch, setShowSearch] = useState(true)
  const [map, setMap] = useState<any>(null)
  const [showPanelsTool, setShowPanelsTool] = useState(false)

  const handlePanelsAvailable = useCallback((available: boolean) => {
    setShowPanelsTool(available)
  }, [])

  // Example: Show panels tool when image is uploaded and area is selected
  // This should be updated with proper logic based on application state
  // useEffect(() => {
  //   if (hasUploadedImage && hasSelectedArea) {
  //     setShowPanelsTool(true)
  //   }
  // }, [hasUploadedImage, hasSelectedArea])

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
            onPanelsAvailable={handlePanelsAvailable}
          />

          {showToolStrip && (
            <ToolStrip
              activeTool={activeTool}
              onToolSelect={setActiveTool}
              onStatsToggle={() => {}}
              showPanelsTool={showPanelsTool}
            />
          )}

          {showSearch && <FloatingSearch map={map} />}

          {/* Debug: Toggle Panels Tool Visibility */}
          <button
            onClick={() => setShowPanelsTool(!showPanelsTool)}
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              padding: '12px 20px',
              backgroundColor: showPanelsTool ? '#10b981' : '#6b7280',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
              zIndex: 1000
            }}
          >
            {showPanelsTool ? 'Hide' : 'Show'} Panels Tool
          </button>

        </div>
      </div>

      {isLoading && <LoadingSpinner />}
    </div>
  )
}