"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Icon } from "@/shared/components/ui/Icon";
import styles from "./ZoomableImage.module.css";

interface ZoomableImageProps {
  src: string;
  alt?: string;
}

export default function ZoomableImage({
  src,
  alt = "Uploaded",
}: ZoomableImageProps) {
  const [zoom, setZoom] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  const minZoom = 0.5;
  const maxZoom = 5;
  const zoomStep = 0.2;

  // Reset position when zoom changes to keep image centered
  useEffect(() => {
    if (zoom === 1) {
      setPosition({ x: 0, y: 0 });
    }
  }, [zoom]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -zoomStep : zoomStep;
    setZoom((prev) => Math.max(minZoom, Math.min(maxZoom, prev + delta)));
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (container) {
      container.addEventListener("wheel", handleWheel, { passive: false });
      return () => container.removeEventListener("wheel", handleWheel);
    }
  }, [handleWheel]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(maxZoom, prev + zoomStep));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(minZoom, prev - zoomStep));
  };

  const handleResetZoom = () => {
    setZoom(1);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <div className={styles.container}>
      <div
        ref={containerRef}
        className={`${styles.imageContainer} ${
          isDragging ? styles.dragging : ""
        }`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <img
          ref={imageRef}
          src={src}
          alt={alt}
          className={styles.image}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${zoom})`,
            cursor: zoom > 1 ? (isDragging ? "grabbing" : "grab") : "default",
          }}
          draggable={false}
        />
      </div>

      <div className={styles.controls}>
        <button
          className={styles.controlButton}
          onClick={handleZoomIn}
          disabled={zoom >= maxZoom}
          aria-label="Zoom in"
        >
          <Icon name="plus" />
        </button>
        <button
          className={styles.controlButton}
          onClick={handleResetZoom}
          disabled={zoom === 1 && position.x === 0 && position.y === 0}
          aria-label="Reset zoom"
        >
          <Icon name="expand" />
        </button>
        <button
          className={styles.controlButton}
          onClick={handleZoomOut}
          disabled={zoom <= minZoom}
          aria-label="Zoom out"
        >
          <Icon name="minus" />
        </button>
        <div className={styles.zoomLevel}>{Math.round(zoom * 100)}%</div>
      </div>
    </div>
  );
}
