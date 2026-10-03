/**
 * Data Layer Overlay Component
 * Renders GeoTIFF data layers (like annual sunshine) as an overlay on Google Maps
 */

"use client";

import { useEffect, useMemo } from "react";
// Type-only import: the parser module pulls in geotiff/proj4, which are loaded dynamically
import type { GeoTIFFData } from "../utils/geotiffParser";

interface DataLayerOverlayProps {
  map: google.maps.Map | null;
  geotiffData?: GeoTIFFData | null;
  visible: boolean;
  clipToPolygons?: google.maps.Polygon[]; // Optional: clip overlay to these polygons
}

// 1 meter offset towards north (1 meter latitude ≈ 0.000009 degrees)
const LATITUDE_OFFSET = 0.000009;

/** "Sunshine" color scale, blue (low) -> yellow (medium) -> red (high), as 256 RGB entries */
const SUNSHINE_LUT = new Uint8ClampedArray(256 * 3);
for (let i = 0; i < 256; i++) {
  const t2 = i < 128 ? (i / 255) * 2 : (i / 255 - 0.5) * 2;
  SUNSHINE_LUT.set(
    i < 128
      ? [t2 * 255, t2 * 255, (1 - t2) * 255] // Blue to yellow
      : [255, (1 - t2) * 255, 0], // Yellow to red
    i * 3,
  );
}

/** Color raster values with the sunshine scale; no-data (NaN) pixels stay transparent */
function toRGBA({ rasters, width, height, min, max }: GeoTIFFData) {
  const data = rasters[0];
  const rgba = new Uint8ClampedArray(width * height * 4);
  const scale = max > min ? 255 / (max - min) : 0;

  for (let i = 0; i < data.length; i++) {
    if (isNaN(data[i])) continue;
    const level = Math.round((data[i] - min) * scale);
    const c = Math.max(0, Math.min(255, level)) * 3;
    const idx = i * 4;
    rgba[idx] = SUNSHINE_LUT[c];
    rgba[idx + 1] = SUNSHINE_LUT[c + 1];
    rgba[idx + 2] = SUNSHINE_LUT[c + 2];
    rgba[idx + 3] = 200; // Semi-transparent overlay
  }

  return rgba;
}

/**
 * Custom overlay class that extends Google Maps OverlayView.
 * Defined lazily: the Maps script loads async, so google.maps.OverlayView
 * may not exist yet when this module is evaluated.
 */
function createGeoTIFFOverlayClass() {
  return class GeoTIFFOverlay extends google.maps.OverlayView {
    private div: HTMLDivElement | null = null;

    constructor(
      private bounds: google.maps.LatLngBounds,
      private canvas: HTMLCanvasElement,
      map: google.maps.Map,
    ) {
      super();
      this.setMap(map);
    }

    onAdd() {
      const div = document.createElement("div");
      div.style.borderStyle = "none";
      div.style.borderWidth = "0px";
      div.style.position = "absolute";
      div.appendChild(this.canvas);
      this.div = div;
      this.getPanes()?.overlayLayer.appendChild(div);
    }

    draw() {
      const projection = this.getProjection();
      if (!this.div || !projection) return;

      // Get pixel coordinates of bounds
      const sw = projection.fromLatLngToDivPixel(this.bounds.getSouthWest());
      const ne = projection.fromLatLngToDivPixel(this.bounds.getNorthEast());
      if (!sw || !ne) return;

      // Position the div; the canvas stretches to fill it
      this.div.style.left = sw.x + "px";
      this.div.style.top = ne.y + "px";
      this.div.style.width = ne.x - sw.x + "px";
      this.div.style.height = sw.y - ne.y + "px";
      this.canvas.style.width = "100%";
      this.canvas.style.height = "100%";
    }

    onRemove() {
      this.div?.remove();
      this.div = null;
    }
  };
}

let GeoTIFFOverlay: ReturnType<typeof createGeoTIFFOverlayClass> | null = null;

export default function DataLayerOverlay({
  map,
  geotiffData,
  visible,
  clipToPolygons,
}: DataLayerOverlayProps) {
  // Coloring every pixel is the expensive part: only redo it when the data changes
  const rgba = useMemo(() => geotiffData && toRGBA(geotiffData), [geotiffData]);

  useEffect(() => {
    if (!map || !visible || !geotiffData || !rgba) return;

    const { width, height, bounds } = geotiffData;
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.putImageData(new ImageData(rgba, width, height), 0, 0);

    // Offset bounds are used for both clipping and final overlay placement
    const north = bounds.north + LATITUDE_OFFSET;
    const south = bounds.south + LATITUDE_OFFSET;
    const { east, west } = bounds;

    // Keep only the pixels inside the polygons
    if (clipToPolygons && clipToPolygons.length > 0) {
      ctx.globalCompositeOperation = "destination-in";
      ctx.beginPath();
      clipToPolygons.forEach((polygon) => {
        polygon.getPath().forEach((point, i) => {
          // Convert lat/lng to canvas pixel coordinates
          const x = ((point.lng() - west) / (east - west)) * width;
          const y = ((north - point.lat()) / (north - south)) * height;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });
        ctx.closePath();
      });
      ctx.fill();
    }

    GeoTIFFOverlay ??= createGeoTIFFOverlayClass();
    const overlay = new GeoTIFFOverlay(
      new google.maps.LatLngBounds(
        new google.maps.LatLng(south, west),
        new google.maps.LatLng(north, east),
      ),
      canvas,
      map,
    );

    return () => overlay.setMap(null);
  }, [map, visible, geotiffData, rgba, clipToPolygons]);

  // This component doesn't render anything visible - it's a map overlay
  return null;
}
