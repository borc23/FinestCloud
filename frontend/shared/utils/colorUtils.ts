/**
 * Convert hex color to RGB array for jsPDF
 * @param hex - Hex color string (e.g., '#3B82F6' or '3B82F6')
 * @returns RGB array [r, g, b] with values 0-255
 */
export function hexToRgb(hex: string): [number, number, number] {
  // Remove # if present
  const cleanHex = hex.replace("#", "");

  // Parse hex values
  const r = parseInt(cleanHex.substring(0, 2), 16);
  const g = parseInt(cleanHex.substring(2, 4), 16);
  const b = parseInt(cleanHex.substring(4, 6), 16);

  // Validate
  if (isNaN(r) || isNaN(g) || isNaN(b)) {
    console.error(`Invalid hex color: ${hex}`);
    return [59, 130, 246]; // Default blue
  }

  return [r, g, b];
}
