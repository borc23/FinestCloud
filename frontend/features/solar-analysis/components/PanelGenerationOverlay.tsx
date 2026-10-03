"use client";

import styles from "./PanelGenerationOverlay.module.css";

interface PanelGenerationOverlayProps {
  isVisible: boolean;
  progress?: { current: number; total: number } | null;
}

/**
 * Overlay component shown during panel generation
 * Displays loading spinner and progress information
 */
export default function PanelGenerationOverlay({
  isVisible,
  progress,
}: PanelGenerationOverlayProps) {
  if (!isVisible) return null;

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>
        <div className={`spinner ${styles.spinner}`} />
        <span className={styles.text}>
          {progress
            ? `Generating panels... ${progress.current}/${progress.total}`
            : "Generating solar panels..."}
        </span>
      </div>
    </div>
  );
}
