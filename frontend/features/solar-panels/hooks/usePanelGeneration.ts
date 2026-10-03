import { useState, useCallback, useRef, useEffect } from "react";
import { fetchSolarDataForPolygons } from "@/features/solar-panels/lib/solarPanelApi";
import { generateAndAnimatePanels } from "@/features/solar-panels/lib/panelGenerator";
import {
  setGridVectors,
  clearGridVectors,
} from "@/features/solar-panels/utils/gridSnapping";
import {
  calculateCentroid,
  extractPolygonCoordinates,
} from "@/features/map-drawing/utils/polygonUtils";
import { usePanelContext } from "../context/PanelContext";
import type {
  PanelGenerationResponse,
  SolarDataSegment,
  AngleConfirmData,
} from "@/features/solar-panels/types/panel";
import type { GeoTIFFData } from "@/features/solar-analysis/utils/geotiffParser";

interface UsePanelGenerationProps {
  map: google.maps.Map | null;
  roofPolygons: google.maps.Polygon[];
  onPanelsGenerated?: (data: PanelGenerationResponse) => void;
}

interface PanelGenerationState {
  isGenerating: boolean;
  progress: { current: number; total: number } | null;
  solarData: SolarDataSegment[] | null;
  panelData: PanelGenerationResponse | null;
  panelMarkers: google.maps.Polygon[];
  showAnglePanel: boolean;
  geotiffData: GeoTIFFData | null;
  annualFluxUrl: string | null;
}

