import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { StyleConfig } from "../../../shared/utils/styleConfig";
import { getGrid } from "@/features/solar-panels/utils/gridSnapping";
import type {
  Coordinate,
  PanelGenerationResponse,
} from "@/features/solar-panels/types/panel";

interface UsePanelPlacementProps {
  map: google.maps.Map | null;
  isEditMode: boolean;
  existingPanels: google.maps.Polygon[];
  panelData: PanelGenerationResponse | null;
  onPanelPlaced: (panel: google.maps.Polygon, gridId: number) => void;
}

// Sample points (as fractions of the half-diagonal from the first corner):
// the center plus the four quadrant centers. Touching panels are allowed.
const COLLISION_SAMPLES = [
  [1, 1],
  [0.5, 0.5],
  [0.5, 1.5],
  [1.5, 0.5],
  [1.5, 1.5],
];

export function usePanelPlacement({
  map,
  isEditMode,
  existingPanels,
  panelData,
  onPanelPlaced,
}: UsePanelPlacementProps) {
  const [isPlacing, setIsPlacing] = useState(false);
  const [selectedGridId, setSelectedGridId] = useState<number | null>(null);
  const ghostPanelRef = useRef<google.maps.Polygon | null>(null);
  const lastValidPositionRef = useRef<{
    coords: Coordinate[];
    gridId: number;
  } | null>(null);
  // Last evaluated grid cell, so work only happens when the cursor changes cell
  const lastGridPosRef = useRef<{ gridId: number; x: number; y: number }>();
  // Read at check time so panels placed during this session count too
  const existingPanelsRef = useRef(existingPanels);
  existingPanelsRef.current = existingPanels;

  // Panel dimensions (in grid units) per grid, from each roof's first panel
  const templates = useMemo(() => {
    const result = new Map<number, { width: number; height: number }>();
    panelData?.roofs?.forEach((roof, gridId) => {
      const coords = roof.panels?.[0]?.coords;
      const grid = getGrid(gridId);
      if (!grid || !coords || coords.length < 4) return;
      const p0 = grid.worldToGrid(coords[0]);
      const p1 = grid.worldToGrid(coords[1]);
      const p3 = grid.worldToGrid(coords[3]);
      result.set(gridId, {
        width: Math.abs(p1.x - p0.x),
        height: Math.abs(p3.y - p0.y),
      });
    });
    return result;
  }, [panelData]);
  const availableGrids = useMemo(
    () => Array.from(templates.keys()),
    [templates],
  );

  // Auto-select the first grid; reset when panels are cleared
  useEffect(() => {
    if (!panelData?.roofs) setSelectedGridId(null);
    else if (availableGrids.length > 0) {
      setSelectedGridId((id) => id ?? availableGrids[0]);
    }
  }, [panelData, availableGrids]);

  const startPlacement = useCallback(() => {
    if (!map || !isEditMode || templates.size === 0) {
      console.warn(
        "Cannot start panel placement: no panel templates available",
      );
      return;
    }
    setIsPlacing(true);
  }, [map, isEditMode, templates]);

  const stopPlacement = useCallback(() => setIsPlacing(false), []);

  // While placing: ghost preview on mouse move (RAF-throttled), place on
  // click, cancel on ESC
  useEffect(() => {
    if (!map || !isPlacing) return;

    const hasCollision = ([c0, , c2]: Coordinate[]) => {
      const dLat = (c2.lat - c0.lat) / 2;
      const dLng = (c2.lng - c0.lng) / 2;
      const points = COLLISION_SAMPLES.map(
        ([a, b]) =>
          new google.maps.LatLng(c0.lat + dLat * a, c0.lng + dLng * b),
      );
      return existingPanelsRef.current.some((panel) =>
        points.some((p) =>
          google.maps.geometry.poly.containsLocation(p, panel),
        ),
      );
    };

    const updateGhost = (latLng: google.maps.LatLng) => {
      const gridId = selectedGridId;
      const grid = gridId === null ? null : getGrid(gridId);
      const template = gridId === null ? undefined : templates.get(gridId);
      if (gridId === null || !grid || !template) return;

      // Center the panel under the cursor, rounded to the nearest grid point
      const pos = grid.worldToGrid({ lat: latLng.lat(), lng: latLng.lng() });
      const x = Math.round(pos.x - template.width / 2);
      const y = Math.round(pos.y - template.height / 2);
      const last = lastGridPosRef.current;
      if (last && last.gridId === gridId && last.x === x && last.y === y) {
        return;
      }
      lastGridPosRef.current = { gridId, x, y };

      const { width: w, height: h } = template;
      const coords = [
        [0, 0],
        [w, 0],
        [w, h],
        [0, h],
      ].map(([dx, dy]) => grid.gridToWorld({ x: x + dx, y: y + dy }));
      const collides = hasCollision(coords);
      if (!collides) lastValidPositionRef.current = { coords, gridId };

      if (!ghostPanelRef.current) {
        ghostPanelRef.current = new google.maps.Polygon({
          map,
          ...StyleConfig.getPanelOptions("default"),
          clickable: false,
          zIndex: 3000,
        });
      }
      ghostPanelRef.current.setPaths(coords);
      // Keep panel appearance but adjust opacity based on collision
      ghostPanelRef.current.setOptions({
        fillOpacity: collides ? 0.4 : 0.8,
        strokeOpacity: collides ? 0.4 : 0.9,
        strokeWeight: collides ? 1.5 : 2.0,
      });
    };

    const placePanel = () => {
      const position = lastValidPositionRef.current;
      if (!position || hasCollision(position.coords)) return;

      const panel = new google.maps.Polygon({
        paths: position.coords,
        map,
        ...StyleConfig.getPanelOptions("default"),
        isPanelElement: true,
      } as google.maps.PolygonOptions & { isPanelElement: boolean });
      onPanelPlaced(panel, position.gridId);
      lastValidPositionRef.current = null;
    };

    let raf: number | null = null;
    let pending: google.maps.LatLng | null = null;
    const listeners = [
      map.addListener("mousemove", (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        pending = e.latLng;
        raf ??= requestAnimationFrame(() => {
          raf = null;
          updateGhost(pending!);
        });
      }),
      map.addListener("click", (e: google.maps.MapMouseEvent) => {
        e.stop?.();
        placePanel();
      }),
    ];
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsPlacing(false);
    };
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      listeners.forEach((listener) => listener.remove());
      document.removeEventListener("keydown", handleKeyDown);
      if (raf !== null) cancelAnimationFrame(raf);
    };
  }, [map, isPlacing, selectedGridId, templates, onPanelPlaced]);

  // Remove the ghost when placement stops (or on unmount)
  useEffect(() => {
    if (!isPlacing) return;
    return () => {
      ghostPanelRef.current?.setMap(null);
      ghostPanelRef.current = null;
      lastValidPositionRef.current = null;
      lastGridPosRef.current = undefined;
    };
  }, [isPlacing]);

  return {
    isPlacing,
    startPlacement,
    stopPlacement,
    selectedGridId,
    availableGrids,
    setSelectedGridId,
  };
}
