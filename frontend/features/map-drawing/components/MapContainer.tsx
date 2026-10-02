"use client";

import { useEffect, useRef, useState, useCallback } from "react";
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
import { usePanelGeneration } from "@/features/solar-panels/hooks/usePanelGeneration";
import { usePanelPlacement } from "@/features/solar-panels/hooks/usePanelPlacement";
import { tagPanelWithGrid } from "@/features/solar-panels/utils/gridSnapping";
import { usePanelContext } from "@/features/solar-panels/context/PanelContext";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getDefaultLocation } from "@/features/auth/lib/profilesApi";
import { getProject } from "@/features/projects/lib/projectsApi";
import { Icon } from "@/shared/components/ui/Icon";

declare global {
  interface Window {
    google: typeof google;
    initMap: () => void;
  }
}

interface MapContainerProps {
  activeTool: string;
  onMapReady?: (map: any) => void;
  onToolChange?: (tool: string) => void;
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
  const [isImageView, setIsImageView] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [showCaptureOverlay, setShowCaptureOverlay] = useState(false);
  const [drawingTypeSelection, setDrawingTypeSelection] = useState<
    "roof" | "object" | "panel"
  >("roof");
  const [isDashboardMinimized, setIsDashboardMinimized] = useState(true);
  const [showSunshineLayer, setShowSunshineLayer] = useState(false);
  const [hidePanelsInSunshineMode, setHidePanelsInSunshineMode] =
    useState(false);

  // Ref to access dashboard minimize function
  const dashboardMinimizeRef = useRef<(() => void) | null>(null);
  const [defaultCenter, setDefaultCenter] = useState<
    { lat: number; lng: number } | undefined
  >(undefined);

  const activeTab: "edit" | "draw" = activeTool === "draw" ? "draw" : "edit";

  // Panel context
  const { registerPanelChangeCallback } = usePanelContext();

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

  // Notify parent when dashboard minimize state changes
  useEffect(() => {
    onDashboardMinimizeChange?.(isDashboardMinimized);
  }, [isDashboardMinimized, onDashboardMinimizeChange]);

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

  // Detection
  const { error: detectionError, detectRoofs, clearError } = useDetection();

  // Polygons
  const {
    roofPolygons,
    objectPolygons,
    renderPolygons,
    clearAllPolygons,
    togglePolygonVisibility,
    toggleRoofPolygonsVisibility,
    toggleObjectPolygonsVisibility,
    removeClickListener,
    removePolygons,
    hasRoofs,
  } = usePolygons(map);

  // Note: GeoTIFF data is now loaded during panel generation and cached in usePanelGeneration
  // The DataLayerOverlay component will use the cached geotiffData directly

  // Get panel markers first (temporary workaround - will be populated after panels are generated)
  const [allPolygonsForEdit, setAllPolygonsForEdit] = useState<
    google.maps.Polygon[]
  >([]);

  // Edit mode
  const {
    isEditMode,
    selectedPolygons,
    isCtrlPressed,
    toggleEditMode,
    selectPolygon,
    deleteSelected,
  } = useEditMode({
    map,
    onDeletePolygons: (deletedPolygons) => {
      removePolygons(deletedPolygons);
      // Remove from unified panel array
      setAllPanels((prev) => prev.filter((p) => !deletedPolygons.includes(p)));
    },
    allPolygons: allPolygonsForEdit,
  });

  // Handle polygon creation from drawing
  const handlePolygonComplete = useCallback(
    (path: google.maps.LatLng[], isRoof: boolean) => {
      if (!map) return;
      const coords = path.map((p) => ({ lat: p.lat(), lng: p.lng() }));

      const enableHover = activeTool !== "draw";
      renderPolygons([{ coords }], isRoof, enableHover);
    },
    [map, renderPolygons, activeTool],
  );

  // Drawing mode
  const { isDrawing, startDrawing, stopDrawing } = useDrawingMode({
    map,
    isEditMode,
    onPolygonComplete: handlePolygonComplete,
  });

