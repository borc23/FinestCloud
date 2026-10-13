"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import styles from "./MapContainer.module.css";
import CaptureOverlay from "./CaptureOverlay";
import EditDrawTabBar from "./EditDrawTabBar";
import MapControls from "./MapControls";
import PanelGenerationOverlay from "@/features/solar-analysis/components/PanelGenerationOverlay";
import RoofAnglePanel from "@/features/solar-analysis/components/RoofAnglePanel";
import SolarResultsDashboard from "@/features/solar-analysis/components/SolarResultsDashboard";
import GridSelector from "@/features/solar-panels/components/GridSelector";
import DataLayerOverlay from "@/features/solar-analysis/components/DataLayerOverlay";
import SunshineLayerControls from "@/features/solar-analysis/components/SunshineLayerControls";
import { useMapInitialization } from "@/features/map-drawing/hooks/useMapInitialization";
import { useDetection } from "@/features/solar-analysis/hooks/useDetection";
import { usePolygons } from "@/features/map-drawing/hooks/usePolygons";
import { useEditMode } from "@/features/map-drawing/hooks/useEditMode";
import { usePolygonManager } from "@/features/map-drawing/hooks/usePolygonManager";
import { useDrawingMode } from "@/features/map-drawing/hooks/useDrawingMode";
import {
  calculateCentroid,
  extractPolygonCoordinates,
} from "@/features/map-drawing/utils/polygonUtils";
import { usePanelGeneration } from "@/features/solar-panels/hooks/usePanelGeneration";
import { usePanelPlacement } from "@/features/solar-panels/hooks/usePanelPlacement";
import { tagPanelWithGrid } from "@/features/solar-panels/utils/gridSnapping";
import { usePanelContext } from "@/features/solar-panels/context/PanelContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getDefaultLocation } from "@/features/auth/lib/profilesApi";
import { getProject } from "@/features/projects/lib/projectsApi";
import type { ProjectWithData } from "@/features/auth/types/database";
import type {
  ModuleSpecs,
  PanelGenerationResponse,
} from "@/features/solar-panels/types/panel";
import { Icon } from "@/shared/components/ui/Icon";

interface MapContainerProps {
  activeTool: string;
  onMapReady?: (map: google.maps.Map) => void;
  onToolChange: (tool: string) => void;
  onPanelsAvailable?: (available: boolean) => void;
  onDashboardMinimizeChange?: (minimized: boolean) => void;
  onRoofAnglePanelChange?: (isOpen: boolean) => void;
  onRegisterProjectDataGetter?: (getter: () => any) => void;
  onRegisterProjectLoader?: (
    loader: (projectId: string) => Promise<void>,
  ) => void;
  isAuthenticated?: boolean;
  onSaveProject?: () => void;
}

/** Rebuild generated-panel data from a saved project (DB → generator format) */
function projectToPanelData({
  roofAnalyses,
  panelConfigurations,
}: ProjectWithData): PanelGenerationResponse {
  return {
    roofs: roofAnalyses.map((roof) => {
      const config = panelConfigurations.find(
        (c) => c.roofAnalysisId === roof.id,
      );

      // Positions are saved either as coordinate arrays or as { coords, annualSunshineKwh }
      const panels = (config?.panelPositions ?? []).map((pos) => {
        const coords = Array.isArray(pos) ? pos : pos.coords;
        return {
          coords,
          ...calculateCentroid(coords ?? []),
          annualSunshineKwh: Array.isArray(pos)
            ? undefined
            : pos.annualSunshineKwh,
        };
      });

      // Older saves use power/width/height instead of power_w/width_cm/height_cm
      const specs = config?.moduleSpecs as
        | Record<string, number | undefined>
        | undefined;
      const moduleSpecs = (
        specs
          ? {
              power_w: specs.power_w || specs.power || roof.panelWattage,
              width_cm: specs.width_cm || specs.width || 100,
              height_cm: specs.height_cm || specs.height || 170,
              efficiency: specs.efficiency || 0.2,
            }
          : { power_w: roof.panelWattage }
      ) as ModuleSpecs;

      return {
        roof_id: roof.roofIndex,
        panels,
        panel_count: roof.panelCount,
        module_type: config?.moduleType || "custom",
        module_specs: moduleSpecs,
        coords: roof.roofPolygon,
        azimuth: roof.azimuth,
        pitch: roof.pitch,
      };
    }),
    max_panels: roofAnalyses.reduce((sum, r) => sum + r.panelCount, 0),
    module: "custom",
  };
}

