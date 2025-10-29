'use client'

import styles from './MapControls.module.css'

interface MapControlsProps {
  map: google.maps.Map | null
  hasPolygons?: boolean
  hasPanels?: boolean
  shadeVisualizationEnabled?: boolean
  onClearAll?: () => void
  onToggleShadeVisualization?: () => void
}

/**
 * Floating map zoom controls component
 * Provides + and - buttons for map zoom, shade visualization toggle, and clear all functionality
 */
export default function MapControls({
  map,
  hasPolygons = false,
  hasPanels = false,
  shadeVisualizationEnabled = false,
  onClearAll,
  onToggleShadeVisualization
}: MapControlsProps) {
  if (!map) return null

  const handleZoomIn = () => {
    const currentZoom = map.getZoom()
    if (currentZoom !== undefined) {
      map.setZoom(currentZoom + 1)
    }
  }

  const handleZoomOut = () => {
    const currentZoom = map.getZoom()
    if (currentZoom !== undefined) {
      map.setZoom(currentZoom - 1)
    }
  }

  const handleClearAll = () => {
    if (window.confirm('Clear all polygons and reset map? This cannot be undone.')) {
      onClearAll?.()
    }
  }

  return (
    <div className={styles.mapControls}>
      <button
        className={styles.zoomControl}
        onClick={handleZoomIn}
        aria-label="Zoom in"
      >
        <i className="fas fa-plus"></i>
      </button>
      <button
        className={styles.zoomControl}
        onClick={handleZoomOut}
        aria-label="Zoom out"
      >
        <i className="fas fa-minus"></i>
      </button>
      {hasPanels && (
        <button
          className={`${styles.shadeControl} ${shadeVisualizationEnabled ? styles.active : ''}`}
          onClick={onToggleShadeVisualization}
          aria-label={shadeVisualizationEnabled ? "Hide shade analysis" : "Show shade analysis"}
          title={shadeVisualizationEnabled ? "Hide shade analysis" : "Show shade analysis"}
        >
          <i className="fas fa-sun"></i>
        </button>
      )}
      {hasPolygons && (
        <button
          className={styles.clearControl}
          onClick={handleClearAll}
          aria-label="Clear all polygons"
          title="Clear all polygons"
        >
          <i className="fas fa-redo-alt"></i>
        </button>
      )}
    </div>
  )
}
