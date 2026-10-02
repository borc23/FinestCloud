import { useEffect, useRef } from "react";

export function useSingleMapListener<E extends string>(
  mapInstance:
    | google.maps.Map
    | google.maps.Polygon
    | google.maps.Marker
    | null,
  eventName: E,
  handler: (event: unknown) => void,
  deps: React.DependencyList = [],
) {
  const listenerRef = useRef<google.maps.MapsEventListener | null>(null);

  useEffect(() => {
    // Clean up previous listener
    if (listenerRef.current) {
      google.maps.event.removeListener(listenerRef.current);
      listenerRef.current = null;
    }

    // Add new listener if map instance exists
    if (mapInstance) {
      listenerRef.current = google.maps.event.addListener(
        mapInstance,
        eventName,
        handler,
      );
    }

    // Cleanup on unmount or when dependencies change
    return () => {
      if (listenerRef.current) {
        google.maps.event.removeListener(listenerRef.current);
        listenerRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapInstance, eventName, ...deps]);
}
