"use client";

import { useEffect, useState, useRef } from "react";
import polylabel from "polylabel";
import Button from "@/shared/components/ui/Button";
import styles from "./RoofAnglePanel.module.css";
import { extractPolygonCoordinates } from "@/features/map-drawing/utils/polygonUtils";
import type { AngleConfirmData } from "@/features/solar-panels/types/panel";

interface RoofSegment {
  polygonIndex: number;
  coords: { lat: number; lng: number }[];
  center: { lat: number; lng: number };
  solarData: any;
}

/** Roof segment stats from the Solar API for a polygon, if any */
const segmentStats = (solarData: RoofSegment[] | null, index: number) =>
  solarData?.find((s) => s.polygonIndex === index)?.solarData?.solarPotential
    ?.roofSegmentStats?.[0];

/** API pitch as an input value; only valid non-zero values are used */
const apiAngle = (solarData: RoofSegment[] | null, index: number) => {
  const pitch = segmentStats(solarData, index)?.pitchDegrees;
  return pitch && pitch > 0 ? pitch.toFixed(1) : "";
};

const ORIENTATIONS = [
  {
    value: "vertical",
    label: "Vertical",
    icon: <rect x="9" y="4" width="6" height="16" rx="1" />,
  },
  {
    value: "horizontal",
    label: "Horizontal",
    icon: <rect x="4" y="9" width="16" height="6" rx="1" />,
  },
  {
    value: "best",
    label: "Best",
    icon: (
      <>
        <path d="M12 2L2 7l10 5 10-5-10-5z" />
        <path d="M2 17l10 5 10-5" />
        <path d="M2 12l10 5 10-5" />
      </>
    ),
  },
];

const isValidAngle = (angle: string) => {
  const value = parseFloat(angle);
  return value >= 0 && value <= 90;
};

interface RoofAnglePanelProps {
  roofPolygons: google.maps.Polygon[];
  objectPolygons: google.maps.Polygon[];
  solarData: RoofSegment[] | null;
  onConfirm: (data: AngleConfirmData) => void;
  onCancel: () => void;
}

