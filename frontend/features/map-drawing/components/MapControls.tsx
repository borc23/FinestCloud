'use client'

import { Icon } from '@/shared/components/ui/Icon'
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
        <Icon name="plus" />
      </button>
      <button
        className={styles.zoomControl}
        onClick={handleZoomOut}
        aria-label="Zoom out"
      >
        <Icon name="minus" />
      </button>
      {/* {hasPanels && hasGeotiffData && (
        <button
          className={`${styles.shadeControl} ${shadeVisualizationEnabled ? styles.active : ''}`}
          onClick={onToggleShadeVisualization}
          aria-label={shadeVisualizationEnabled ? "Hide shade analysis" : "Show shade analysis"}
          title={shadeVisualizationEnabled ? "Hide shade analysis" : "Show shade analysis"}
        >
          <Icon name="solar-panel" />
        </button>
      )} */}
      {hasPanels && hasGeotiffData && (
        <button
          className={`${styles.shadeControl} ${sunshineLayerEnabled ? styles.active : ''}`}
          onClick={onToggleSunshineLayer}
          aria-label={sunshineLayerEnabled ? "Hide annual sunshine" : "Show annual sunshine"}
          title={sunshineLayerEnabled ? "Hide annual sunshine" : "Show annual sunshine"}
        >
          <Icon name="sun" />
        </button>
      )}
      {hasPolygons && (
        <button
          className={styles.clearControl}
          onClick={handleClearAll}
          aria-label="Clear map"
          title="Clear map"
        >
          <Icon name="refresh" />
        </button>
      )}
    </div>
  )
}
