'use client'

import { useEffect, useRef, useState } from 'react'
import styles from './MapContainer.module.css'

declare global {
  interface Window {
    google: any
    initMap: () => void
  }
}

export default function MapContainer() {
  const mapRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<any>(null)
  const [isImageView, setIsImageView] = useState(false)

  useEffect(() => {
    // Initialize Google Map
    const initializeMap = () => {
      if (mapRef.current && window.google) {
        const mapOptions = {
          center: { lat: 37.7749, lng: -122.4194 }, // Default to San Francisco
          zoom: 18,
          tilt: 0,
          mapTypeId: 'satellite',
          rotateControl: false,
          tiltInteractionEnabled: false,
          disableDefaultUI: true, // Clean interface for glassmorphism design
          zoomControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: 'greedy',
          styles: [
            {
              featureType: 'poi',
              elementType: 'labels',
              stylers: [{ visibility: 'off' }]
            }
          ]
        }

        const googleMap = new window.google.maps.Map(mapRef.current, mapOptions)
        setMap(googleMap)
        console.log('Map initialized')
      }
    }

    // Check if Google Maps API is already loaded
    if (window.google && window.google.maps) {
      initializeMap()
    } else {
      // Wait for the script to load
      const checkGoogleMaps = setInterval(() => {
        if (window.google && window.google.maps) {
          clearInterval(checkGoogleMaps)
          initializeMap()
        }
      }, 100)

      // Clean up interval after 10 seconds
      setTimeout(() => clearInterval(checkGoogleMaps), 10000)
    }
  }, [])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.add('dragOver')
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('dragOver')
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.currentTarget.classList.remove('dragOver')

    const files = e.dataTransfer.files
    if (files.length > 0) {
      console.log('File dropped:', files[0].name)
      // Placeholder for image upload handling
      setIsImageView(true)
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) {
      console.log('File selected:', files[0].name)
      // Placeholder for image upload handling
      setIsImageView(true)
    }
  }

  return (
    <div className={styles.mapContainer}>
      {/* Full-screen Map */}
      <div ref={mapRef} className={styles.map}></div>

      {/* Capture Square - for area selection */}
      <div className={styles.captureSquare} style={{ display: 'none' }}></div>

      {/* Image Upload Overlay */}
      {isImageView && (
        <div className={styles.imageView}>
          <div
            className={styles.dropZone}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => document.getElementById('fileInput')?.click()}
          >
            <div className={styles.dropZoneContent}>
              <i className="fas fa-cloud-upload-alt"></i>
              <p>Drag and drop an image here or click to upload</p>
            </div>
          </div>
          <input
            type="file"
            id="fileInput"
            style={{ display: 'none' }}
            accept="image/*"
            onChange={handleFileUpload}
          />
          <div className={styles.imageContainer}></div>
        </div>
      )}
    </div>
  )
}