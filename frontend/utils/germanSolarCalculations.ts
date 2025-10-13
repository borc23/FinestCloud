/**
 * German Solar Production Calculations
 * Based on Fraunhofer ISE 2025 Photovoltaics Report
 * https://www.ise.fraunhofer.de/
 */

/**
 * Calculate realistic annual solar production for Germany
 * Based on ~10% capacity factor and 900-1000 full load hours
 *
 * @param systemSizeKw - System size in kW
 * @param location - Optional location bias ('north' | 'central' | 'south')
 * @param tilt - Roof tilt in degrees (default 35° optimal for Germany)
 * @param azimuth - Roof azimuth in degrees (default 180° = south)
 * @returns Annual production in kWh
 */
export function calculateGermanSolarProduction(
  systemSizeKw: number,
  location: 'north' | 'central' | 'south' = 'central',
  tilt: number = 35,
  azimuth: number = 180
): number {
  // Base full load hours by region (Fraunhofer ISE data)
  const baseFullLoadHours: Record<string, number> = {
    north: 850,    // Northern Germany (Hamburg, Bremen, Schleswig-Holstein)
    central: 950,  // Central Germany (Berlin, Hessen, NRW)
    south: 1050,   // Southern Germany (Bayern, Baden-Württemberg)
  }

  let fullLoadHours = baseFullLoadHours[location]

  // Tilt factor (optimal is 30-35° for Germany)
  const optimalTilt = 35
  const tiltDifference = Math.abs(tilt - optimalTilt)

  if (tiltDifference > 10) {
    // Reduce by ~1% per degree deviation after 10°
    const tiltPenalty = (tiltDifference - 10) * 0.01
    fullLoadHours *= (1 - Math.min(tiltPenalty, 0.25)) // Max 25% penalty
  }

  // Azimuth factor (optimal is 180° = south)
  const azimuthDeviation = Math.abs(azimuth - 180)

  if (azimuthDeviation > 45) {
    // East/West facing roofs produce ~15-20% less
    const azimuthPenalty = azimuthDeviation > 90 ? 0.25 : 0.15
    fullLoadHours *= (1 - azimuthPenalty)
  } else if (azimuthDeviation > 15) {
    // Minor deviation penalty
    const azimuthPenalty = (azimuthDeviation - 15) / 100
    fullLoadHours *= (1 - azimuthPenalty)
  }

  // Calculate annual production
  const annualProduction = systemSizeKw * fullLoadHours

  return Math.round(annualProduction)
}

/**
 * Get estimated location from latitude
 */
export function getGermanLocationFromLatitude(latitude?: number): 'north' | 'central' | 'south' {
  if (!latitude) return 'central'

  if (latitude >= 52.5) return 'north'      // North of Berlin
  if (latitude >= 50.0) return 'central'    // Central Germany
  return 'south'                            // Southern Germany
}

/**
 * Validate if production estimate is realistic for Germany
 */
export function validateGermanProduction(
  systemSizeKw: number,
  reportedProduction: number
): {
  isRealistic: boolean
  expectedRange: { min: number; max: number }
  message: string
} {
  // Conservative estimate (850 hours) to optimistic (1050 hours)
  const minProduction = systemSizeKw * 850
  const maxProduction = systemSizeKw * 1050

  const isRealistic = reportedProduction >= minProduction * 0.9 &&
                      reportedProduction <= maxProduction * 1.1

  let message = ''
  if (reportedProduction > maxProduction * 1.1) {
    message = 'Production estimate appears optimistic for typical German conditions. ' +
              'This would require exceptional south-facing orientation and southern German location.'
  } else if (reportedProduction < minProduction * 0.9) {
    message = 'Production estimate appears conservative. Check for shading or non-optimal orientation.'
  } else {
    message = 'Production estimate is within typical German ranges.'
  }

  return {
    isRealistic,
    expectedRange: {
      min: Math.round(minProduction),
      max: Math.round(maxProduction)
    },
    message
  }
}

/**
 * Get specific yield (kWh/kWp) for German regions
 */
export function getGermanSpecificYield(location: 'north' | 'central' | 'south'): number {
  const yields: Record<string, number> = {
    north: 850,    // kWh/kWp
    central: 950,  // kWh/kWp
    south: 1050,   // kWh/kWp
  }

  return yields[location]
}
