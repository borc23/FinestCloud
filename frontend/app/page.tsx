'use client'

import dynamic from 'next/dynamic'
import ToolStrip from '@/components/layout/ToolStrip'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ImageUploadModal from '@/components/ui/ImageUploadModal'
import { useState } from 'react'

const MapContainer = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => <LoadingSpinner />
})

export default function HomePage() {
  const [activeTool, setActiveTool] = useState('')
  const [showToolStrip, setShowToolStrip] = useState(true)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [showPanelsTool, setShowPanelsTool] = useState(false)
  const [isImageMode, setIsImageMode] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)

  const handleToolSelect = (tool: string) => {
    setActiveTool(activeTool === tool ? '' : tool)
  }

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImage(imageUrl)
    setIsImageMode(true)
  }

  const handleToggleMode = () => {
    if (isImageMode) {
      // Switch to map mode
      setIsImageMode(false)
      // Reset map to default location
      if (map) {
        map.setCenter({ lat: 51.5074, lng: -0.1278 }) // Default location (London)
        map.setZoom(18)
      }
    } else {
      // Switch to image mode - open upload modal
      setShowUploadModal(true)
    }
  }

  return (
    <div className="app-container">
      <div className="app-layout">
        <div className="main-content">
          {isImageMode && uploadedImage ? (
            <div
              style={{
                width: '100%',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: '#2a2a2a',
                overflow: 'hidden',
                padding: '20px'
              }}
            >
              <img
                src={uploadedImage}
                alt="Uploaded"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                  display: 'block'
                }}
              />
            </div>
          ) : (
            <MapContainer
              activeTool={activeTool}
              onMapReady={setMap}
              onToolChange={setActiveTool}
              onPanelsAvailable={setShowPanelsTool}
            />
          )}

          {showToolStrip && (
            <ToolStrip
              activeTool={activeTool}
              onToolSelect={handleToolSelect}
              onStatsToggle={() => {}}
              showPanelsTool={showPanelsTool}
              map={map}
              isImageMode={isImageMode}
              onToggleMode={handleToggleMode}
            />
          )}

          <ImageUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onImageUpload={handleImageUpload}
          />
        </div>
      </div>
    </div>
  )
}