  // Polygon manager
  const { updateAllPolygons } = usePolygonManager({
    map,
    isEditMode,
    selectedPolygons,
    isCtrlPressed,
    isDrawing,
    onSelectPolygon: selectPolygon,
    removeClickListener,
  });

  // Unified panel state - single source of truth for all panels
  const [allPanels, setAllPanels] = useState<google.maps.Polygon[]>([]);

  // Panel generation
  const {
    isGenerating,
    progress,
    solarData,
    panelData,
    showAnglePanel,
    panelMarkers,
    geotiffData,
    isLoadingGeotiff,
    annualFluxUrl,
    startPanelGeneration,
    handleAngleConfirm: handleAngleConfirmHook,
    handleAngleCancel: handleAngleCancelHook,
    clearPanels,
    loadGeotiffDataFromUrl,
  } = usePanelGeneration({
    map,
    roofPolygons,
    objectPolygons,
    onPanelsGenerated: (data) => togglePolygonVisibility(false),
  });

  // Sync generated panels to unified array
  useEffect(() => {
    setAllPanels((prev) => {
      // Remove old generated panels, keep manually placed ones
      const manualPanels = prev.filter((p) => !(p as any).__isGenerated);
      // Add new generated panels with marker
      const markedGeneratedPanels = panelMarkers.map((p) => {
        (p as any).__isGenerated = true;
        return p;
      });
      return [...manualPanels, ...markedGeneratedPanels];
    });
  }, [panelMarkers]);

  // Notify parent when roof angle panel state changes
  useEffect(() => {
    onRoofAnglePanelChange?.(showAnglePanel);
  }, [showAnglePanel, onRoofAnglePanelChange]);