export function usePanelGeneration({
  map,
  roofPolygons,
  onPanelsGenerated,
}: UsePanelGenerationProps) {
  const { selectedPanel } = usePanelContext();
  const markersRef = useRef<google.maps.Polygon[]>([]);
  const geotiffAbortControllerRef = useRef<AbortController | null>(null);
  const panelGenerationAbortControllerRef = useRef<AbortController | null>(
    null,
  );

  const [state, setState] = useState<PanelGenerationState>({
    isGenerating: false,
    progress: null,
    solarData: null,
    panelData: null,
    panelMarkers: [],
    showAnglePanel: false,
    geotiffData: null,
    annualFluxUrl: null,
  });

  // Cleanup on unmount: abort any pending requests
  useEffect(() => {
    return () => {
      geotiffAbortControllerRef.current?.abort();
      panelGenerationAbortControllerRef.current?.abort();
    };
  }, []);

  const loadGeotiffDataFromUrl = useCallback(async (url: string) => {
    geotiffAbortControllerRef.current?.abort();
    const { signal } = (geotiffAbortControllerRef.current =
      new AbortController());
    try {
      const response = await fetch(
        `/api/solar-data-layers/geotiff?url=${encodeURIComponent(url)}`,
        { signal },
      );
      if (!response.ok) {
        throw new Error(`Failed to fetch GeoTIFF: ${response.status}`);
      }

      // Dynamic import to avoid SSR/hydration issues with geotiff
      const { parseGeoTIFFFromBuffer } = await import(
        "@/features/solar-analysis/utils/geotiffParser"
      );
      const geotiffData = await parseGeoTIFFFromBuffer(
        await response.arrayBuffer(),
      );
      setState((prev) => ({ ...prev, geotiffData, annualFluxUrl: url }));
    } catch (err: any) {
      // Aborted: component unmounted or a new request started
      if (err.name !== "AbortError") {
        console.error("Failed to load GeoTIFF data:", err);
      }
    }
  }, []);

  const startPanelGeneration = useCallback(async () => {
    if (!map || roofPolygons.length === 0) {
      console.warn("No roof polygons available for panel generation");
      return;
    }

    setState((prev) => ({ ...prev, solarData: null, showAnglePanel: true }));

    const solarData = await fetchSolarDataForPolygons(roofPolygons);
    setState((prev) => ({ ...prev, solarData }));

    // Look up the annual flux GeoTIFF for the roofs' center and load it
    const center = calculateCentroid(
      roofPolygons.flatMap(extractPolygonCoordinates),
    );
    geotiffAbortControllerRef.current?.abort();
    const { signal } = (geotiffAbortControllerRef.current =
      new AbortController());
    try {
      const response = await fetch("/api/solar-data-layers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: { latitude: center.lat, longitude: center.lng },
          radiusMeters: 100,
          requiredQuality: "HIGH",
        }),
        signal,
      });
      if (!response.ok) {
        console.error("Data layers API error:", await response.text());
        throw new Error(`Failed to fetch data layers: ${response.status}`);
      }

      const dataLayersResponse = await response.json();
      const { annualFluxUrl } = dataLayersResponse.data || dataLayersResponse;
      if (annualFluxUrl) {
        await loadGeotiffDataFromUrl(annualFluxUrl);
      } else {
        console.warn("No annual flux URL available");
      }
    } catch (err: any) {
      if (err.name !== "AbortError") {
        console.error("Failed to load GeoTIFF data:", err);
      }
    }
  }, [map, roofPolygons, loadGeotiffDataFromUrl]);

  const handleAngleConfirm = useCallback(
    async (data: AngleConfirmData) => {
      if (!map) return;

      // Abort any previous panel generation request
      panelGenerationAbortControllerRef.current?.abort();
      panelGenerationAbortControllerRef.current = new AbortController();

      setState((prev) => ({
        ...prev,
        showAnglePanel: false,
        isGenerating: true,
      }));

      markersRef.current.forEach((marker) => marker.setMap(null));
      markersRef.current = [];

      try {
        let panelData = data.panelData;

        if (data._requestBody) {
          const requestBody = {
            ...data._requestBody,
            panel_specs: selectedPanel
              ? {
                  width: selectedPanel.width,
                  height: selectedPanel.height,
                  power: selectedPanel.power,
                  efficiency: selectedPanel.efficiency,
                }
              : undefined,
          };

          const response = await fetch("/api/generate_panels", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(requestBody),
            signal: panelGenerationAbortControllerRef.current.signal,
          });
          const responseData = await response.json();
          panelData = responseData.results || responseData;
        }

        if (panelData) {
          setState((prev) => ({ ...prev, isGenerating: false }));

          const markers = await generateAndAnimatePanels({
            panelData,
            map,
            geotiffData: state.geotiffData,
            onProgress: (current, total) => {
              setState((prev) => ({ ...prev, progress: { current, total } }));
            },
            onFirstPanelPlaced: () => {
              onPanelsGenerated?.(panelData);
            },
          });

          setGridVectors(panelData);
          markersRef.current = markers;

          setState((prev) => ({
            ...prev,
            panelData,
            panelMarkers: markers,
            progress: null,
          }));
        }
      } catch (error: any) {
        // Don't update state if request was aborted (component unmounted or new request started)
        if (error.name === "AbortError") {
          return;
        }
        console.error("Error generating panels:", error);
      } finally {
        setState((prev) => ({ ...prev, isGenerating: false }));
      }
    },
    [map, state.geotiffData, onPanelsGenerated, selectedPanel],
  );

  const handleAngleCancel = useCallback(() => {
    setState((prev) => ({ ...prev, showAnglePanel: false }));
  }, []);

  /**
   * Clear all generated panels
   */
  const clearPanels = useCallback(() => {
    // Abort any in-flight requests
    geotiffAbortControllerRef.current?.abort();
    panelGenerationAbortControllerRef.current?.abort();

    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];

    clearGridVectors();
    setState((prev) => ({
      ...prev,
      panelData: null,
      panelMarkers: [],
      geotiffData: null,
      solarData: null,
      isGenerating: false,
    }));
  }, []);

  return {
    ...state,
    startPanelGeneration,
    handleAngleConfirm,
    handleAngleCancel,
    clearPanels,
    loadGeotiffDataFromUrl,
  };
}
