import { useState, useCallback, useRef, useEffect } from "react";
import type { RoofModel } from "@/features/solar-analysis/types/detection";
import { StyleConfig } from "../../../shared/utils/styleConfig";

/** Highlight on hover unless the polygon is selected or not clickable */
function addHoverEffects(
  polygon: google.maps.Polygon,
  defaultOptions: google.maps.PolygonOptions,
  hoverColor: string,
) {
  const isIdle = () =>
    !polygon.getDraggable() && polygon.get("strokeColor") !== "#3498db";

  polygon.addListener("mouseover", () => {
    if (isIdle() && polygon.get("clickable")) {
      polygon.setOptions({ strokeColor: hoverColor, fillColor: hoverColor });
    }
  });
  polygon.addListener("mouseout", () => {
    if (isIdle()) polygon.setOptions(defaultOptions);
  });
}

export function usePolygons(map: google.maps.Map | null) {
  const [roofPolygons, setRoofPolygons] = useState<google.maps.Polygon[]>([]);
  const [objectPolygons, setObjectPolygons] = useState<google.maps.Polygon[]>(
    [],
  );
  // Mirrors of the state so map side effects never run inside state updaters
  const roofsRef = useRef<google.maps.Polygon[]>([]);
  const objectsRef = useRef<google.maps.Polygon[]>([]);

  const setPolygons = useCallback(
    (isRoof: boolean, polygons: google.maps.Polygon[]) => {
      (isRoof ? roofsRef : objectsRef).current = polygons;
      (isRoof ? setRoofPolygons : setObjectPolygons)(polygons);
    },
    [],
  );

  const renderPolygons = useCallback(
    (polygonData: RoofModel[], isRoof: boolean, enableHover = true) => {
      if (!map || !polygonData) return;

      const options = StyleConfig.getOptionsForType(isRoof, false);
      const hoverColor = StyleConfig.COLORS[isRoof ? "ROOF" : "OBJECT"].HOVER;
      const created = polygonData.flatMap((roof) => {
        const paths = (roof?.coords ?? []).filter(
          (c): c is google.maps.LatLngLiteral =>
            c.lat !== undefined && c.lng !== undefined,
        );
        if (paths.length === 0) return [];

        const polygon = new google.maps.Polygon({ paths, ...options, map });
        if (enableHover) addHoverEffects(polygon, options, hoverColor);
        return [polygon];
      });

      const ref = isRoof ? roofsRef : objectsRef;
      setPolygons(isRoof, [...ref.current, ...created]);
    },
    [map, setPolygons],
  );

  const clearAllPolygons = useCallback(() => {
    [...roofsRef.current, ...objectsRef.current].forEach((p) => p.setMap(null));
    setPolygons(true, []);
    setPolygons(false, []);
  }, [setPolygons]);

  /** Show/hide roof polygons, plus object polygons unless roofsOnly */
  const setPolygonsVisible = useCallback(
    (visible: boolean, roofsOnly = false) => {
      const polygons = roofsOnly
        ? roofsRef.current
        : [...roofsRef.current, ...objectsRef.current];
      polygons.forEach((polygon) => polygon.setVisible(visible));
    },
    [],
  );

  /** Drop polygons (already removed from the map) from the state */
  const removePolygons = useCallback(
    (polygonsToRemove: google.maps.Polygon[]) => {
      const removed = new Set(polygonsToRemove);
      setPolygons(
        true,
        roofsRef.current.filter((p) => !removed.has(p)),
      );
      setPolygons(
        false,
        objectsRef.current.filter((p) => !removed.has(p)),
      );
    },
    [setPolygons],
  );

  useEffect(() => {
    return () => {
      [...roofsRef.current, ...objectsRef.current].forEach((p) =>
        p.setMap(null),
      );
    };
  }, []);

  return {
    roofPolygons,
    objectPolygons,
    renderPolygons,
    clearAllPolygons,
    setPolygonsVisible,
    removePolygons,
  };
}
