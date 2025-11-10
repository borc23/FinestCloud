/**
 * Solar Panel Generation API Service
 * Modern React implementation for calling Solar API and generating panel data
 */

import { extractPolygonCoordinates, type PolygonCoordinates } from '@/features/map-drawing/utils/polygonUtils'
import type { SolarDataSegment } from '@/features/solar-panels/types/panel'
import { checkSolarApiCoverage } from '@/features/solar-analysis/utils/coverageCheck'

interface SolarApiResponse {
  success: boolean
  data?: SolarDataSegment[]
  error?: string
  coverageWarning?: string
}

export class SolarPanelApiService {
  /**
   * Check if location has Solar API coverage
   */
  checkCoverage(lat: number, lng: number) {
    return checkSolarApiCoverage(lat, lng)
  }

  /**
   * Fetch solar data for each polygon from the backend
   * @param roofPolygons - Array of Google Maps polygons representing roofs
   * @param mapBounds - Map bounds containing center coordinates
   */
  async fetchSolarDataForPolygons(
    roofPolygons: google.maps.Polygon[],
    mapBounds: { center: { lat: number; lng: number } }
  ): Promise<SolarApiResponse> {
    try {
      // Check coverage for the first polygon
      if (roofPolygons.length > 0) {
        const coords = extractPolygonCoordinates(roofPolygons[0])
        const center = this.calculatePolygonCenter(coords)
        const coverage = checkSolarApiCoverage(center.lat, center.lng)

        if (!coverage.hasCoverage) {
          console.warn('Coverage warning:', coverage.message)
        }
      }

      const polygonDataPromises = roofPolygons.map(async (polygon, index) => {
        // Get polygon center for the API call
        const coords = extractPolygonCoordinates(polygon)
        const center = this.calculatePolygonCenter(coords)

        // Call the solar API proxy for this polygon via Next.js API route
        const apiUrl = `/api/generate_panels?latitude=${center.lat}&longitude=${center.lng}`
        const response = await fetch(apiUrl)

        if (!response.ok) {
          // Try to get error details
          let errorMessage = `API request failed with status ${response.status}`
          try {
            const errorData = await response.json()
            if (errorData.detail && errorData.detail.includes('Solar API error')) {
              errorMessage = 'Google Solar API does not have coverage for this location. Please try a different area (e.g., US, UK, or other supported regions).'
            } else if (errorData.detail) {
              errorMessage = errorData.detail
            }
          } catch {
            // Keep default error message
          }
          throw new Error(errorMessage)
        }

        const data = await response.json()

        return {
          polygonIndex: index,
          coords,
          center,
          solarData: data
        }
      })

      // Wait for all polygon data to be fetched
      const polygonResults = await Promise.all(polygonDataPromises)

      return {
        success: true,
        data: polygonResults
      }
    } catch (error) {
      console.error('Error fetching solar panel data:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  /**
   * Calculate the center point of a polygon
   * @param coords - Array of polygon coordinates
   */
  private calculatePolygonCenter(coords: PolygonCoordinates[]): { lat: number; lng: number } {
    if (coords.length === 0) {
      throw new Error('Cannot calculate center of empty polygon')
    }

    let totalLat = 0
    let totalLng = 0

    coords.forEach(coord => {
      totalLat += coord.lat
      totalLng += coord.lng
    })

    return {
      lat: totalLat / coords.length,
      lng: totalLng / coords.length
    }
  }


  /**
   * Get map bounds from a Google Maps instance
   * @param map - Google Maps instance
   */
  getMapBounds(map: google.maps.Map): { center: { lat: number; lng: number } } {
    const center = map.getCenter()

    if (!center) {
      throw new Error('Unable to get map center')
    }

    return {
      center: {
        lat: center.lat(),
        lng: center.lng()
      }
    }
  }
}
