'use client'

import { useEffect, useState, useRef } from 'react'
import polylabel from 'polylabel'
import Button from './Button'
import styles from './RoofAnglePanel.module.css'

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
  onConfirm: (data: { angles: number[]; edgePadding: number; panelData?: any }) => void
  onCancel: () => void
}

export default function RoofAnglePanel({ roofPolygons, objectPolygons, solarData, onConfirm, onCancel }: RoofAnglePanelProps) {
  const [angles, setAngles] = useState<string[]>([])
  const [edgePadding, setEdgePadding] = useState('20')
  const labelsRef = useRef<google.maps.Marker[]>([])

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
  }, [roofPolygons, solarData])

  const handleConfirm = async () => {
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

    // Call the API endpoint
    try {
      const requestBody = {
        angles: parsedAngles,
        edgePadding: padding,
        roofPolygons: roofPolygons.map(polygon => {
          const path = polygon.getPath()
          const coords = []
          for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i)
            coords.push({ lat: point.lat(), lng: point.lng() })
          }
          return { coords }
        }),
        objectPolygons: objectPolygons.map(polygon => {
          const path = polygon.getPath()
          const coords = []
          for (let i = 0; i < path.getLength(); i++) {
            const point = path.getAt(i)
            coords.push({ lat: point.lat(), lng: point.lng() })
          }
          return { coords }
        }),
        solarData,
        mapBounds,
        module: 'standard',
        spacing: 0.5
      }

      console.log('RoofAnglePanel sending request:', {
        angles: parsedAngles,
        solarDataCount: solarData?.length,
        roofCount: roofPolygons.length
      })

      const response = await fetch('/api/generate_panels', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      console.log('API call response status:', response.status)
      const responseData = await response.json()
      console.log('API call response data:', responseData)

      onConfirm({
        angles: parsedAngles,
        edgePadding: padding,
        panelData: responseData.results || responseData
      })
    } catch (error) {
      console.error('API call error:', error)
      onConfirm({ angles: parsedAngles, edgePadding: padding })
    }
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

        <div className={styles.actions}>
          <Button variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirm}
            disabled={!isGenerateEnabled}
          >
            Generate
          </Button>
        </div>
      </div>
    </div>
  )
}
