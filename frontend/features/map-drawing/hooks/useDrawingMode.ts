import { useState, useCallback, useEffect, useRef } from "react";
import type { DrawingMode } from "@/features/map-drawing/types/drawing";

const COLORS = {
  roof: "#34c759",
  object: "#ff453a",
} as const;

const CLOSE_DISTANCE_PX = 15; // Clicking this close to the first point closes the polygon

interface UseDrawingModeProps {
  map: google.maps.Map | null;
  isEditMode: boolean;
  onPolygonComplete: (path: google.maps.LatLng[], isRoof: boolean) => void;
}

const markerIcon = (isFirst: boolean, color: string) => ({
  path: google.maps.SymbolPath.CIRCLE,
  scale: isFirst ? 6 : 4,
  fillColor: isFirst ? color : "#ffffff",
  fillOpacity: 1,
  strokeColor: isFirst ? "#ffffff" : color,
  strokeWeight: isFirst ? 2 : 1.5,
  strokeOpacity: 1,
});

const lineOptions = (color: string, opacity = 0.9) => ({
  strokeColor: color,
  strokeWeight: 3,
  strokeOpacity: opacity,
  clickable: false,
  zIndex: 1500,
});

export function useDrawingMode({
  map,
  isEditMode,
  onPolygonComplete,
}: UseDrawingModeProps) {
  const [isDrawing, setIsDrawing] = useState(false);

  // Use refs for immediate access without re-renders causing issues
  const pathRef = useRef<google.maps.LatLng[]>([]);
  const shapesRef = useRef<(google.maps.Marker | google.maps.Polyline)[]>([]);
  const tempLineRef = useRef<google.maps.Polyline | null>(null);
  const typeRef = useRef<DrawingMode>("roof");

  const cleanup = useCallback(() => {
    shapesRef.current.forEach((shape) => shape.setMap(null));
    shapesRef.current = [];
    tempLineRef.current?.setMap(null);
    tempLineRef.current = null;
    pathRef.current.length = 0;
  }, []);

  const startDrawing = useCallback(
    (type: DrawingMode) => {
      if (!map || !isEditMode) return;
      typeRef.current = type;
      setIsDrawing(true);
      cleanup();
    },
    [map, isEditMode, cleanup],
  );

  const stopDrawing = useCallback(() => {
    cleanup();
    setIsDrawing(false);
  }, [cleanup]);

  // Listen on the map div in the capture phase so clicks on existing
  // polygons and markers also add points
  useEffect(() => {
    if (!map || !isDrawing) return;

    const path = pathRef.current;
    const color = () => COLORS[typeRef.current];

    const addPoint = (latLng: google.maps.LatLng) => {
      const isFirst = path.length === 0;
      shapesRef.current.push(
        new google.maps.Marker({
          position: latLng,
          map,
          icon: markerIcon(isFirst, color()),
          clickable: isFirst,
          zIndex: 2000,
          optimized: false,
        }),
      );
      if (!isFirst) {
        shapesRef.current.push(
          new google.maps.Polyline({
            ...lineOptions(color()),
            path: [path[path.length - 1], latLng],
            map,
          }),
        );
      }
      path.push(latLng);
    };

    const completePolygon = () => {
      onPolygonComplete([...path], typeRef.current === "roof");
      cleanup();
    };

    const updateTempLine = (mousePos: google.maps.LatLng) => {
      if (path.length === 0) return;
      tempLineRef.current ??= new google.maps.Polyline({
        ...lineOptions(color(), 0.5),
        map,
        zIndex: 2500,
        icons: [
          {
            icon: { path: "M 0,-1 0,1", strokeOpacity: 0.5, scale: 3 },
            offset: "0",
            repeat: "12px",
          },
        ],
      });
      tempLineRef.current.setPath([path[path.length - 1], mousePos]);
    };

    const controller = new AbortController();
    const overlay = new google.maps.OverlayView();
    overlay.draw = () => {};
    overlay.onAdd = () => {
      const mapDiv = map.getDiv();
      const listen = (
        type: "click" | "mousemove",
        handler: (latLng: google.maps.LatLng, point: google.maps.Point) => void,
        stop = false,
      ) =>
        mapDiv.addEventListener(
          type,
          (e) => {
            const projection = overlay.getProjection();
            if (!projection) return;
            const bounds = mapDiv.getBoundingClientRect();
            const point = new google.maps.Point(
              e.clientX - bounds.left,
              e.clientY - bounds.top,
            );
            const latLng = projection.fromContainerPixelToLatLng(point);
            if (!latLng) return;
            if (stop) e.stopPropagation();
            handler(latLng, point);
          },
          { capture: true, signal: controller.signal },
        );

      listen(
        "click",
        (latLng, point) => {
          const first =
            path.length >= 3 &&
            overlay.getProjection().fromLatLngToContainerPixel(path[0]);
          if (
            first &&
            Math.hypot(point.x - first.x, point.y - first.y) <=
              CLOSE_DISTANCE_PX
          ) {
            completePolygon();
          } else {
            addPoint(latLng);
          }
        },
        true,
      );
      listen("mousemove", updateTempLine);
    };
    overlay.setMap(map);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopDrawing();
    };
    document.addEventListener("keydown", handleKeyDown, {
      signal: controller.signal,
    });

    return () => {
      controller.abort();
      overlay.setMap(null);
    };
  }, [map, isDrawing, onPolygonComplete, cleanup, stopDrawing]);

  useEffect(() => cleanup, [cleanup]);

  return { isDrawing, startDrawing, stopDrawing };
}
