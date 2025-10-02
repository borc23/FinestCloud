'use client'

import { useEffect, useState, useRef } from 'react'
import styles from './RoofAnglePanel.module.css'

interface RoofSegment {
  polygonIndex: number
  coords: { lat: number; lng: number }[]
  center: { lat: number; lng: number }
  solarData: any
}

interface RoofAnglePanelProps {
  roofPolygons: google.maps.Polygon[]
  solarData: RoofSegment[] | null
  onConfirm: (data: { angles: number[]; edgePadding: number }) => void
  onCancel: () => void
}

export default function RoofAnglePanel({ roofPolygons, solarData, onConfirm, onCancel }: RoofAnglePanelProps) {
  const [angles, setAngles] = useState<string[]>([])
  const [edgePadding, setEdgePadding] = useState('20')
  const labelsRef = useRef<google.maps.Marker[]>([])

  useEffect(() => {
    // Initialize angles from solar data
    const initialAngles = roofPolygons.map((_, index) => {
      const segment = solarData?.find(s => s.polygonIndex === index)
      const pitchDegrees = segment?.solarData?.solarPotential?.roofSegmentStats?.[0]?.pitchDegrees
      return pitchDegrees ? pitchDegrees.toFixed(1) : ''
    })
    setAngles(initialAngles)

    // Add numbered labels to polygons
    roofPolygons.forEach((polygon, index) => {
      const bounds = new google.maps.LatLngBounds()
      polygon.getPath().forEach(point => bounds.extend(point))
      const center = bounds.getCenter()

      const label = new google.maps.Marker({
        position: center,
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
  }, [roofPolygons, solarData])

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

    onConfirm({ angles: parsedAngles, edgePadding: padding })
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

          return (
            <div key={index} className={styles.roofItem}>
              <label>
                <span className={styles.badge}>{index + 1}</span>
                Angle
                {apiAngle && (
                  <small className={styles.hint}>
                    Pitch: {apiAngle.toFixed(1)}°, Azimuth: {azimuth?.toFixed(0)}°
                  </small>
                )}
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

        <div className={styles.roofItem}>
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
      </div>

      <div className={styles.actions}>
        <button className={styles.cancelBtn} onClick={onCancel}>
          Cancel
        </button>
        <button className={styles.confirmBtn} onClick={handleConfirm}>
          Confirm
        </button>
      </div>
    </div>
  )
}
