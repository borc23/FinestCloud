"use client";

import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import ToolStrip from "@/shared/components/layout/ToolStrip";
import LoadingSpinner from "@/shared/components/ui/LoadingSpinner";
import PanelSelectorButton from "@/features/solar-panels/components/PanelSelectorButton";
import PanelSelector from "@/features/solar-panels/components/PanelSelector";
import SaveProjectModal from "@/features/projects/components/SaveProjectModal";
import ProfilePanel from "@/features/auth/components/ProfilePanel";
import AuthRequiredOverlay from "@/features/auth/components/AuthRequiredOverlay";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useBackendWarmup } from "@/shared/hooks/useBackendWarmup";
import type { CreateProjectData } from "@/features/auth/types/database";
import { toast } from "sonner";

const MapContainer = dynamic(
  () => import("@/features/map-drawing/components/MapContainer"),
  {
    ssr: false,
    loading: () => <LoadingSpinner />,
  },
);

export default function HomePage() {
  const { user } = useAuth();
  useBackendWarmup();

  const [activeTool, setActiveTool] = useState("");
  const [showPanelsTool, setShowPanelsTool] = useState(false);
  const [showPanelSelector, setShowPanelSelector] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [isDashboardMinimized, setIsDashboardMinimized] = useState(true);
  const [isRoofAnglePanelOpen, setIsRoofAnglePanelOpen] = useState(false);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const getProjectDataRef = useRef<
    (() => Omit<CreateProjectData, "projectName" | "status">) | null
  >(null);
  const loadProjectRef = useRef<((projectId: string) => Promise<void>) | null>(
    null,
  );

  const handleToolSelect = (tool: string) => {
    if (!user) {
      setShowProfilePanel(true);
      return;
    }
    setActiveTool(activeTool === tool ? "" : tool);
  };

  const handleSaveProject = () => {
    if (!user) {
      setShowProfilePanel(true);
      return;
    }
    setShowSaveModal(true);
  };

  return (
    <div className="app-container">
      <div className="app-layout">
        <div className="main-content">
          <MapContainer
            activeTool={activeTool}
            onMapReady={setMap}
            onToolChange={setActiveTool}
            onPanelsAvailable={setShowPanelsTool}
            onDashboardMinimizeChange={setIsDashboardMinimized}
            onRoofAnglePanelChange={setIsRoofAnglePanelOpen}
            onRegisterProjectDataGetter={(getter) => {
              getProjectDataRef.current = getter;
            }}
            onRegisterProjectLoader={(loader) => {
              loadProjectRef.current = loader;
            }}
            isAuthenticated={!!user}
            onSaveProject={handleSaveProject}
          />

          <ToolStrip
            activeTool={activeTool}
            onToolSelect={handleToolSelect}
            showPanelsTool={showPanelsTool}
            map={map}
            isAuthenticated={!!user}
            onOpenProfile={() => setShowProfilePanel(true)}
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
          {!user && (
            <AuthRequiredOverlay
              onOpenProfile={() => setShowProfilePanel(true)}
            />
          )}
        </div>
      </div>

      {/* Project Modals */}
      {showSaveModal && getProjectDataRef.current && (
        <SaveProjectModal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          onSave={() => setShowSaveModal(false)}
          projectData={getProjectDataRef.current()}
        />
      )}

      {/* Profile Panel */}
      <ProfilePanel
        isOpen={showProfilePanel}
        onClose={() => setShowProfilePanel(false)}
        onLoadProject={async (projectId) => {
          try {
            if (loadProjectRef.current) {
              await loadProjectRef.current(projectId);
              toast.success("Project loaded successfully");
            }
          } catch (error) {
            console.error("Failed to load project:", error);
            toast.error("Failed to load project. Please try again.");
          }
        }}
      />
    </div>
  );
}
