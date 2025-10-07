import { useEffect, useRef, useCallback } from 'react'

/**
 * Custom hook for managing Google Maps event listeners with automatic cleanup
 *
 * Benefits:
 * - Automatic cleanup on unmount
 * - Prevents memory leaks
 * - Type-safe listener management
 * - Reusable pattern for all map event listeners
 *
 * @example
 * ```tsx
 * const addClickListener = useMapListener(map)
 *
 * useEffect(() => {
 *   if (!map) return
 *
 *   const listener = addClickListener('click', (e) => {
 *     console.log('Map clicked at:', e.latLng)
 *   })
 *
 *   return () => listener.remove()
 * }, [map, addClickListener])
 * ```
 */
export function useMapListener(
  mapInstance: google.maps.Map | google.maps.Polygon | google.maps.Marker | null
) {
  const listenersRef = useRef<google.maps.MapsEventListener[]>([])

  /**
   * Add an event listener to the map instance
   * Returns an object with a remove() method for cleanup
   */
  const addListener = useCallback(
    <E extends string>(
      eventName: E,
      handler: (event: any) => void
    ) => {
      if (!mapInstance) {
        return { remove: () => {} }
      }

      const listener = google.maps.event.addListener(
        mapInstance,
        eventName,
        handler
      )

      listenersRef.current.push(listener)

      return {
        remove: () => {
          google.maps.event.removeListener(listener)
          listenersRef.current = listenersRef.current.filter(l => l !== listener)
        }
      }
    },
    [mapInstance]
  )

  /**
   * Remove all listeners for this hook instance
   */
  const removeAllListeners = useCallback(() => {
    listenersRef.current.forEach(listener => {
      google.maps.event.removeListener(listener)
    })
    listenersRef.current = []
  }, [])

  // Cleanup all listeners on unmount
  useEffect(() => {
    return () => {
      removeAllListeners()
    }
  }, [removeAllListeners])

  return addListener
}

/**
 * Hook for managing a single map event listener with dependencies
 *
 * Automatically handles cleanup and re-registration when dependencies change
 *
 * @example
 * ```tsx
 * useSingleMapListener(
 *   map,
 *   'click',
 *   (e) => {
 *     console.log('Clicked:', e.latLng)
 *   },
 *   [someState] // Re-register when someState changes
 * )
 * ```
 */
export function useSingleMapListener<E extends string>(
  mapInstance: google.maps.Map | google.maps.Polygon | google.maps.Marker | null,
  eventName: E,
  handler: (event: any) => void,
  deps: React.DependencyList = []
) {
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null)

  useEffect(() => {
    // Clean up previous listener
    if (listenerRef.current) {
      google.maps.event.removeListener(listenerRef.current)
      listenerRef.current = null
    }

    // Add new listener if map instance exists
    if (mapInstance) {
      listenerRef.current = google.maps.event.addListener(
        mapInstance,
        eventName,
        handler
      )
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current)
        listenerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, eventName, ...deps])
}

/**
 * Hook for managing multiple map event listeners with a common pattern
 *
 * @example
 * ```tsx
 * const listeners = useMapListeners(map, {
 *   click: (e) => console.log('Click', e),
 *   mousemove: (e) => console.log('Move', e)
 * })
 * ```
 */
export function useMapListeners<T extends Record<string, (event: any) => void>>(
  mapInstance: google.maps.Map | google.maps.Polygon | google.maps.Marker | null,
  handlers: T,
  deps: React.DependencyList = []
) {
  const listenersRef = useRef<google.maps.MapsEventListener[]>([])

  useEffect(() => {
    // Clean up all previous listeners
    listenersRef.current.forEach(listener => {
      google.maps.event.removeListener(listener)
    })
    listenersRef.current = []

    // Add new listeners if map instance exists
    if (mapInstance) {
      Object.entries(handlers).forEach(([eventName, handler]) => {
        const listener = google.maps.event.addListener(
          mapInstance,
          eventName,
          handler
        )
        listenersRef.current.push(listener)
      })
    }

    // Cleanup on unmount
    return () => {
      listenersRef.current.forEach(listener => {
        google.maps.event.removeListener(listener)
      })
      listenersRef.current = []
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, ...deps])
}