  // Register project data getter for save functionality
  useEffect(() => {
    if (!onRegisterProjectDataGetter || !map) return;

    const getProjectData = () => {
      const mapCenter = map.getCenter();
      const mapZoom = map.getZoom();

      // Extract roof data
      const roofs = roofPolygons.map((polygon, index) => {
        const path = polygon.getPath();
        const coords = [];
        for (let i = 0; i < path.getLength(); i++) {
          const point = path.getAt(i);
          coords.push({ lat: point.lat(), lng: point.lng() });
        }

        const roofPanelData = panelData?.roofs?.find(
          (r) => r.roof_id === index,
        );

        return {
          roofIndex: index,
          polygon: coords,
          azimuth: roofPanelData?.azimuth ?? 0,
          pitch: roofPanelData?.pitch ?? 0,
          panelCount: roofPanelData?.panel_count ?? 0,
          panelWattage: roofPanelData?.module_specs?.power_w ?? 400,
          estimatedOutput:
            solarData?.[index]?.solarData?.solarPotential?.solarPanels
              ?.yearlyEnergyDcKwh,
          panelPositions: roofPanelData?.panels?.map((p) => p.coords ?? []),
          moduleType: roofPanelData?.module_type,
          moduleSpecs: roofPanelData?.module_specs,
        };
      });

      // Extract object polygons
      const objects = objectPolygons.map((polygon) => {
        const path = polygon.getPath();
        const coords = [];
        for (let i = 0; i < path.getLength(); i++) {
          const point = path.getAt(i);
          coords.push({ lat: point.lat(), lng: point.lng() });
        }
        return { coords };
      });

      return {
        mapCenter: {
          lat: mapCenter?.lat() ?? 0,
          lng: mapCenter?.lng() ?? 0,
        },
        mapZoom: mapZoom ?? 18,
        annualFluxUrl: annualFluxUrl ?? null,
        roofs,
        objects,
      };
    };

    onRegisterProjectDataGetter(getProjectData);
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

    const loadProject = async (projectId: string) => {
      try {
        console.log("=== PROJECT LOADING DEBUG ===");
        console.log("Loading project ID:", projectId);

        const projectWithData = await getProject(projectId);
        if (!projectWithData) {
          throw new Error("Project not found");
        }

        console.log(
          "Full projectWithData:",
          JSON.stringify(projectWithData, null, 2),
        );
        console.log("Project:", projectWithData.project);
        console.log(
          "Roof Analyses count:",
          projectWithData.roofAnalyses.length,
        );
        console.log("Roof Analyses data:", projectWithData.roofAnalyses);
        console.log(
          "Object Polygons count:",
          projectWithData.objectPolygons.length,
        );
        console.log("Object Polygons data:", projectWithData.objectPolygons);
        console.log(
          "Panel Configurations count:",
          projectWithData.panelConfigurations.length,
        );
        console.log(
          "Panel Configurations data:",
          projectWithData.panelConfigurations,
        );

        clearAllPolygons();
        clearPanels();

        map.setCenter({
          lat: projectWithData.project.mapCenterLat,
          lng: projectWithData.project.mapCenterLng,
        });
        map.setZoom(projectWithData.project.mapZoom);

        // Render roof polygons
        const roofCoords = projectWithData.roofAnalyses.map((roof) => ({
          coords: roof.roofPolygon,
        }));
        console.log("Roof coords to render:", roofCoords.length, roofCoords);
        if (roofCoords.length > 0) {
          renderPolygons(roofCoords, true, false);
          console.log("Roof polygons rendered, now hiding them");
          // Hide roof outlines after rendering
          toggleRoofPolygonsVisibility(false);
        } else {
          console.log("No roof coords to render");
        }

        // Render object polygons
        const objectCoords = projectWithData.objectPolygons.map((obj) => ({
          coords: obj.polygonCoords,
        }));
        console.log(
          "Object coords to render:",
          objectCoords.length,
          objectCoords,
        );
        if (objectCoords.length > 0) {
          renderPolygons(objectCoords, false, false);
          console.log("Object polygons rendered and should be visible");
          // Keep object polygons visible
        } else {
          console.log("No object polygons to render");
        }

        // Load GeoTIFF data if available
        if (projectWithData.project.annualFluxUrl) {
          loadGeotiffDataFromUrl(projectWithData.project.annualFluxUrl);
        }

        setTimeout(() => {
          if (!window.google?.maps) return;

          console.log("=== PANEL DATA GENERATION DEBUG ===");

          // Helper function to calculate panel center point
          const calculatePanelCenter = (
            coords: { lat: number; lng: number }[],
          ): { lat: number; lng: number } => {
            if (!coords || coords.length === 0) return { lat: 0, lng: 0 };
            const sum = coords.reduce(
              (acc, coord) => ({
                lat: acc.lat + coord.lat,
                lng: acc.lng + coord.lng,
              }),
              { lat: 0, lng: 0 },
            );
            return {
              lat: sum.lat / coords.length,
              lng: sum.lng / coords.length,
            };
          };

          const mockPanelData: any = {
            success: true,
            roofs: projectWithData.roofAnalyses.map((roof, index) => {
              console.log(
                `\n--- Processing Roof ${index} (roofIndex: ${roof.roofIndex}) ---`,
              );

              const config = projectWithData.panelConfigurations.find(
                (c) =>
                  projectWithData.roofAnalyses.find(
                    (r) => r.id === c.roofAnalysisId,
                  )?.roofIndex === roof.roofIndex,
              );

              console.log("Found config for roof:", config ? "YES" : "NO");
              if (config) {
                console.log("Config roofAnalysisId:", config.roofAnalysisId);
                console.log(
                  "Config panelPositions (raw from DB):",
                  config.panelPositions,
                );
                console.log(
                  "Config panelPositions count:",
                  config.panelPositions?.length || 0,
                );
                console.log(
                  "Config moduleSpecs (raw from DB):",
                  config.moduleSpecs,
                );
                console.log("Config moduleType:", config.moduleType);
              }

              // Transform panel positions from database format to Panel format
              // Handle both formats: Coordinate[][] (2D array) OR Array<{coords: Coordinate[]}>
              const panels = config?.panelPositions
                ? config.panelPositions.map((panelPos, pIndex) => {
                    // Check if panelPos is already a coordinate array or an object with coords property
                    const coords = Array.isArray(panelPos)
                      ? panelPos
                      : panelPos.coords;
                    console.log(`  Panel ${pIndex} - coords:`, coords);
                    console.log(
                      `  Panel ${pIndex} - coords type:`,
                      Array.isArray(panelPos)
                        ? "Array (2D)"
                        : "Object with coords property",
                    );
                    const center = calculatePanelCenter(coords);
                    console.log(
                      `  Panel ${pIndex} - calculated center:`,
                      center,
                    );
                    return {
                      coords: coords,
                      lat: center.lat,
                      lng: center.lng,
                      annualSunshineKwh: Array.isArray(panelPos)
                        ? undefined
                        : panelPos.annualSunshineKwh,
                    };
                  })
                : [];

              console.log("Transformed panels count:", panels.length);
              console.log("Transformed panels (first 2):", panels.slice(0, 2));

              // Transform moduleSpecs - handle both old format (power) and new format (power_w)
              const moduleSpecs = config?.moduleSpecs
                ? {
                    power_w:
                      (config.moduleSpecs as any).power_w ||
                      (config.moduleSpecs as any).power ||
                      roof.panelWattage,
                    width_cm:
                      (config.moduleSpecs as any).width_cm ||
                      (config.moduleSpecs as any).width ||
                      100,
                    height_cm:
                      (config.moduleSpecs as any).height_cm ||
                      (config.moduleSpecs as any).height ||
                      170,
                    efficiency: config.moduleSpecs.efficiency || 0.2,
                  }
                : { power_w: roof.panelWattage };

              console.log("Transformed moduleSpecs:", moduleSpecs);

              const roofData = {
                roof_id: roof.roofIndex,
                panels: panels,
                panel_count: roof.panelCount,
                module_type: config?.moduleType || "custom",
                module_specs: moduleSpecs,
                coords: roof.roofPolygon,
                azimuth: roof.azimuth,
                pitch: roof.pitch,
              };

              console.log("Final roof data object:", roofData);
              return roofData;
            }),
            max_panels: projectWithData.roofAnalyses.reduce(
              (sum, r) => sum + r.panelCount,
              0,
            ),
            module: "custom",
            electrical_system: null,
          };

          console.log("\n=== FINAL MOCK PANEL DATA ===");
          console.log("mockPanelData:", JSON.stringify(mockPanelData, null, 2));

          console.log("\n=== CALLING handleAngleConfirmHook ===");
          console.log(
            "Angles:",
            projectWithData.roofAnalyses.map((r) => r.pitch),
          );
          console.log("EdgePadding:", 0.5);
          console.log("PanelData passed to hook:", mockPanelData);

          handleAngleConfirmHook({
            angles: projectWithData.roofAnalyses.map((r) => r.pitch),
            edgePadding: 0.5,
            panelData: mockPanelData,
          });

          console.log(
            "handleAngleConfirmHook called - check for panel rendering",
          );
        }, 300);
      } catch (error) {
        console.error("Error loading project:", error);
        throw error;
      }
    };

    onRegisterProjectLoader(loadProject);
  }, [
    map,
    clearAllPolygons,
    clearPanels,
    renderPolygons,
    onRegisterProjectLoader,
    startPanelGeneration,
    loadGeotiffDataFromUrl,
    handleAngleConfirmHook,
    toggleRoofPolygonsVisibility,
  ]);

