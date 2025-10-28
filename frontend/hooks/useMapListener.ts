import { useEffect, useRef, useCallback } from 'react'

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
      handler: (event: unknown) => void
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

export function useSingleMapListener<E extends string>(
  mapInstance: google.maps.Map | google.maps.Polygon | google.maps.Marker | null,
  eventName: E,
  handler: (event: unknown) => void,
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
export function useMapListeners<T extends Record<string, (event: unknown) => void>>(
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
  }, [mapInstance, ...deps])
}
