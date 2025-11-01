'use client'

import styles from './MapControls.module.css'

interface MapControlsProps {
  map: google.maps.Map | null
  hasPolygons?: boolean
  hasPanels?: boolean
  hasGeotiffData?: boolean
  shadeVisualizationEnabled?: boolean
  sunshineLayerEnabled?: boolean
  onClearAll?: () => void
  onToggleShadeVisualization?: () => void
  onToggleSunshineLayer?: () => void
}

/**
 * Floating map zoom controls component
 * Provides + and - buttons for map zoom, shade visualization toggle, and clear all functionality
 */
export default function MapControls({
  map,
  hasPolygons = false,
  hasPanels = false,
  hasGeotiffData = false,
  shadeVisualizationEnabled = false,
  sunshineLayerEnabled = false,
  onClearAll,
  onToggleShadeVisualization,
  onToggleSunshineLayer
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
      {/* {hasPanels && hasGeotiffData && (
        <button
          className={`${styles.shadeControl} ${shadeVisualizationEnabled ? styles.active : ''}`}
          onClick={onToggleShadeVisualization}
          aria-label={shadeVisualizationEnabled ? "Hide shade analysis" : "Show shade analysis"}
          title={shadeVisualizationEnabled ? "Hide shade analysis" : "Show shade analysis"}
        >
          <i className="fas fa-solar-panel"></i>
        </button>
      )} */}
      {hasPanels && hasGeotiffData && (
        <button
          className={`${styles.shadeControl} ${sunshineLayerEnabled ? styles.active : ''}`}
          onClick={onToggleSunshineLayer}
          aria-label={sunshineLayerEnabled ? "Hide annual sunshine" : "Show annual sunshine"}
          title={sunshineLayerEnabled ? "Hide annual sunshine" : "Show annual sunshine"}
        >
          <i className="fas fa-sun"></i>
        </button>
      )}
      {hasPolygons && (
        <button
          className={styles.clearControl}
          onClick={handleClearAll}
          aria-label="Clear map"
          title="Clear map"
        >
          <i className="fas fa-redo-alt"></i>
        </button>
      )}
    </div>
  )
}
