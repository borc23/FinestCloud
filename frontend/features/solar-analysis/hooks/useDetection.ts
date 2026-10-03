import { useState, useRef } from "react";
import {
  DetectionResponse,
  DetectionRequest,
} from "@/features/solar-analysis/types/detection";

/** Roof/object detection for a captured map area; exposes the last error message */
export function useDetection() {
  const [error, setError] = useState<string | null>(null);
  const isDetectingRef = useRef(false);

  const detectRoofs = async (
    map: google.maps.Map,
    bounds: google.maps.LatLngBounds,
    size?: { width: number; height: number },
  ): Promise<DetectionResponse | null> => {
    if (isDetectingRef.current) {
      setError("Detection already in progress");
      return null;
    }

    isDetectingRef.current = true;
    setError(null);

    try {
      const zoom = map.getZoom();
      if (!zoom) throw new Error("Unable to get map zoom");

      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      const center = bounds.getCenter();
      const requestData: DetectionRequest = {
        view: {
          lat: center.lat(),
          lng: center.lng(),
          zoom,
          width: size?.width ?? 640,
          height: size?.height ?? 640,
        },
        bounds: {
          north: ne.lat(),
          south: sw.lat(),
          east: ne.lng(),
          west: sw.lng(),
        },
        conf: 0.5,
        epsilon: 0.0075,
      };

      const response = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestData),
      });

      if (!response.ok) {
        // Prefer error details from the response body
        let message = `Detection request failed (${response.status})`;
        try {
          const errorBody = await response.json();
          if (errorBody.error) message = errorBody.error;
          if (errorBody.details) message += `: ${errorBody.details}`;
        } catch {
          if (response.statusText) {
            message = `Detection request failed: ${response.statusText}`;
          }
        }
        throw new Error(message);
      }

      const result: DetectionResponse = await response.json();
      if (!result.success) throw new Error(result.error || "Detection failed");
      return result;
    } catch (err) {
      console.error("Detection error:", err);
      setError(
        err instanceof TypeError && err.message.includes("fetch")
          ? "Network request failed. Please check your connection."
          : err instanceof Error
            ? err.message
            : "An unexpected error occurred",
      );
      return null;
    } finally {
      isDetectingRef.current = false;
    }
  };

  return { error, detectRoofs, clearError: () => setError(null) };
}
