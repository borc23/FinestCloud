import { useEffect, useRef } from "react";
import { StyleConfig } from "../../../shared/utils/styleConfig";
import {
  getGrid,
  getPolygonGridId,
  snapPolygonToGrid,
} from "@/features/solar-panels/utils/gridSnapping";

interface PolygonManagerProps {
  roofPolygons: google.maps.Polygon[];
  objectPolygons: google.maps.Polygon[];
  panels: google.maps.Polygon[];
  isEditMode: boolean;
  isDrawing: boolean;
  selectedPolygons: Set<google.maps.Polygon>;
  onSelectPolygon: (polygon: google.maps.Polygon) => void;
}

type Selection = Set<google.maps.Polygon>;

const isPanel = (polygon: google.maps.Polygon) =>
  (polygon as google.maps.Polygon & { isPanelElement?: boolean })
    .isPanelElement === true;

const toLiteral = (ll: google.maps.LatLng) => ({
  lat: ll.lat(),
  lng: ll.lng(),
});

const offsetPath = (path: google.maps.LatLng[], dLat: number, dLng: number) =>
  path.map((ll) => new google.maps.LatLng(ll.lat() + dLat, ll.lng() + dLng));

// Path of every selected polygon at drag start
const dragStartPaths = new WeakMap<google.maps.Polygon, google.maps.LatLng[]>();

/** Record start paths; panels that are off their grid are snapped first */
function handleDragStart(selected: Selection) {
  selected.forEach((p) => {
    let path = p.getPath().getArray();
    const gridId = getPolygonGridId(p);
    const grid = gridId === undefined ? null : getGrid(gridId);
    if (isPanel(p) && grid) {
      const { x, y } = grid.worldToGrid(toLiteral(path[0]));
      if (
        Math.abs(x - Math.round(x)) > 0.01 ||
        Math.abs(y - Math.round(y)) > 0.01
      ) {
        path = snapPolygonToGrid(path, p);
        p.setPath(path);
      }
    }
    dragStartPaths.set(p, path.slice());
  });
}

/**
 * Panels snap to their grid and move the other selected panels by the same
 * number of grid steps; other polygons move the other selected non-panels by
 * the same lat/lng delta.
 */
function handleDrag(polygon: google.maps.Polygon, selected: Selection) {
  let current = polygon.getPath().getArray();
  if (isPanel(polygon)) {
    const snapped = snapPolygonToGrid(current, polygon);
    if (
      current[0].lat() !== snapped[0].lat() ||
      current[0].lng() !== snapped[0].lng()
    ) {
      polygon.setPath(snapped);
    }
    current = snapped;
  }

  const start = dragStartPaths.get(polygon);
  if (selected.size <= 1 || !start) return;

  if (!isPanel(polygon)) {
    const dLat = current[0].lat() - start[0].lat();
    const dLng = current[0].lng() - start[0].lng();
    selected.forEach((p) => {
      const pStart = dragStartPaths.get(p);
      if (p !== polygon && !isPanel(p) && pStart) {
        p.setPath(offsetPath(pStart, dLat, dLng));
      }
    });
    return;
  }

  const gridId = getPolygonGridId(polygon);
  const grid = gridId === undefined ? null : getGrid(gridId);
  if (!grid) return;
  const delta = grid.calculateGridDelta(
    toLiteral(start[0]),
    toLiteral(current[0]),
  );

  selected.forEach((p) => {
    const pGridId = getPolygonGridId(p);
    const pGrid = pGridId === undefined ? null : getGrid(pGridId);
    const pStart = dragStartPaths.get(p);
    if (p === polygon || !pGrid || !pStart) return;

    const startPos = toLiteral(pStart[0]);
    const newPos = pGrid.applyGridDelta(startPos, delta);
    p.setPath(
      offsetPath(pStart, newPos.lat - startPos.lat, newPos.lng - startPos.lng),
    );
  });
}

/**
 * Edit-mode behavior for roofs, objects and panels: selection styling,
 * click-to-select, multi-drag with grid snapping, vertex editing and panel
 * hover. Listeners are attached once per polygon and only act in edit mode.
 */
export function usePolygonManager({
  roofPolygons,
  objectPolygons,
  panels,
  isEditMode,
  isDrawing,
  selectedPolygons,
  onSelectPolygon,
}: PolygonManagerProps) {
  const enabled = isEditMode && !isDrawing;
  const stateRef = useRef({
    enabled,
    selectedPolygons,
    roofPolygons,
    objectPolygons,
  });
  stateRef.current = {
    enabled,
    selectedPolygons,
    roofPolygons,
    objectPolygons,
  };
  const attachedRef = useRef(new WeakSet<google.maps.Polygon>());

  useEffect(() => {
    [...roofPolygons, ...objectPolygons, ...panels].forEach((polygon) => {
      if (attachedRef.current.has(polygon)) return;
      attachedRef.current.add(polygon);

      const on = (event: string, handler: (e: any) => void) =>
        polygon.addListener(event, (e: any) => {
          if (stateRef.current.enabled) handler(e);
        });
      const selected = () => stateRef.current.selectedPolygons;

      on("click", (e: google.maps.MapMouseEvent) => {
        e.stop?.(); // keep the map from handling the click
        onSelectPolygon(polygon);
      });
      on("dragstart", () => handleDragStart(selected()));
      on("drag", () => handleDrag(polygon, selected()));

      // Right-click a vertex to remove it (removes the polygon below 3 vertices)
      on("rightclick", (e) => {
        if (!selected().has(polygon) || e.vertex === undefined) return;
        const path = polygon.getPath();
        if (path.getLength() > 3) path.removeAt(e.vertex);
        else polygon.setMap(null);
      });

      // Double-click a vertex to insert one after it
      on("dblclick", (e) => {
        e.stop?.();
        if (selected().has(polygon) && e.vertex !== undefined) {
          polygon.getPath().insertAt(e.vertex + 1, e.latLng);
        }
      });

      if (isPanel(polygon)) {
        const hover = (state: "hover" | "default") => () => {
          if (!selected().has(polygon)) {
            polygon.setOptions(StyleConfig.getPanelOptions(state));
          }
        };
        on("mouseover", hover("hover"));
        on("mouseout", hover("default"));
      }
    });
  }, [roofPolygons, objectPolygons, panels, onSelectPolygon]);

  // Apply selection/edit styling. Roofs and objects are read from the ref so
  // newly rendered ones keep their initial (hoverable) style until the next
  // mode or selection change.
  useEffect(() => {
    const { roofPolygons, objectPolygons } = stateRef.current;
    const style = (polygon: google.maps.Polygon, isRoof: boolean) => {
      const isSelected = selectedPolygons.has(polygon);
      const base = isPanel(polygon)
        ? StyleConfig.getPanelOptions(isSelected ? "selected" : "default")
        : {
            ...StyleConfig.getOptionsForType(isRoof, isSelected),
            editable: isSelected && enabled,
          };
      polygon.setOptions({
        ...base,
        clickable: enabled,
        draggable: isSelected && enabled,
      });
    };
    roofPolygons.forEach((p) => style(p, true));
    [...objectPolygons, ...panels].forEach((p) => style(p, false));
  }, [enabled, selectedPolygons, panels]);
}