export default function MapContainer({
  activeTool,
  onMapReady,
  onToolChange,
  onPanelsAvailable,
  onDashboardMinimizeChange,
  onRoofAnglePanelChange,
  onRegisterProjectDataGetter,
  onRegisterProjectLoader,
  isAuthenticated = false,
  onSaveProject,
}: MapContainerProps) {
  // ========================================
  // Refs and State
  // ========================================
  const { user } = useAuth();
  const mapRef = useRef<HTMLDivElement>(null);
  const [drawingTypeSelection, setDrawingTypeSelection] = useState<
    "roof" | "object" | "panel"
  >("roof");
  const [showSunshineLayer, setShowSunshineLayer] = useState(false);
  const [hidePanelsInSunshineMode, setHidePanelsInSunshineMode] =
    useState(false);
  const [defaultCenter, setDefaultCenter] = useState<
    { lat: number; lng: number } | undefined
  >(undefined);
  // Unified panel state - single source of truth for all panels
  const [allPanels, setAllPanels] = useState<google.maps.Polygon[]>([]);

  const activeTab: "edit" | "draw" = activeTool === "draw" ? "draw" : "edit";
  const { selectedPanel } = usePanelContext();

  // Fetch user's default location
  useEffect(() => {
    if (user?.id) {
      getDefaultLocation(user.id).then((location) => {
        if (location) {
          setDefaultCenter(location);
        }
      });
    }
  }, [user?.id]);

  // ========================================
  // Custom Hooks
  // ========================================

  // Map initialization with user's default location
  const map = useMapInitialization(mapRef, { onMapReady, defaultCenter });

  // Move map to default location when it becomes available
  useEffect(() => {
    if (map && defaultCenter) {
      map.setCenter(defaultCenter);
    }
  }, [map, defaultCenter]);

  const { error: detectionError, detectRoofs, clearError } = useDetection();

  const {
    roofPolygons,
    objectPolygons,
    renderPolygons,
    clearAllPolygons,
    setPolygonsVisible,
    removePolygons,
  } = usePolygons(map);

  const allPolygons = useMemo(
    () => [...roofPolygons, ...objectPolygons, ...allPanels],
    [roofPolygons, objectPolygons, allPanels],
  );

  const handleDeletePolygons = useCallback(
    (deletedPolygons: google.maps.Polygon[]) => {
      removePolygons(deletedPolygons);
      setAllPanels((prev) => prev.filter((p) => !deletedPolygons.includes(p)));
    },
    [removePolygons],
  );

  const { isEditMode, setIsEditMode, selectedPolygons, selectPolygon } =
    useEditMode({ map, onDeletePolygons: handleDeletePolygons, allPolygons });

  // Handle polygon creation from drawing
  const handlePolygonComplete = useCallback(
    (path: google.maps.LatLng[], isRoof: boolean) => {
      const coords = path.map((p) => ({ lat: p.lat(), lng: p.lng() }));
      renderPolygons([{ coords }], isRoof, activeTool !== "draw");
    },
    [renderPolygons, activeTool],
  );

  const { isDrawing, startDrawing, stopDrawing } = useDrawingMode({
    map,
    isEditMode,
    onPolygonComplete: handlePolygonComplete,
  });

  usePolygonManager({
    roofPolygons,
    objectPolygons,
    panels: allPanels,
    isEditMode,
    isDrawing,
    selectedPolygons,
    onSelectPolygon: selectPolygon,
  });

  const {
    isGenerating,
    progress,
    solarData,
    panelData,
    showAnglePanel,
    panelMarkers,
    geotiffData,
    annualFluxUrl,
    startPanelGeneration,
    handleAngleConfirm: handleAngleConfirmHook,
    handleAngleCancel: handleAngleCancelHook,
    clearPanels,
    loadGeotiffDataFromUrl,
  } = usePanelGeneration({
    map,
    roofPolygons,
    onPanelsGenerated: () => setPolygonsVisible(false),
  });

  // Replace previously generated panels with new ones; keep manually placed panels
  const generatedPanelsRef = useRef<google.maps.Polygon[]>([]);
  useEffect(() => {
    const previous = new Set(generatedPanelsRef.current);
    generatedPanelsRef.current = panelMarkers;
    setAllPanels((prev) => [
      ...prev.filter((p) => !previous.has(p)),
      ...panelMarkers,
    ]);
  }, [panelMarkers]);

  // Notify parent when roof angle panel state changes
  useEffect(() => {
    onRoofAnglePanelChange?.(showAnglePanel);
  }, [showAnglePanel, onRoofAnglePanelChange]);

  // Register project data getter for save functionality
  useEffect(() => {
    if (!onRegisterProjectDataGetter || !map) return;

    onRegisterProjectDataGetter(() => ({
      mapCenter: {
        lat: map.getCenter()?.lat() ?? 0,
        lng: map.getCenter()?.lng() ?? 0,
      },
      mapZoom: map.getZoom() ?? 18,
      annualFluxUrl: annualFluxUrl ?? null,
      roofs: roofPolygons.map((polygon, index) => {
        const roofPanelData = panelData?.roofs?.find(
          (r) => r.roof_id === index,
        );
        return {
          roofIndex: index,
          polygon: extractPolygonCoordinates(polygon),
          azimuth: roofPanelData?.azimuth ?? 0,
          pitch: roofPanelData?.pitch ?? 0,
          panelCount: roofPanelData?.panel_count ?? 0,
          panelWattage: roofPanelData?.module_specs?.power_w ?? 400,
          estimatedOutput:
            solarData?.[index]?.solarData?.solarPotential?.solarPanels
              ?.yearlyEnergyDcKwh,
          // Keep per-panel sunshine so reloaded projects estimate the same production
          panelPositions: roofPanelData?.panels?.map(
            ({ coords, annualSunshineKwh }) => ({ coords, annualSunshineKwh }),
          ),
          moduleType: roofPanelData?.module_type,
          moduleSpecs: roofPanelData?.module_specs,
        };
      }),
      objects: objectPolygons.map((polygon) => ({
        coords: extractPolygonCoordinates(polygon),
      })),
    }));
  }, [
    map,
    roofPolygons,
    objectPolygons,
    panelData,
    solarData,
    annualFluxUrl,
    onRegisterProjectDataGetter,
  ]);

  // Register project loader for load functionality
  useEffect(() => {
    if (!onRegisterProjectLoader || !map) return;

    onRegisterProjectLoader(async (projectId: string) => {
      try {
        const projectWithData = await getProject(projectId);
        if (!projectWithData) {
          throw new Error("Project not found");
        }
        const { project, roofAnalyses, objectPolygons } = projectWithData;

        clearAllPolygons();
        clearPanels();

        map.setCenter({ lat: project.mapCenterLat, lng: project.mapCenterLng });
        map.setZoom(project.mapZoom);

        // Roof outlines are rendered hidden; objects stay visible
        if (roofAnalyses.length > 0) {
          renderPolygons(
            roofAnalyses.map((roof) => ({ coords: roof.roofPolygon })),
            true,
            false,
          );
          setPolygonsVisible(false, true);
        }
        if (objectPolygons.length > 0) {
          renderPolygons(
            objectPolygons.map((obj) => ({ coords: obj.polygonCoords })),
            false,
            false,
          );
        }

        if (project.annualFluxUrl) {
          loadGeotiffDataFromUrl(project.annualFluxUrl);
        }

        setTimeout(() => {
          handleAngleConfirmHook({
            angles: roofAnalyses.map((r) => r.pitch),
            edgePadding: 0.5,
            panelData: projectToPanelData(projectWithData),
          });
        }, 300);
      } catch (error) {
        console.error("Error loading project:", error);
        throw error;
      }
    });
  }, [
    map,
    clearAllPolygons,
    clearPanels,
    renderPolygons,
    onRegisterProjectLoader,
    loadGeotiffDataFromUrl,
    handleAngleConfirmHook,
    setPolygonsVisible,
  ]);

  const handlePanelPlaced = useCallback(
    (panel: google.maps.Polygon, gridId: number) => {
      tagPanelWithGrid(panel, gridId);
      setAllPanels((prev) => [...prev, panel]);
    },
    [],
  );

  const {
    isPlacing,
    startPlacement,
    stopPlacement,
    selectedGridId,
    availableGrids,
    setSelectedGridId,
  } = usePanelPlacement({
    map,
    isEditMode,
    existingPanels: allPanels,
    panelData,
    onPanelPlaced: handlePanelPlaced,
  });

  // ========================================
  // Event Handlers
  // ========================================

  const handleDrawingTypeChange = (type: "roof" | "object" | "panel") => {
    if (type === drawingTypeSelection) return;

    setDrawingTypeSelection(type);

    if (isDrawing) stopDrawing();
    if (isPlacing) stopPlacement();

    if (type === "panel") startPlacement();
    else startDrawing(type);
  };

  const handleAngleConfirm = async (
    data: Parameters<typeof handleAngleConfirmHook>[0],
  ) => {
    await handleAngleConfirmHook(data);
    setPolygonsVisible(false);
  };

  const handleAngleCancel = () => {
    handleAngleCancelHook();
    onToolChange("");
  };

  const handleReset = () => {
    clearAllPolygons();
    clearPanels();
    allPanels.forEach((panel) => panel.setMap(null));
    setAllPanels([]);
    setShowSunshineLayer(false);
    onToolChange("");
    setIsEditMode(false);
    if (isDrawing) stopDrawing();
    if (isPlacing) stopPlacement();
  };

  const handleDetection = async (
    bounds: google.maps.LatLngBounds | null,
    size?: { width: number; height: number },
  ) => {
    if (!map || !bounds) return;

    const result = await detectRoofs(map, bounds, size);
    if (result?.success) {
      clearAllPolygons();
      const enableHover = activeTool !== "draw";
      if (result.roofs) renderPolygons(result.roofs, true, enableHover);
      if (result.objects) renderPolygons(result.objects, false, enableHover);
      // Closes the capture overlay
      onToolChange("");
    }
  };

  // ========================================
  // Effects
  // ========================================

  // Regenerate panels when a different panel model is selected
  useEffect(() => {
    if (!panelData || !solarData || roofPolygons.length === 0) return;
    allPanels.forEach((panel) => panel.setMap(null));
    setAllPanels([]);
    clearPanels();
    requestAnimationFrame(() => startPanelGeneration());
    // Only a panel model change should trigger regeneration
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPanel]);

  // Notify parent about panels availability
  useEffect(() => {
    onPanelsAvailable?.(roofPolygons.length > 0);
  }, [roofPolygons.length, onPanelsAvailable]);

  // Manage edit/draw/placement mode based on active tool
  useEffect(() => {
    const isDrawTool = activeTool === "draw";
    const wantsPlacing = isDrawTool && drawingTypeSelection === "panel";
    const wantsDrawing = isDrawTool && drawingTypeSelection !== "panel";

    if (activeTool === "panels") startPanelGeneration();
    setIsEditMode(activeTool === "edit" || isDrawTool);

    if (wantsDrawing && !isDrawing) {
      startDrawing(drawingTypeSelection as "roof" | "object");
    } else if (!wantsDrawing && isDrawing) {
      stopDrawing();
    }
    if (wantsPlacing && !isPlacing) startPlacement();
    else if (!wantsPlacing && isPlacing) stopPlacement();
    // startPlacement is omitted on purpose: its identity changes with
    // panelData, which must not re-trigger panel generation
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeTool,
    isEditMode,
    isDrawing,
    isPlacing,
    drawingTypeSelection,
    stopDrawing,
    stopPlacement,
    startDrawing,
    startPanelGeneration,
  ]);

  // Lock map panning/zooming while editing, drawing or placing panels
  const isMapLocked = isEditMode || isDrawing || isPlacing;
  useEffect(() => {
    map?.setOptions({
      draggable: !isMapLocked,
      scrollwheel: !isMapLocked,
      gestureHandling: isMapLocked ? "none" : "greedy",
      disableDoubleClickZoom: isMapLocked,
      clickableIcons: !isMapLocked,
    });
  }, [map, isMapLocked]);

  // Hide panels while the sunshine layer is shown, if requested
  useEffect(() => {
    const visible = !(showSunshineLayer && hidePanelsInSunshineMode);
    allPanels.forEach((panel) => panel.setVisible(visible));
  }, [showSunshineLayer, hidePanelsInSunshineMode, allPanels]);

  // ========================================
  // Render
  // ========================================

  return (
    <div className={styles.mapContainer}>
      <div ref={mapRef} className={styles.map} />

      <CaptureOverlay
        isVisible={activeTool === "select"}
        onCapture={handleDetection}
        onToggle={() => onToolChange("")}
        map={map}
      />

      <GridSelector
        selectedGridId={selectedGridId}
        availableGrids={availableGrids}
        onGridSelect={setSelectedGridId}
        isVisible={isPlacing}
      />

      {isEditMode && (
        <EditDrawTabBar
          activeTab={activeTab}
          drawingType={drawingTypeSelection}
          onTabChange={onToolChange}
          onDrawingTypeChange={handleDrawingTypeChange}
          hasPanels={allPanels.length > 0}
        />
      )}

      {showAnglePanel && (
        <RoofAnglePanel
          roofPolygons={roofPolygons}
          objectPolygons={objectPolygons}
          solarData={solarData}
          onConfirm={handleAngleConfirm}
          onCancel={handleAngleCancel}
        />
      )}

      {panelData && map && (
        <SolarResultsDashboard
          panelGenerationData={panelData}
          mapCenter={map.getCenter()?.toJSON()}
          isEditMode={
            isEditMode || (activeTool !== "" && activeTool !== "panels")
          }
          onMinimizeChange={onDashboardMinimizeChange}
          currentPanelCount={allPanels.length}
          onSaveProject={onSaveProject}
          isAuthenticated={isAuthenticated}
        />
      )}

      <SunshineLayerControls
        visible={showSunshineLayer && allPanels.length > 0}
        hidePanels={hidePanelsInSunshineMode}
        onToggleHidePanels={setHidePanelsInSunshineMode}
      />

      <DataLayerOverlay
        map={map}
        geotiffData={geotiffData}
        visible={showSunshineLayer}
        clipToPolygons={roofPolygons}
      />

      <PanelGenerationOverlay isVisible={isGenerating} progress={progress} />

      {detectionError && (
        <div className={styles.errorNotification}>
          <div className={styles.errorCard}>
            <Icon name="warning" />
            <span>{detectionError}</span>
            <button onClick={clearError} className={styles.errorClose}>
              <Icon name="times" />
            </button>
          </div>
        </div>
      )}

      <MapControls
        map={map}
        hasPolygons={
          roofPolygons.length > 0 ||
          objectPolygons.length > 0 ||
          panelData !== null
        }
        hasPanels={allPanels.length > 0}
        hasGeotiffData={geotiffData != null}
        sunshineLayerEnabled={showSunshineLayer}
        onClearAll={handleReset}
        onToggleSunshineLayer={() => setShowSunshineLayer(!showSunshineLayer)}
      />
    </div>
  );
}