export default function RoofAnglePanel({
  roofPolygons,
  objectPolygons,
  solarData,
  onConfirm,
  onCancel,
}: RoofAnglePanelProps) {
  const [angles, setAngles] = useState<string[]>([]);
  const [edgePadding, setEdgePadding] = useState("20");
  const [panelOrientation, setPanelOrientation] = useState("best");
  const seededPolygonsRef = useRef<google.maps.Polygon[] | null>(null);

  const padding = parseFloat(edgePadding);
  const isGenerateEnabled =
    angles.length > 0 && angles.every(isValidAngle) && padding >= 0;

  // Seed angles from solar data once per polygon set; when solar data arrives
  // later, only fill in angles the user hasn't entered
  useEffect(() => {
    const isNewPolygonSet = seededPolygonsRef.current !== roofPolygons;
    seededPolygonsRef.current = roofPolygons;
    setAngles((prev) =>
      roofPolygons.map(
        (_, index) =>
          (!isNewPolygonSet && prev[index]) || apiAngle(solarData, index),
      ),
    );
  }, [roofPolygons, solarData]);

  // Numbered labels at each roof's pole of inaccessibility
  useEffect(() => {
    const labels = roofPolygons.map((polygon, index) => {
      const coordinates = polygon
        .getPath()
        .getArray()
        .map((point) => [point.lng(), point.lat()] as [number, number]);
      coordinates.push(coordinates[0]);
      const [lng, lat] = polylabel([coordinates], 0.000001);

      return new google.maps.Marker({
        position: { lat, lng },
        map: polygon.getMap(),
        label: {
          text: (index + 1).toString(),
          color: "white",
          fontSize: "16px",
          fontWeight: "bold",
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: "#007AFF",
          fillOpacity: 1,
          strokeColor: "#ffffff",
          strokeWeight: 2,
          scale: 12,
        },
      });
    });

    return () => labels.forEach((label) => label.setMap(null));
  }, [roofPolygons]);

  const handleConfirm = () => {
    const parsedAngles = angles.map(parseFloat);

    // Get map bounds and resolution
    const bounds = roofPolygons[0]?.getMap()?.getBounds();
    if (!bounds) {
      console.error("Map bounds not available");
      onConfirm({ angles: parsedAngles, edgePadding: padding });
      return;
    }

    const mapBounds = {
      north: bounds.getNorthEast().lat(),
      south: bounds.getSouthWest().lat(),
      east: bounds.getNorthEast().lng(),
      west: bounds.getSouthWest().lng(),
    };

    const requestBody = {
      angles: parsedAngles,
      edgePadding: padding,
      panelOrientation,
      roofPolygons: roofPolygons.map((polygon) => ({
        coords: extractPolygonCoordinates(polygon),
      })),
      objectPolygons: objectPolygons.map((polygon) => ({
        coords: extractPolygonCoordinates(polygon),
      })),
      solarData,
      mapBounds,
      module: "standard",
      spacing: 0.5,
    };

    // Close popup immediately, then make API call in background
    onConfirm({
      angles: parsedAngles,
      edgePadding: padding,
      _requestBody: requestBody,
    });
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Roof Configuration</h3>
      </div>

      <div className={styles.content}>
        {roofPolygons.map((_, index) => {
          const stats = segmentStats(solarData, index);
          const pitch = stats?.pitchDegrees;
          const isLoading = solarData === null;
          // Show "Enter manually" only when API data is unavailable or returns 0/null
          const hasValidApiData = pitch && pitch > 0;
          const noDataAvailable = solarData !== null && !hasValidApiData;

          return (
            <div key={index} className={styles.roofItem}>
              <label>
                <span className={styles.badge}>{index + 1}</span>
                Pitch
                {isLoading ? (
                  <small className={styles.hint}>Loading...</small>
                ) : hasValidApiData ? (
                  <small className={styles.hint}>
                    Pitch: {pitch.toFixed(1)}°, Azimuth:{" "}
                    {stats.azimuthDegrees?.toFixed(0)}°
                  </small>
                ) : noDataAvailable ? (
                  <small className={styles.hint}>Enter manually</small>
                ) : null}
              </label>
              <div className={styles.inputGroup}>
                <input
                  type="number"
                  min="0"
                  max="90"
                  step="0.1"
                  value={angles[index] || ""}
                  onChange={(e) =>
                    setAngles((prev) =>
                      Object.assign([...prev], { [index]: e.target.value }),
                    )
                  }
                  placeholder="0-90"
                />
                <span className={styles.unit}>°</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className={styles.footer}>
        <div className={styles.globalSetting}>
          <label>Edge Padding</label>
          <div className={styles.inputGroup}>
            <input
              type="number"
              min="0"
              step="1"
              value={edgePadding}
              onChange={(e) => setEdgePadding(e.target.value)}
              placeholder="20"
            />
            <span className={styles.unit}>cm</span>
          </div>
        </div>

        <div className={styles.globalSetting}>
          <label>Panel Orientation</label>
          <div className={styles.orientationToggle}>
            <div
              className={styles.orientationSwitch}
              role="radiogroup"
              aria-label="Panel orientation"
            >
              <div
                className={styles.orientationSlider}
                style={{
                  transform: `translateX(${
                    ORIENTATIONS.findIndex(
                      (o) => o.value === panelOrientation,
                    ) * 100
                  }%)`,
                }}
              />
              {ORIENTATIONS.map(({ value, label, icon }) => (
                <button
                  key={value}
                  type="button"
                  className={`${styles.orientationOption} ${
                    panelOrientation === value ? styles.active : ""
                  }`}
                  onClick={() => setPanelOrientation(value)}
                  role="radio"
                  aria-checked={panelOrientation === value}
                >
                  <svg
                    className={styles.orientationIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                  >
                    {icon}
                  </svg>
                  <span className={styles.orientationLabel}>{label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!isGenerateEnabled}
          >
            Generate
          </Button>
        </div>
      </div>
    </div>
  );
}
