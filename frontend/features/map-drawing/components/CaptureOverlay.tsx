"use client";

import { useState, useRef, useEffect } from "react";
import Button from "@/shared/components/ui/Button";
import styles from "./CaptureOverlay.module.css";

interface CaptureOverlayProps {
  isVisible: boolean;
  onCapture: (
    bounds: google.maps.LatLngBounds | null,
    size?: { width: number; height: number },
  ) => void;
  onToggle: () => void;
  map: google.maps.Map | null;
}

export default function CaptureOverlay({
  isVisible,
  onCapture,
  onToggle,
  map,
}: CaptureOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Size and center the capture square; it depends only on the map's size
  useEffect(() => {
    if (!isVisible || !map) return;
    const mapContainer = map.getDiv();

    const updatePosition = () => {
      if (!overlayRef.current) return;
      const { width, height } = mapContainer.getBoundingClientRect();

      // Reserve space for toolstrip at top (44px + padding) and Cancel/Capture buttons at bottom
      const reservedTopSpace = 60;
      const reservedBottomSpace = 120;
      const availableHeight = height - reservedTopSpace - reservedBottomSpace;

      // Use the smaller dimension to ensure it fits, with a max of 640px
      const size = Math.min(width, availableHeight, 640);

      Object.assign(overlayRef.current.style, {
        left: `${(width - size) / 2}px`,
        top: `${reservedTopSpace + (availableHeight - size) / 2}px`,
        width: `${size}px`,
        height: `${size}px`,
      });
    };

    updatePosition();
    const observer = new ResizeObserver(updatePosition);
    observer.observe(mapContainer);
    return () => observer.disconnect();
  }, [isVisible, map]);

  // Add ESC key handler
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && isVisible && !isProcessing) {
        event.preventDefault();
        // Blur any focused button to prevent visual feedback
        if (document.activeElement instanceof HTMLButtonElement) {
          document.activeElement.blur();
        }
        // Reset processing state when closing
        setIsProcessing(false);
        onToggle();
      }
    };

    if (isVisible) {
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isVisible, isProcessing, onToggle]);

  // Reset processing state when overlay becomes invisible
  useEffect(() => {
    if (!isVisible) {
      setIsProcessing(false);
    }
  }, [isVisible]);

  /** Map bounds covered by the capture square (null if they can't be computed) */
  const getBounds = async (): Promise<google.maps.LatLngBounds | null> => {
    if (!overlayRef.current || !map) return null;

    const overlay = new google.maps.OverlayView();
    overlay.draw = () => {};
    overlay.setMap(map);

    try {
      // Wait (max 10 frames / 500ms) for the overlay's projection
      const startTime = Date.now();
      for (let attempt = 1; !overlay.getProjection(); attempt++) {
        if (attempt > 10 || Date.now() - startTime >= 500) {
          throw new Error("Timeout waiting for Google Maps projection");
        }
        await new Promise(requestAnimationFrame);
      }

      const projection = overlay.getProjection();
      const container = map.getDiv().getBoundingClientRect();
      const square = overlayRef.current.getBoundingClientRect();
      const toLatLng = (x: number, y: number) =>
        projection.fromContainerPixelToLatLng(
          new google.maps.Point(x - container.left, y - container.top),
        );
      const topLeft = toLatLng(square.left, square.top);
      const bottomRight = toLatLng(square.right, square.bottom);
      if (!topLeft || !bottomRight) {
        throw new Error("Failed to convert pixel coordinates to LatLng");
      }

      return new google.maps.LatLngBounds().extend(topLeft).extend(bottomRight);
    } catch (error) {
      console.error("Failed to compute capture bounds:", error);
      return null;
    } finally {
      overlay.setMap(null);
    }
  };

  const handleDetect = async () => {
    if (isProcessing) return;

    setIsProcessing(true);

    try {
      const bounds = await getBounds();

      // Get the actual capture size
      const size = overlayRef.current
        ? {
            width: parseInt(overlayRef.current.style.width, 10),
            height: parseInt(overlayRef.current.style.height, 10),
          }
        : undefined;

      await onCapture(bounds, size);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isVisible) return null;

  return (
    <>
      {/* ARIA Live Region for Screen Readers */}
      <div role="status" aria-live="polite" className={styles.srOnly}>
        {isProcessing ? "Processing capture" : ""}
      </div>

      {/* Capture Square */}
      <div
        ref={overlayRef}
        className={styles.captureSquare}
        data-processing={isProcessing}
      >
        <div className={styles.squareBorder}></div>

        {isProcessing && (
          <div className={styles.processingOverlay}>
            <div className="spinner" role="status" aria-label="Loading" />
            <span>Processing</span>
          </div>
        )}

        {/* Action Button */}
        <div className={styles.actionContainer}>
          <Button
            variant="secondary"
            onClick={onToggle}
            disabled={isProcessing}
            aria-label="Cancel"
          >
            Cancel
          </Button>

          <Button
            variant="primary"
            onClick={handleDetect}
            disabled={isProcessing}
            aria-label={isProcessing ? "Processing" : "Start Capture"}
          >
            Capture
          </Button>
        </div>
      </div>
    </>
  );
}
