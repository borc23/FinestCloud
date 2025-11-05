/**
 * Screenshot utility using html2canvas
 * Provides a wrapper for taking screenshots of DOM elements
 */

import html2canvas from 'html2canvas'

/**
 * Capture a screenshot of a DOM element
 * @param element - The DOM element to capture
 * @param options - html2canvas options
 * @returns A promise that resolves to the canvas element
 */
export async function captureScreenshot(
  element: HTMLElement,
  options?: Partial<{
    backgroundColor: string | null
    allowTaint: boolean
    useCORS: boolean
    scale: number
    width: number
    height: number
    windowWidth: number
    windowHeight: number
    logging: boolean
  }>
): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    backgroundColor: options?.backgroundColor ?? '#ffffff',
    allowTaint: options?.allowTaint ?? false,
    useCORS: options?.useCORS ?? true,
    scale: options?.scale ?? 2,
    logging: options?.logging ?? false,
    ...options,
  })
}

/**
 * Capture a screenshot and convert to data URL
 * @param element - The DOM element to capture
 * @param options - html2canvas options
 * @returns A promise that resolves to a data URL string
 */
export async function captureScreenshotAsDataURL(
  element: HTMLElement,
  options?: Parameters<typeof captureScreenshot>[1]
): Promise<string> {
  const canvas = await captureScreenshot(element, options)
  return canvas.toDataURL('image/png')
}

/**
 * Capture a screenshot and download as file
 * @param element - The DOM element to capture
 * @param filename - The filename for the download
 * @param options - html2canvas options
 */
export async function downloadScreenshot(
  element: HTMLElement,
  filename: string = 'screenshot.png',
  options?: Parameters<typeof captureScreenshot>[1]
): Promise<void> {
  const dataURL = await captureScreenshotAsDataURL(element, options)

  const link = document.createElement('a')
  link.href = dataURL
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