  // Panel placement
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
    onPanelPlaced: (panel, gridId) => {
      tagPanelWithGrid(panel, gridId);
      setAllPanels((prev) => [...prev, panel]);
    },
  });

  // ========================================
  // Event Handlers
  // ========================================

  const handleTabChange = useCallback(
    (tab: "edit" | "draw") => {
      onToolChange?.(tab);
    },
    [onToolChange],
  );

  const handleDrawingTypeChange = useCallback(
    (type: "roof" | "object" | "panel") => {
      if (type === drawingTypeSelection) return;

      setDrawingTypeSelection(type);

      if (isDrawing) stopDrawing();
      if (isPlacing) stopPlacement();

      type === "panel" ? startPlacement() : startDrawing(type);
    },
    [
      drawingTypeSelection,
      isDrawing,
      isPlacing,
      stopDrawing,
      startDrawing,
      startPlacement,
      stopPlacement,
    ],
  );

  const handleAngleConfirm = useCallback(
    async (data: any) => {
      await handleAngleConfirmHook(data);
      togglePolygonVisibility(false);
    },
    [handleAngleConfirmHook, togglePolygonVisibility],
  );

  const handleAngleCancel = useCallback(() => {
    handleAngleCancelHook();
    onToolChange?.("");
  }, [handleAngleCancelHook, onToolChange]);

  const handlePanelConfigChange = useCallback(() => {
    if (panelData && solarData && roofPolygons.length > 0) {
      setAllPanels((prevPanels) => {
        prevPanels.forEach((panel) => panel.setMap(null));
        return [];
      });

      clearPanels();

      requestAnimationFrame(() => {
        startPanelGeneration();
      });
    }
  }, [panelData, solarData, roofPolygons, clearPanels, startPanelGeneration]);

  // Register callback for panel config changes
  useEffect(() => {
    registerPanelChangeCallback(handlePanelConfigChange);
  }, [registerPanelChangeCallback, handlePanelConfigChange]);

  const handleReset = useCallback(() => {
    // Clear all polygons
    clearAllPolygons();

    // Clear panel markers
    clearPanels();

    // Clear all panels
    allPanels.forEach((panel) => panel.setMap(null));
    setAllPanels([]);

    // Clear capture overlay
    setShowCaptureOverlay(false);

    // Clear sunshine layer visualization
    setShowSunshineLayer(false);

    // Reset tool to default
    onToolChange?.("");

    // Exit edit/draw mode if active
    if (isEditMode) toggleEditMode();
    if (isDrawing) stopDrawing();
    if (isPlacing) stopPlacement();
  }, [
    clearAllPolygons,
    clearPanels,
    allPanels,
    onToolChange,
    isEditMode,
    isDrawing,
    isPlacing,
    toggleEditMode,
    stopDrawing,
    stopPlacement,
  ]);

  const handleDetection = useCallback(
    async (
      bounds: google.maps.LatLngBounds | null,
      size?: { width: number; height: number },
    ) => {
      if (!map || !bounds) return;

      try {
        const result = await detectRoofs(map, bounds, size);

        if (result?.success) {
          clearAllPolygons();
          const enableHover = activeTool !== "draw";

          if (result.roofs) {
            renderPolygons(result.roofs, true, enableHover);
          }
          if (result.objects) {
            renderPolygons(result.objects, false, enableHover);
          }

          setShowCaptureOverlay(false);
        }
      } catch (err) {
        console.error("Detection failed:", err);
      }
    },
    [map, detectRoofs, clearAllPolygons, renderPolygons, activeTool],
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type.startsWith("image/")) {
      setIsImageView(true);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setIsImageView(true);
    }
  };

  // ========================================
  // Effects
  // ========================================

  // Show/hide capture overlay based on active tool
  useEffect(() => {
    setShowCaptureOverlay(activeTool === "select");
  }, [activeTool]);

  // Notify parent about panels availability
  useEffect(() => {
    onPanelsAvailable?.(hasRoofs);
  }, [hasRoofs, onPanelsAvailable]);

  // Manage edit/draw mode based on active tool
  useEffect(() => {
    if (activeTool === "edit") {
      if (!isEditMode) toggleEditMode();
      if (isDrawing) stopDrawing();
      if (isPlacing) stopPlacement();
    } else if (activeTool === "draw") {
      if (!isEditMode) toggleEditMode();
      if (drawingTypeSelection === "panel") {
        if (!isPlacing) startPlacement();
        if (isDrawing) stopDrawing();
      } else {
        if (!isDrawing) startDrawing(drawingTypeSelection as "roof" | "object");
        if (isPlacing) stopPlacement();
      }
    } else if (activeTool === "panels") {
      startPanelGeneration();
      if (isEditMode) toggleEditMode();
      if (isDrawing) stopDrawing();
      if (isPlacing) stopPlacement();
    } else {
      if (isEditMode) toggleEditMode();
      if (isDrawing) stopDrawing();
      if (isPlacing) stopPlacement();
    }
  }, [
    activeTool,
    isEditMode,
    isDrawing,
    isPlacing,
    drawingTypeSelection,
    toggleEditMode,
    stopDrawing,
    stopPlacement,
    startDrawing,
    startPanelGeneration,
  ]);

  // Sync polygon refs and update polygon states
  const roofPolygonsRef = useRef<google.maps.Polygon[]>([]);
  const objectPolygonsRef = useRef<google.maps.Polygon[]>([]);
  const allPanelsRef = useRef<google.maps.Polygon[]>([]);

  useEffect(() => {
    roofPolygonsRef.current = roofPolygons;
    objectPolygonsRef.current = objectPolygons;
    allPanelsRef.current = allPanels;
  }, [roofPolygons, objectPolygons, allPanels]);

  // Update all polygons including panels
  useEffect(() => {
    const allPolygons = [
      ...roofPolygonsRef.current,
      ...objectPolygonsRef.current,
      ...allPanelsRef.current,
    ];

    allPolygons.forEach((polygon) => {
      if (polygon) {
        polygon.setOptions({ clickable: !isDrawing && !isPlacing });
      }
    });

    if (roofPolygonsRef.current.length > 0) {
      updateAllPolygons(roofPolygonsRef.current, true);
    }
    if (objectPolygonsRef.current.length > 0) {
      updateAllPolygons(objectPolygonsRef.current, false);
    }
    if (allPanelsRef.current.length > 0) {
      // Treat panels as "non-roof" but they'll be identified by isPanelElement
      updateAllPolygons(allPanelsRef.current, false);
    }
  }, [
    isEditMode,
    selectedPolygons,
    isDrawing,
    isPlacing,
    updateAllPolygons,
    allPanels,
  ]);

  // Update allPolygonsForEdit when any polygon set changes
  useEffect(() => {
    setAllPolygonsForEdit([...roofPolygons, ...objectPolygons, ...allPanels]);
  }, [roofPolygons, objectPolygons, allPanels]);

  // Hide/show panels when sunshine layer mode changes
  useEffect(() => {
    if (showSunshineLayer && hidePanelsInSunshineMode) {
      // Hide panels
      allPanels.forEach((panel) => {
        panel.setVisible(false);
      });
    } else {
      // Show panels
      allPanels.forEach((panel) => {
        panel.setVisible(true);
      });
    }
  }, [showSunshineLayer, hidePanelsInSunshineMode, allPanels]);

  // ========================================
  // Render
  // ========================================

  return (
    <div
      className={`${styles.mapContainer} ${isDragging ? styles.dragOver : ""}`}
    >
      {/* Map */}
      <div
        ref={mapRef}
        className={styles.map}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      />

      {/* Upload Prompt */}
      {activeTool === "upload" && !isImageView && (
        <div className={styles.uploadPrompt}>
          <div className={styles.promptCard}>
            <div className={styles.promptIcon}>
              <Icon name="upload" />
            </div>
            <h3>Upload Satellite Image</h3>
            <p>Drag and drop an image or click to browse</p>
            <button
              className="btn btn-primary"
              onClick={() => document.getElementById("fileInput")?.click()}
            >
              Choose File
            </button>
          </div>
        </div>
      )}

      {/* Capture Overlay */}
      <CaptureOverlay
        isVisible={showCaptureOverlay}
        onCapture={handleDetection}
        onToggle={() => {
          setShowCaptureOverlay(false);
          onToolChange?.("");
        }}
        map={map}
      />

      {/* Grid Selector */}
      <GridSelector
        selectedGridId={selectedGridId}
        availableGrids={availableGrids}
        onGridSelect={setSelectedGridId}
        isVisible={isPlacing}
      />

      {/* Edit/Draw Tab Bar */}
      {isEditMode && (
        <EditDrawTabBar
          activeTab={activeTab}
          drawingType={drawingTypeSelection}
          onTabChange={handleTabChange}
          onDrawingTypeChange={handleDrawingTypeChange}
          hasPanels={allPanels.length > 0}
        />
      )}

      {/* Roof Angle Panel */}
      {showAnglePanel && (
        <RoofAnglePanel
          roofPolygons={roofPolygons}
          objectPolygons={objectPolygons}
          solarData={solarData}
          onConfirm={handleAngleConfirm}
          onCancel={handleAngleCancel}
        />
      )}

      {/* Results Dashboard */}
      {panelData && map && (
        <SolarResultsDashboard
          panelGenerationData={panelData}
          mapCenter={
            map.getCenter()
              ? {
                  lat: map.getCenter()!.lat(),
                  lng: map.getCenter()!.lng(),
                }
              : undefined
          }
          isEditMode={
            isEditMode || (activeTool !== "" && activeTool !== "panels")
          }
          minimizeRef={dashboardMinimizeRef}
          onMinimizeChange={(minimized) => {
            setIsDashboardMinimized(minimized);
          }}
          currentPanelCount={allPanels.length}
          onSaveProject={onSaveProject}
          isAuthenticated={isAuthenticated}
        />
      )}

      {/* Sunshine Layer Controls */}
      <SunshineLayerControls
        visible={showSunshineLayer && allPanels.length > 0}
        hidePanels={hidePanelsInSunshineMode}
        onToggleHidePanels={setHidePanelsInSunshineMode}
      />

      {/* Annual Sunshine Data Layer */}
      <DataLayerOverlay
        map={map}
        geotiffData={geotiffData}
        visible={showSunshineLayer}
        colorScale="sunshine"
        opacity={1.0}
        clipToPolygons={roofPolygons}
      />

      {/* Panel Generation Overlay */}
      <PanelGenerationOverlay isVisible={isGenerating} progress={progress} />

      {/* Error Notification */}
      {detectionError && (
        <div className={styles.errorNotification}>
          <div className={styles.errorCard}>
            <Icon name="warning" />
            <span>{detectionError.message}</span>
            <button onClick={clearError} className={styles.errorClose}>
              <Icon name="times" />
            </button>
          </div>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className={styles.dragOverlay}>
          <div className={styles.dragContent}>
            <Icon name="upload" />
            <h3>Drop image to upload</h3>
            <p>Release to start processing</p>
          </div>
        </div>
      )}

      {/* Image View */}
      {isImageView && (
        <div className={styles.imageView}>
          <div className={styles.imageViewHeader}>
            <button
              className="btn btn-ghost"
              onClick={() => setIsImageView(false)}
            >
              <Icon name="arrow-left" />
              Back to Map
            </button>
          </div>
          <div className={styles.imageContainer}>
            <div className={styles.imagePlaceholder}>
              <Icon name="image" />
              <p>Image will appear here</p>
            </div>
          </div>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        type="file"
        id="fileInput"
        style={{ display: "none" }}
        accept="image/*"
        onChange={handleFileUpload}
      />

      {/* Map Controls */}
      <MapControls
        map={map}
        hasPolygons={
          roofPolygons.length > 0 ||
          objectPolygons.length > 0 ||
          panelData !== null
        }
        hasPanels={allPanels.length > 0}
        hasGeotiffData={geotiffData !== null && geotiffData !== undefined}
        sunshineLayerEnabled={showSunshineLayer}
        onClearAll={handleReset}
        onToggleSunshineLayer={() => setShowSunshineLayer(!showSunshineLayer)}
      />
    </div>
  );
}
