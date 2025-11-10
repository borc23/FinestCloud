/**
 * Google Solar API Coverage Checker
 * Helps determine if a location is likely to have Solar API coverage
 */

interface CoverageRegion {
  name: string
  bounds: {
    north: number
    south: number
    east: number
    west: number
  }
}

/**
 * Known regions with Google Solar API coverage (approximate)
 * Based on https://developers.google.com/maps/documentation/solar/coverage
 */
const COVERAGE_REGIONS: CoverageRegion[] = [
  // United States (Continental)
  {
    name: 'United States',
    bounds: {
      north: 49.0,
      south: 25.0,
      east: -66.0,
      west: -125.0,
    },
  },
  // United Kingdom
  {
    name: 'United Kingdom',
    bounds: {
      north: 60.0,
      south: 49.5,
      east: 2.0,
      west: -8.0,
    },
  },
  // Germany
  {
    name: 'Germany',
    bounds: {
      north: 55.1,
      south: 47.3,
      east: 15.0,
      west: 5.9,
    },
  },
  // France
  {
    name: 'France',
    bounds: {
      north: 51.1,
      south: 41.3,
      east: 9.6,
      west: -5.1,
    },
  },
  // Netherlands
  {
    name: 'Netherlands',
    bounds: {
      north: 53.5,
      south: 50.7,
      east: 7.2,
      west: 3.4,
    },
  },
  // Belgium
  {
    name: 'Belgium',
    bounds: {
      north: 51.5,
      south: 49.5,
      east: 6.4,
      west: 2.5,
    },
  },
  // Japan
  {
    name: 'Japan',
    bounds: {
      north: 45.5,
      south: 24.0,
      east: 154.0,
      west: 122.0,
    },
  },
]

export interface CoverageCheckResult {
  hasCoverage: boolean
  region?: string
  message: string
  isUncertain: boolean
}

/**
 * Check if coordinates are likely within Google Solar API coverage
 */
export function checkSolarApiCoverage(lat: number, lng: number): CoverageCheckResult {
  // Check each known coverage region
  for (const region of COVERAGE_REGIONS) {
    if (
      lat >= region.bounds.south &&
      lat <= region.bounds.north &&
      lng >= region.bounds.west &&
      lng <= region.bounds.east
    ) {
      return {
        hasCoverage: true,
        region: region.name,
        message: `Location appears to be in ${region.name}, which has Solar API coverage.`,
        isUncertain: false,
      }
    }
  }

  // Not in known regions
  return {
    hasCoverage: false,
    message: `This location may not have Google Solar API coverage. The API works best in the US, UK, and select European countries. You can still use manual inputs for solar calculations.`,
    isUncertain: true,
  }
}

/**
 * Get suggested test locations with known coverage
 */
export function getSuggestedLocations() {
  return [
    {
      name: 'San Francisco, CA',
      lat: 37.7749,
      lng: -122.4194,
      description: 'Good solar potential, full API coverage',
    },
    {
      name: 'Mountain View, CA',
      lat: 37.3861,
      lng: -122.0839,
      description: 'Google HQ, full API coverage',
    },
    {
      name: 'Phoenix, AZ',
      lat: 33.4484,
      lng: -111.9260,
      description: 'Excellent solar potential, full API coverage',
    },
    {
      name: 'London, UK',
      lat: 51.5074,
      lng: -0.1278,
      description: 'European coverage available',
    },
    {
      name: 'Berlin, Germany',
      lat: 52.5200,
      lng: 13.4050,
      description: 'European coverage available',
    },
  ]
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lat: number, lng: number): string {
  const latDir = lat >= 0 ? 'N' : 'S'
  const lngDir = lng >= 0 ? 'E' : 'W'
  return `${Math.abs(lat).toFixed(4)}°${latDir}, ${Math.abs(lng).toFixed(4)}°${lngDir}`
}
