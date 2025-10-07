'use client'

import styles from './MapControls.module.css'

interface MapControlsProps {
  map: google.maps.Map | null
}

/**
 * Floating map zoom controls component
 * Provides + and - buttons for map zoom
 */
export default function MapControls({ map }: MapControlsProps) {
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
    </div>
  )
}
