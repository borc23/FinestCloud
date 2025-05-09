export class ImageMapService {
  #imageMap = null;
  #mapService = null;
  
  enforceLockdown() {
    if (this.#imageMap) {
        this.#imageMap.setOptions({
            draggable: false,
            scrollwheel: false,
            gestureHandling: 'none',
            disableDoubleClickZoom: true,
            keyboardShortcuts: false,
            clickableIcons: false,
            zoomControl: false,
            panControl: false,
            mapTypeControl: false,
            streetViewControl: false,
            fullscreenControl: false
        });
    }
  }

  setMapService(mapService) {
    this.#mapService = mapService;
  }
  
  initializeMap(image, container) {
    if (!this.#mapService || !image) return;
    
    const imageMapContainer = document.getElementById('imageMapContainer');
    if (!imageMapContainer) return;
    
    const rect = image.getBoundingClientRect();
    
    imageMapContainer.style.width = `${rect.width}px`;
    imageMapContainer.style.height = `${rect.height}px`;
    imageMapContainer.style.left = `${image.offsetLeft}px`;
    imageMapContainer.style.top = `${image.offsetTop}px`;
    imageMapContainer.style.backgroundColor = 'transparent';
    
    this.#imageMap = this.#mapService.createMapInstance(imageMapContainer, {
      disableDefaultUI: true,
      styles: [
        {
          featureType: "all",
          elementType: "all",
          stylers: [
            { visibility: "off" },
            { opacity: 0 }
          ]
        }
      ],
      backgroundColor: 'transparent',
      mapTypeId: google.maps.MapTypeId.ROADMAP,
      draggable: false,
      scrollwheel: false,
      gestureHandling: 'none',
      disableDoubleClickZoom: true,
      clickableIcons: false,
      keyboardShortcuts: false
    });
    
    this.#imageMap.setOptions({
      streetViewControl: false,
      fullscreenControl: false,
      mapTypeControl: false,
      zoomControl: false
    });
    
    // Always enforce lockdown immediately after creating the map
    this.enforceLockdown();
    
    imageMapContainer.addEventListener('contextmenu', (e) => {
      if (window.editService?.stateManager?.getState()?.isEditMode) {
        e.preventDefault();
        return false;
      }
    });
    
    window.imageMapInstance = this.#imageMap;
    
    const originalSetCenter = this.#imageMap.setCenter;
    this.#imageMap.setCenter = function(latLng) {
      if (window._allowMapCenterChange) {
        originalSetCenter.call(this, latLng);
      }
    };
    
    window._allowMapCenterChange = true;
    setTimeout(() => {
      google.maps.event.trigger(this.#imageMap, 'resize');
      
      const bounds = new google.maps.LatLngBounds(
        new google.maps.LatLng(0, 0),
        new google.maps.LatLng(1, 1)
      );
      this.#imageMap.fitBounds(bounds);
      this.#imageMap.setZoom(22);
      
      window._allowMapCenterChange = false;
      
      // Re-enforce lockdown after resize
      this.enforceLockdown();
    }, 100);
    
    if (this.#mapService.setActiveMap) {
      this.#mapService.setActiveMap(this.#imageMap);
    }
  }
  
  resizeImageMap(image) {
    if (!this.#imageMap || !image) return;
    
    const container = document.getElementById('imageMapContainer');
    if (!container) return;
    
    const rect = image.getBoundingClientRect();
    container.style.width = `${rect.width}px`;
    container.style.height = `${rect.height}px`;
    container.style.left = `${image.offsetLeft}px`;
    container.style.top = `${image.offsetTop}px`;
    
    google.maps.event.trigger(this.#imageMap, 'resize');
    
    // Always enforce lockdown after resize
    this.enforceLockdown();
  }
  
  getBounds() {
    if (!this.#imageMap) return null;
    
    const bounds = this.#imageMap.getBounds();
    if (!bounds) return null;
    
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    
    return {
      north: ne.lat(),
      east: ne.lng(),
      south: sw.lat(),
      west: sw.lng()
    };
  }
  
  getImageMap() {
    return this.#imageMap;
  }
}
