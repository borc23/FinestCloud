/**
 * Convert hex color to RGB array for jsPDF
 * @param hex - Hex color string (e.g., '#3B82F6' or '3B82F6')
 * @returns RGB array [r, g, b] with values 0-255
 */
export function hexToRgb(hex: string): [number, number, number] {
  // Remove # if present
  const cleanHex = hex.replace('#', '')

  // Parse hex values
  const r = parseInt(cleanHex.substring(0, 2), 16)
  const g = parseInt(cleanHex.substring(2, 4), 16)
  const b = parseInt(cleanHex.substring(4, 6), 16)

  // Validate
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    console.error(`Invalid hex color: ${hex}`)
    return [59, 130, 246] // Default blue
  }

  return [r, g, b]
}

/**
 * Convert RGB array to hex color
 * @param rgb - RGB array [r, g, b] with values 0-255
 * @returns Hex color string (e.g., '#3B82F6')
 */
export function rgbToHex(rgb: [number, number, number]): string {
  const [r, g, b] = rgb
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

/**
 * Get contrasting text color (black or white) based on background
 * @param bgColor - Background color in hex format
 * @returns 'black' or 'white' for optimal contrast
 */
export function getContrastColor(bgColor: string): 'black' | 'white' {
  const [r, g, b] = hexToRgb(bgColor)

  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  return luminance > 0.5 ? 'black' : 'white'
}
