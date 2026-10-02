import { useState, useCallback, useEffect, useRef } from "react";
import type { DrawingMode } from "@/features/map-drawing/types/drawing";

const COLORS = {
  ROOF: "#34c759",
  OBJECT: "#ff453a",
} as const;

interface UseDrawingModeProps {
  map: google.maps.Map | null;
  isEditMode: boolean;
  onPolygonComplete: (path: google.maps.LatLng[], isRoof: boolean) => void;
}

export function useDrawingMode({
  map,
  isEditMode,
  onPolygonComplete,
}: UseDrawingModeProps) {
  const [isDrawing, setIsDrawing] = useState(false);

  // Use refs for immediate access without re-renders causing issues
  const pathRef = useRef<google.maps.LatLng[]>([]);
  const markersRef = useRef<google.maps.Marker[]>([]);
  const linesRef = useRef<google.maps.Polyline[]>([]);
  const tempLineRef = useRef<google.maps.Polyline | null>(null);
  const clickListenerRef = useRef<google.maps.MapsEventListener | null>(null);
  const mouseMoveListenerRef = useRef<google.maps.MapsEventListener | null>(
    null,
  );
  const typeRef = useRef<DrawingMode | null>(null);
  const firstMarkersRef = useRef<WeakSet<google.maps.Marker>>(new WeakSet());

  const getCurrentColor = () =>
    typeRef.current === "roof" ? COLORS.ROOF : COLORS.OBJECT;

  const markerIcon = (isFirst: boolean, color: string) => ({
    path: google.maps.SymbolPath.CIRCLE,
    scale: isFirst ? 6 : 4,
    fillColor: isFirst ? color : "#ffffff",
    fillOpacity: 1,
    strokeColor: isFirst ? "#ffffff" : color,
    strokeWeight: isFirst ? 2 : 1.5,
    strokeOpacity: 1,
  });

  const lineOptions = (
    start: google.maps.LatLng,
    end: google.maps.LatLng,
    color: string,
    opacity = 0.9,
  ) => ({
    path: [start, end],
    strokeColor: color,
    strokeWeight: 3,
    strokeOpacity: opacity,
    clickable: false,
    zIndex: 1500,
  });

  const cleanup = useCallback(() => {
    markersRef.current.forEach((marker) => marker.setMap(null));
    markersRef.current = [];
    linesRef.current.forEach((line) => line.setMap(null));
    linesRef.current = [];
    if (tempLineRef.current) {
      tempLineRef.current.setMap(null);
      tempLineRef.current = null;
    }
    pathRef.current = [];
    firstMarkersRef.current = new WeakSet();
  }, []);

  const createMarker = useCallback(
    (position: google.maps.LatLng, isFirst: boolean) => {
      if (!map) return null;
      const color = getCurrentColor();
      return new google.maps.Marker({
        position,
        map,
        icon: markerIcon(isFirst, color),
        clickable: isFirst,
        zIndex: 2000,
        optimized: false,
      });
    },
    [map],
  );

  const createLine = useCallback(
    (start: google.maps.LatLng, end: google.maps.LatLng) => {
      if (!map) return null;
      const color = getCurrentColor();
      return new google.maps.Polyline({
        ...lineOptions(start, end, color),
        map,
      });
    },
    [map],
  );

  const updateTempLine = useCallback(
    (mousePos: google.maps.LatLng) => {
      if (!map || pathRef.current.length === 0) return undefined;
      if (tempLineRef.current) tempLineRef.current.setMap(null);
      const lastPoint = pathRef.current[pathRef.current.length - 1];
      const color = getCurrentColor();
      tempLineRef.current = new google.maps.Polyline({
        ...lineOptions(lastPoint, mousePos, color, 0.5),
        map,
        zIndex: 2500,
        icons: [
          {
            icon: {
              path: "M 0,-1 0,1",
              strokeOpacity: 0.5,
              scale: 3,
            },
            offset: "0",
            repeat: "12px",
          },
        ],
      });
    },
    [map],
  );

  const completePolygon = useCallback(() => {
    if (pathRef.current.length < 3) return undefined;
    const path = [...pathRef.current];
    const isRoof = typeRef.current === "roof";
    onPolygonComplete(path, isRoof);
    cleanup();
  }, [onPolygonComplete, cleanup]);

  const addPoint = useCallback(
    (latLng: google.maps.LatLng) => {
      if (!map) return undefined;
      const isFirst = pathRef.current.length === 0;
      const marker = createMarker(latLng, isFirst);
      if (!marker) return undefined;
      if (isFirst) {
        firstMarkersRef.current.add(marker);
        marker.addListener("click", (e: google.maps.MapMouseEvent) => {
          e.stop?.();
          if (pathRef.current.length >= 3) completePolygon();
        });
      }
      markersRef.current.push(marker);
      if (pathRef.current.length > 0) {
        const line = createLine(
          pathRef.current[pathRef.current.length - 1],
          latLng,
        );
        if (line) linesRef.current.push(line);
      }
      pathRef.current.push(latLng);
    },
    [map, createMarker, createLine, completePolygon],
  );

  const startDrawing = useCallback(
    (type: DrawingMode) => {
      if (!map || !isEditMode) return undefined;
      typeRef.current = type;
      setIsDrawing(true);
      map.setOptions({
        draggable: false,
        scrollwheel: false,
        gestureHandling: "none",
        disableDoubleClickZoom: true,
        clickableIcons: false,
      });
      cleanup();
    },
    [map, isEditMode, cleanup],
  );

  const stopDrawing = useCallback(() => {
    cleanup();
    setIsDrawing(false);
    typeRef.current = null;
    if (map) {
      map.setOptions({
        draggable: !isEditMode,
        scrollwheel: !isEditMode,
        gestureHandling: isEditMode ? "none" : "auto",
        disableDoubleClickZoom: isEditMode,
      });
    }
  }, [map, isEditMode, cleanup]);

  const createEventOverlay = useCallback(
    (
      eventType: string,
      callback: (
        latLng: google.maps.LatLng,
        point: google.maps.Point,
        e: MouseEvent,
      ) => void,
    ): { overlay: google.maps.OverlayView; abort: () => void } | null => {
      if (!map) return null;

      // AbortController for automatic cleanup if component unmounts during setup
      const abortController = new AbortController();

      class EventOverlay extends google.maps.OverlayView {
        private handler: ((e: Event) => void) | null = null;
        private aborted = false;

        onAdd() {
          // Check if already aborted before proceeding
          if (abortController.signal.aborted) {
            this.aborted = true;
            return;
          }

          const panes = this.getPanes();
          if (!panes || !map) return;

          const mapDiv = map.getDiv();

          this.handler = (e: Event) => {
            if (!(e instanceof MouseEvent)) return;

            const projection = this.getProjection();
            if (!projection) return;

            const bounds = mapDiv.getBoundingClientRect();
            const point = new google.maps.Point(
              e.clientX - bounds.left,
              e.clientY - bounds.top,
            );

            const latLng = projection.fromContainerPixelToLatLng(point);
            if (latLng) callback(latLng, point, e);
          };

          // Use AbortController signal for automatic cleanup
          if (this.handler) {
            mapDiv.addEventListener(eventType, this.handler as EventListener, {
              capture: true,
              signal: abortController.signal,
            });
          }
        }

        onRemove() {
          // Abort any pending operations
          if (!this.aborted) {
            abortController.abort();
            this.aborted = true;
          }

          // Manual cleanup as fallback (addEventListener with signal handles this automatically)
          if (map && this.handler) {
            const mapDiv = map.getDiv();
            try {
              // This may throw if already removed by AbortController
              mapDiv.removeEventListener(eventType, this.handler, {
                capture: true,
              });
            } catch (e) {
              // Ignore - listener already removed by AbortController
            }
            this.handler = null;
          }
        }

        draw() {
          // No drawing needed
        }
      }

      const overlay: google.maps.OverlayView = new EventOverlay();

      // Return overlay with abort function for emergency cleanup
      return {
        overlay,
        abort: () => {
          abortController.abort();
          overlay.setMap(null);
        },
      };
    },
    [map],
  );

  useEffect(() => {
    if (!map || !isDrawing) {
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
      return;
    }

    const clickOverlayWrapper = createEventOverlay(
      "click",
      (latLng, point, e) => {
        if (pathRef.current.length >= 3 && markersRef.current[0]) {
          const firstMarkerPos = markersRef.current[0].getPosition();
          if (firstMarkerPos && clickOverlayWrapper) {
            const projection = clickOverlayWrapper.overlay.getProjection();
            if (projection) {
              const firstMarkerPixel =
                projection.fromLatLngToContainerPixel(firstMarkerPos);
              if (firstMarkerPixel) {
                const distance = Math.sqrt(
                  Math.pow(point.x - firstMarkerPixel.x, 2) +
                    Math.pow(point.y - firstMarkerPixel.y, 2),
                );
                if (distance <= 15) {
                  e.stopPropagation();
                  completePolygon();
                  return;
                }
              }
            }
          }
        }

        e.stopPropagation();
        addPoint(latLng);
      },
    );

    if (clickOverlayWrapper) clickOverlayWrapper.overlay.setMap(map);

    clickListenerRef.current = google.maps.event.addListener(
      map,
      "click",
      (e: google.maps.MapMouseEvent) => {
        if (e.latLng) addPoint(e.latLng);
      },
    );

    return () => {
      if (clickOverlayWrapper) {
        clickOverlayWrapper.abort(); // Use abort for proper cleanup
      }
      if (clickListenerRef.current) {
        google.maps.event.removeListener(clickListenerRef.current);
        clickListenerRef.current = null;
      }
    };
  }, [map, isDrawing, addPoint, completePolygon, createEventOverlay]);

  useEffect(() => {
    if (!map || !isDrawing) {
      if (mouseMoveListenerRef.current) {
        google.maps.event.removeListener(mouseMoveListenerRef.current);
        mouseMoveListenerRef.current = null;
      }
      return;
    }

    const mouseMoveOverlayWrapper = createEventOverlay(
      "mousemove",
      (latLng) => {
        if (pathRef.current.length === 0) return;
        updateTempLine(latLng);
      },
    );

    if (mouseMoveOverlayWrapper) mouseMoveOverlayWrapper.overlay.setMap(map);

    mouseMoveListenerRef.current = google.maps.event.addListener(
      map,
      "mousemove",
      (e: google.maps.MapMouseEvent) => {
        if (e.latLng && pathRef.current.length > 0) updateTempLine(e.latLng);
      },
    );

    return () => {
      if (mouseMoveOverlayWrapper) {
        mouseMoveOverlayWrapper.abort(); // Use abort for proper cleanup
      }
      if (mouseMoveListenerRef.current) {
        google.maps.event.removeListener(mouseMoveListenerRef.current);
        mouseMoveListenerRef.current = null;
      }
    };
  }, [map, isDrawing, updateTempLine, createEventOverlay]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isDrawing) stopDrawing();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDrawing, stopDrawing]);

  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  return { isDrawing, startDrawing, stopDrawing };
}
