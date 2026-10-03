import { useState, useCallback, useEffect, useRef } from "react";

interface UseEditModeProps {
  map: google.maps.Map | null;
  onDeletePolygons?: (polygons: google.maps.Polygon[]) => void;
  allPolygons: google.maps.Polygon[];
}

// Drag-to-select behavior
const TRAIL_SAMPLE_INTERVAL = 2; // Check polygon intersection every 2 points
const MAX_TRAIL_LENGTH = 10; // Maximum trail points to keep in memory

export function useEditMode({
  map,
  onDeletePolygons,
  allPolygons,
}: UseEditModeProps) {
  const [isEditMode, setIsEditMode] = useState(false);
  const [selectedPolygons, setSelectedPolygons] = useState<
    Set<google.maps.Polygon>
  >(new Set());

  // Latest values for event handlers (no re-render or re-subscription needed)
  const selectedPolygonsRef = useRef(selectedPolygons);
  selectedPolygonsRef.current = selectedPolygons;
  const allPolygonsRef = useRef(allPolygons);
  allPolygonsRef.current = allPolygons;
  const isCtrlPressedRef = useRef(false);

  // Entering or leaving edit mode clears the selection
  useEffect(() => setSelectedPolygons(new Set()), [isEditMode]);

  /** Select a polygon; with Ctrl held, toggle it within the selection */
  const selectPolygon = useCallback((polygon: google.maps.Polygon) => {
    setSelectedPolygons((prev) => {
      const next = new Set(isCtrlPressedRef.current ? prev : []);
      if (prev.has(polygon) && isCtrlPressedRef.current) next.delete(polygon);
      else next.add(polygon);
      return next;
    });
  }, []);

  // Keyboard: Ctrl for multi-select, Delete/Backspace to delete, Escape to deselect
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return;

      if (e.key === "Control") {
        isCtrlPressedRef.current = true;
      } else if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        e.stopPropagation();
        const deleted = Array.from(selectedPolygonsRef.current);
        deleted.forEach((polygon) => polygon.setMap(null));
        onDeletePolygons?.(deleted);
        setSelectedPolygons(new Set());
      } else if (e.key === "Escape") {
        setSelectedPolygons(new Set());
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Control") isCtrlPressedRef.current = false;
    };

    document.addEventListener("keydown", handleKeyDown);
    document.addEventListener("keyup", handleKeyUp);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.removeEventListener("keyup", handleKeyUp);
    };
  }, [isEditMode, onDeletePolygons]);

  // Drag-to-select: drawing a trail over polygons selects them; a plain map
  // click clears the selection
  useEffect(() => {
    if (!map || !isEditMode) return;

    let trail: google.maps.LatLng[] = [];
    let trailPolyline: google.maps.Polyline | null = null;
    let trailPointCount = 0;
    let justCompletedDrag = false;
    let polygonListeners: google.maps.MapsEventListener[] = [];

    const checkPolygonIntersection = (point: google.maps.LatLng) => {
      const newlySelected = allPolygonsRef.current.filter(
        (polygon) =>
          !selectedPolygonsRef.current.has(polygon) &&
          google.maps.geometry.poly.containsLocation(point, polygon),
      );
      if (newlySelected.length > 0) {
        setSelectedPolygons((prev) => {
          const next = new Set(prev);
          newlySelected.forEach((polygon) => next.add(polygon));
          return next;
        });
      }
    };

    const handleMouseMove = (e: google.maps.MapMouseEvent) => {
      if (!trailPolyline || !e.latLng) return;

      trail.push(e.latLng);
      if (trail.length > MAX_TRAIL_LENGTH) trail.shift();
      trailPolyline.setPath(trail);

      trailPointCount++;
      if (trailPointCount % TRAIL_SAMPLE_INTERVAL === 0) {
        checkPolygonIntersection(e.latLng);
      }
    };

    const endDrag = () => {
      polygonListeners.forEach((listener) => listener.remove());
      polygonListeners = [];
      trailPolyline?.setMap(null);
      trailPolyline = null;
      trail = [];
    };

    const onMouseDown = (e: google.maps.MapMouseEvent) => {
      // With a selection, the user expects to drag it rather than draw a trail
      if (!e.latLng || selectedPolygonsRef.current.size > 0) return;

      trailPointCount = 0;
      // Polygons swallow map mousemove events, so listen on them too
      polygonListeners = allPolygonsRef.current.map((polygon) =>
        polygon.addListener("mousemove", handleMouseMove),
      );
      if (!isCtrlPressedRef.current) setSelectedPolygons(new Set());

      trail = [e.latLng];
      trailPolyline = new google.maps.Polyline({
        map,
        path: trail,
        strokeColor: "#4285F4",
        strokeWeight: 2,
        strokeOpacity: 0.7,
        clickable: false,
        zIndex: 1000,
      });
    };

    const onMouseUp = () => {
      if (!trailPolyline) return;
      endDrag();
      // Prevent the click that follows from clearing the new selection
      justCompletedDrag = true;
      setTimeout(() => (justCompletedDrag = false), 100);
    };

    const listeners = [
      map.addListener("mousedown", onMouseDown),
      map.addListener("mousemove", handleMouseMove),
      map.addListener("mouseup", onMouseUp),
      map.addListener("click", () => {
        if (!justCompletedDrag) setSelectedPolygons(new Set());
      }),
    ];
    document.addEventListener("mouseup", onMouseUp);

    return () => {
      listeners.forEach((listener) => listener.remove());
      document.removeEventListener("mouseup", onMouseUp);
      endDrag();
    };
  }, [map, isEditMode]);

  return { isEditMode, setIsEditMode, selectedPolygons, selectPolygon };
}
