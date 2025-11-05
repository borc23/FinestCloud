'use client'

import dynamic from 'next/dynamic'
import ToolStrip from '@/shared/components/layout/ToolStrip'
import LoadingSpinner from '@/shared/components/ui/LoadingSpinner'
import ImageUploadModal from '@/shared/components/ui/ImageUploadModal'
import ZoomableImage from '@/shared/components/ui/ZoomableImage'
import PanelSelectorButton from '@/features/solar-panels/components/PanelSelectorButton'
import PanelSelector from '@/features/solar-panels/components/PanelSelector'
import SaveProjectModal from '@/features/projects/components/SaveProjectModal'
import ProjectListPanel from '@/features/projects/components/ProjectListPanel'
import ProfilePanel from '@/features/auth/components/ProfilePanel'
import AuthRequiredOverlay from '@/features/auth/components/AuthRequiredOverlay'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { useToolState } from '@/shared/hooks/useToolState'
import { useModalState } from '@/shared/hooks/useModalState'
import { useProjectState } from '@/shared/hooks/useProjectState'
import { toast } from 'sonner'

const MapContainer = dynamic(() => import('@/features/map-drawing/components/MapContainer'), {
  ssr: false,
  loading: () => <LoadingSpinner />
})

export default function HomePage() {
  const { user } = useAuth()

  // Custom hooks for state management
  const { activeTool, setActiveTool, showToolStrip, showPanelsTool, setShowPanelsTool } = useToolState()
  const {
    showUploadModal,
    setShowUploadModal,
    showPanelSelector,
    setShowPanelSelector,
    showProfilePanel,
    setShowProfilePanel,
    showSaveModal,
    setShowSaveModal,
    showLoadPanel,
    setShowLoadPanel,
    isDashboardMinimized,
    setIsDashboardMinimized,
    isRoofAnglePanelOpen,
    setIsRoofAnglePanelOpen,
  } = useModalState()
  const {
    map,
    setMap,
    isImageMode,
    setIsImageMode,
    uploadedImage,
    setUploadedImage,
    getProjectDataRef,
    loadProjectRef,
  } = useProjectState()

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
              toast.success('Project loaded successfully')
            }
          } catch (error) {
            console.error('Failed to load project:', error)
            toast.error('Failed to load project. Please try again.')
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
              toast.success('Project loaded successfully')
            }
          } catch (error) {
            console.error('Failed to load project:', error)
            toast.error('Failed to load project. Please try again.')
          }
        }}
      />
    </div>
  )
}