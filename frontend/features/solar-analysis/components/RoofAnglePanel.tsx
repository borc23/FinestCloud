'use client'

import { useEffect, useState, useRef } from 'react'
import polylabel from 'polylabel'
import Button from '@/shared/components/ui/Button'
import styles from './RoofAnglePanel.module.css'
import { extractPolygonCoordinates } from '@/features/map-drawing/utils/polygonUtils'
import type { AngleConfirmData } from '@/features/solar-panels/types/panel'
import { useTutorial } from '@/contexts/TutorialContext'

interface RoofSegment {
  polygonIndex: number
  coords: { lat: number; lng: number }[]
  center: { lat: number; lng: number }
  solarData: any
}

interface RoofAnglePanelProps {
  roofPolygons: google.maps.Polygon[]
  objectPolygons: google.maps.Polygon[]
  solarData: RoofSegment[] | null
  onConfirm: (data: AngleConfirmData) => void
  onCancel: () => void
}

export default function RoofAnglePanel({ roofPolygons, objectPolygons, solarData, onConfirm, onCancel }: RoofAnglePanelProps) {
  const [angles, setAngles] = useState<string[]>([])
  const [edgePadding, setEdgePadding] = useState('20')
  const [panelOrientation, setPanelOrientation] = useState('best')
  const labelsRef = useRef<google.maps.Marker[]>([])
  const { showTooltip, markStepComplete } = useTutorial()

  // Check if all angles are populated
  const isGenerateEnabled = angles.length > 0 && angles.every(angle => angle !== '' && !isNaN(parseFloat(angle)))

  useEffect(() => {
    labelsRef.current.forEach(label => label.setMap(null))
    labelsRef.current = []

    // Initialize angles from solar data
    const initialAngles = roofPolygons.map((_, index) => {
      const segment = solarData?.find(s => s.polygonIndex === index)
      const pitchDegrees = segment?.solarData?.solarPotential?.roofSegmentStats?.[0]?.pitchDegrees
      return pitchDegrees ? pitchDegrees.toFixed(1) : ''
    })
    setAngles(initialAngles)

    // Show tutorial tooltip when panel opens
    setTimeout(() => {
      showTooltip({
        id: 'roof_angle_panel',
        targetElement: '[data-tutorial="generate-button"]',
        content: "We've auto-filled roof angles from Google Solar API. Adjust if needed, then click Generate Panels.",
        position: 'top',
        showNext: false,
        showSkip: true,
      })
    }, 500)

    roofPolygons.forEach((polygon, index) => {
      const path = polygon.getPath().getArray()
      const coordinates = path.map(point => [point.lng(), point.lat()] as [number, number])
      coordinates.push(coordinates[0])
      const [lng, lat] = polylabel([coordinates], 0.000001)

      const label = new google.maps.Marker({
        position: { lat, lng },
        map: polygon.getMap(),
        label: {
          text: (index + 1).toString(),
          color: 'white',
          fontSize: '16px',
          fontWeight: 'bold'
        },
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillColor: '#007AFF',
          fillOpacity: 1,
          strokeColor: '#ffffff',
          strokeWeight: 2,
          scale: 12
        }
      })
      labelsRef.current.push(label)
    })

    return () => {
      labelsRef.current.forEach(label => label.setMap(null))
      labelsRef.current = []
    }
  }, [roofPolygons, solarData, showTooltip])


  const handleConfirm = () => {
    const parsedAngles = angles.map((a, i) => {
      const val = parseFloat(a)
      if (isNaN(val) || val < 0 || val > 90) {
        throw new Error(`Invalid angle for roof ${i + 1}`)
      }
      return val
    })

    const padding = parseFloat(edgePadding)
    if (isNaN(padding) || padding < 0) {
      throw new Error('Invalid edge padding')
    }

    // Get map bounds and resolution
    const map = roofPolygons[0]?.getMap()
    if (!map) {
      console.error('Map not available')
      onConfirm({ angles: parsedAngles, edgePadding: padding })
      return
    }

    const bounds = map.getBounds()
    if (!bounds) {
      console.error('Map bounds not available')
      onConfirm({ angles: parsedAngles, edgePadding: padding })
      return
    }

    const mapBounds = {
      north: bounds.getNorthEast().lat(),
      south: bounds.getSouthWest().lat(),
      east: bounds.getNorthEast().lng(),
      west: bounds.getSouthWest().lng()
    }

    const requestBody = {
      angles: parsedAngles,
      edgePadding: padding,
      panelOrientation,
      roofPolygons: roofPolygons.map(polygon => ({
        coords: extractPolygonCoordinates(polygon)
      })),
      objectPolygons: objectPolygons.map(polygon => ({
        coords: extractPolygonCoordinates(polygon)
      })),
      solarData,
      mapBounds,
      module: 'standard',
      spacing: 0.5
    }

    // Mark generate step as complete
    markStepComplete('generate')

    // Close popup immediately, then make API call in background
    onConfirm({
      angles: parsedAngles,
      edgePadding: padding,
      _requestBody: requestBody
    })
  }

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>Roof Configuration</h3>
      </div>

      <div className={styles.content}>
        {roofPolygons.map((_, index) => {
          const segment = solarData?.find(s => s.polygonIndex === index)
          const apiAngle = segment?.solarData?.solarPotential?.roofSegmentStats?.[0]?.pitchDegrees
          const azimuth = segment?.solarData?.solarPotential?.roofSegmentStats?.[0]?.azimuthDegrees
          const isLoading = solarData === null
          const noDataAvailable = solarData !== null && !apiAngle

          return (
            <div key={index} className={styles.roofItem}>
              <label>
                <span className={styles.badge}>{index + 1}</span>
                Pitch
                {isLoading ? (
                  <small className={styles.hint}>Loading...</small>
                ) : apiAngle ? (
                  <small className={styles.hint}>
                    Pitch: {apiAngle.toFixed(1)}°, Azimuth: {azimuth?.toFixed(0)}°
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
                  value={angles[index] || ''}
                  onChange={(e) => {
                    const newAngles = [...angles]
                    newAngles[index] = e.target.value
                    setAngles(newAngles)
                  }}
                  placeholder="0-90"
                />
                <span className={styles.unit}>°</span>
              </div>
            </div>
          )
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
                  transform: panelOrientation === 'vertical'
                    ? 'translateX(0%)'
                    : panelOrientation === 'horizontal'
                    ? 'translateX(100%)'
                    : 'translateX(200%)'
                }}
              />
              <button
                type="button"
                className={`${styles.orientationOption} ${panelOrientation === 'vertical' ? styles.active : ''}`}
                onClick={() => setPanelOrientation('vertical')}
                role="radio"
                aria-checked={panelOrientation === 'vertical'}
              >
                <svg className={styles.orientationIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="9" y="4" width="6" height="16" rx="1" />
                </svg>
                <span className={styles.orientationLabel}>Vertical</span>
              </button>
              <button
                type="button"
                className={`${styles.orientationOption} ${panelOrientation === 'horizontal' ? styles.active : ''}`}
                onClick={() => setPanelOrientation('horizontal')}
                role="radio"
                aria-checked={panelOrientation === 'horizontal'}
              >
                <svg className={styles.orientationIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <rect x="4" y="9" width="16" height="6" rx="1" />
                </svg>
                <span className={styles.orientationLabel}>Horizontal</span>
              </button>
              <button
                type="button"
                className={`${styles.orientationOption} ${panelOrientation === 'best' ? styles.active : ''}`}
                onClick={() => setPanelOrientation('best')}
                role="radio"
                aria-checked={panelOrientation === 'best'}
              >
                <svg className={styles.orientationIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M12 2L2 7l10 5 10-5-10-5z" />
                  <path d="M2 17l10 5 10-5" />
                  <path d="M2 12l10 5 10-5" />
                </svg>
                <span className={styles.orientationLabel}>Best</span>
              </button>
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
            data-tutorial="generate-button"
          >
            Generate Panels
          </Button>
        </div>
      </div>
    </div>
  )
}
