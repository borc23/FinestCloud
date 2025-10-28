'use client'

import dynamic from 'next/dynamic'
import ToolStrip from '@/components/layout/ToolStrip'
import LoadingSpinner from '@/components/ui/LoadingSpinner'
import ImageUploadModal from '@/components/ui/ImageUploadModal'
import ZoomableImage from '@/components/ui/ZoomableImage'
import PanelSelectorButton from '@/components/panels/PanelSelectorButton'
import PanelSelector from '@/components/panels/PanelSelector'
import SaveProjectModal from '@/components/projects/SaveProjectModal'
import ProjectListPanel from '@/components/projects/ProjectListPanel'
import ProfilePanel from '@/components/auth/ProfilePanel'
import AuthRequiredOverlay from '@/components/auth/AuthRequiredOverlay'
import { useState, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import type { CreateProjectData } from '@/types/database'

const MapContainer = dynamic(() => import('@/components/map/MapContainer'), {
  ssr: false,
  loading: () => <LoadingSpinner />
})

export default function HomePage() {
  const { user } = useAuth()
  const [activeTool, setActiveTool] = useState('')
  const [showToolStrip, setShowToolStrip] = useState(true)
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [showPanelsTool, setShowPanelsTool] = useState(false)
  const [isImageMode, setIsImageMode] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)
  const [showUploadModal, setShowUploadModal] = useState(false)
  const [showPanelSelector, setShowPanelSelector] = useState(false)
  const [isDashboardMinimized, setIsDashboardMinimized] = useState(true)
  const [isRoofAnglePanelOpen, setIsRoofAnglePanelOpen] = useState(false)

  // Profile panel
  const [showProfilePanel, setShowProfilePanel] = useState(false)

  // Project modals
  const [showSaveModal, setShowSaveModal] = useState(false)
  const [showLoadPanel, setShowLoadPanel] = useState(false)

  // Project data callback refs
  const getProjectDataRef = useRef<(() => Omit<CreateProjectData, 'projectName' | 'status'>) | null>(null)
  const loadProjectRef = useRef<((projectId: string) => Promise<void>) | null>(null)

  const handleToolSelect = (tool: string) => {
    if (!user) {
      setShowProfilePanel(true)
      return
    }
    setActiveTool(activeTool === tool ? '' : tool)
  }

  const handleImageUpload = (imageUrl: string) => {
    setUploadedImage(imageUrl)
    setIsImageMode(true)
  }

  const handleToggleMode = () => {
    if (!user) {
      setShowProfilePanel(true)
      return
    }
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

  const handleSaveProject = () => {
    if (!user) {
      setShowProfilePanel(true)
      return
    }
    setShowSaveModal(true)
  }

  const handleLoadProject = () => {
    if (!user) {
      setShowProfilePanel(true)
      return
    }
    setShowLoadPanel(true)
  }

  return (
    <div className="app-container">
      <div className="app-layout">
        <div className="main-content">
          {isImageMode && uploadedImage ? (
            <ZoomableImage src={uploadedImage} alt="Uploaded" />
          ) : (
            <MapContainer
              activeTool={activeTool}
              onMapReady={setMap}
              onToolChange={setActiveTool}
              onPanelsAvailable={setShowPanelsTool}
              onDashboardMinimizeChange={setIsDashboardMinimized}
              onRoofAnglePanelChange={setIsRoofAnglePanelOpen}
              onRegisterProjectDataGetter={(getter) => {
                getProjectDataRef.current = getter
              }}
              onRegisterProjectLoader={(loader) => {
                loadProjectRef.current = loader
              }}
              isAuthenticated={!!user}
              onSaveProject={handleSaveProject}
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
              isAuthenticated={!!user}
              onOpenProfile={() => setShowProfilePanel(true)}
            />
          )}

          <ImageUploadModal
            isOpen={showUploadModal}
            onClose={() => setShowUploadModal(false)}
            onImageUpload={handleImageUpload}
          />

          {isDashboardMinimized && !isRoofAnglePanelOpen && user && (
            <PanelSelectorButton onClick={() => setShowPanelSelector(true)} />
          )}

          {user && (
            <PanelSelector
              isOpen={showPanelSelector}
              onClose={() => setShowPanelSelector(false)}
            />
          )}

          {/* Auth Required Overlay */}
          {!user && <AuthRequiredOverlay onOpenProfile={() => setShowProfilePanel(true)} />}
        </div>
      </div>

      {/* Project Modals */}
      {showSaveModal && getProjectDataRef.current && (
        <SaveProjectModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={(projectId) => {
            setShowSaveModal(false)
          }}
          projectData={getProjectDataRef.current()}
        />
      )}

      <ProjectListPanel
        isOpen={showLoadPanel}
        onClose={() => setShowLoadPanel(false)}
        onLoadProject={async (projectId) => {
          try {
            if (loadProjectRef.current) {
              await loadProjectRef.current(projectId)
              setShowLoadPanel(false)
            }
          } catch (error) {
            console.error('Failed to load project:', error)
            alert('Failed to load project. Please try again.')
          }
        }}
      />

      {/* Profile Panel */}
      <ProfilePanel
        isOpen={showProfilePanel}
        onClose={() => setShowProfilePanel(false)}
        onLoadProject={async (projectId) => {
          try {
            if (loadProjectRef.current) {
              await loadProjectRef.current(projectId)
            }
          } catch (error) {
            console.error('Failed to load project:', error)
            alert('Failed to load project. Please try again.')
          }
        }}
      />
    </div>
  )
}