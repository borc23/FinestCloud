import { useEffect, useState } from "react";

interface UseMapInitializationOptions {
  onMapReady?: (map: google.maps.Map) => void;
  defaultCenter?: { lat: number; lng: number };
}

/**
 * Hook to handle Google Maps initialization with proper error handling and timeouts
 *
 * Features:
 * - Waits for Google Maps API to load
 * - Configures map with optimal settings
 * - Automatic cleanup
 * - 10 second timeout for initialization
 */
const isMapsApiLoaded = () =>
  typeof google !== "undefined" && !!google.maps?.Map;

export function useMapInitialization(
  mapRef: React.RefObject<HTMLDivElement>,
  options: UseMapInitializationOptions = {},
) {
  const { onMapReady, defaultCenter } = options;
  const [map, setMap] = useState<google.maps.Map | null>(null);

  useEffect(() => {
    let checkInterval: NodeJS.Timeout | null = null;
    let timeoutId: NodeJS.Timeout | null = null;

    const initializeMap = () => {
      if (mapRef.current && isMapsApiLoaded()) {
        // Use user's default location or fall back to San Francisco
        const center = defaultCenter || { lat: 37.7749, lng: -122.4194 };

        const mapOptions: google.maps.MapOptions = {
          center,
          zoom: 20,
          tilt: 0,
          mapTypeId: "satellite",
          rotateControl: false,
          tiltInteractionEnabled: false,
          disableDefaultUI: true,
          zoomControl: false,
          streetViewControl: false,
          fullscreenControl: false,
          gestureHandling: "greedy",
          styles: [
            {
              featureType: "poi",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
            {
              featureType: "road",
              elementType: "labels",
              stylers: [{ visibility: "off" }],
            },
          ],
        };

        const googleMap = new google.maps.Map(mapRef.current, mapOptions);
        setMap(googleMap);
        onMapReady?.(googleMap);
      }
    };

    // Try immediate initialization if API is already loaded
    if (isMapsApiLoaded()) {
      initializeMap();
    } else {
      // Poll for API availability
      checkInterval = setInterval(() => {
        if (isMapsApiLoaded()) {
          if (checkInterval) clearInterval(checkInterval);
          if (timeoutId) clearTimeout(timeoutId);
          initializeMap();
        }
      }, 100);

      // Timeout after 10 seconds
      timeoutId = setTimeout(() => {
        if (checkInterval) clearInterval(checkInterval);
        console.error("Google Maps API failed to load within 10 seconds");
      }, 10000);
    }

    return () => {
      if (checkInterval) clearInterval(checkInterval);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [mapRef, onMapReady, defaultCenter]);

  return map;
}
