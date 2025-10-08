export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false

  // Check for touch capability and screen size
  const hasTouchScreen = 'ontouchstart' in window || navigator.maxTouchPoints > 0
  const isMobileScreen = window.innerWidth <= 768

  return hasTouchScreen && isMobileScreen
}

export function useIsMobile(): boolean {
  if (typeof window === 'undefined') return false

  return isMobileDevice()
}
