export class MapInteractionManager {
  #map;
  #markers = [];
  #lines = [];
  #clickListeners = [];
  
  constructor(map) {
    this.#map = map;
  }
  
  setupClickListener(callback) {
    this.clearListeners();
    
    if (!this.#map) {
      console.error('Map instance is not available for click listener');
      throw new Error('Invalid map instance');
    }
    
    const clickListener = this.#map.addListener('click', (e) => {
      console.log('Map click detected at:', e.latLng.lat(), e.latLng.lng());
      
      const mapDiv = this.#map.getDiv();
      const rect = mapDiv.getBoundingClientRect();
      
      let pixelX, pixelY;
      
      if (e.pixel) {
        pixelX = e.pixel.x;
        pixelY = e.pixel.y;
      } else if (e.domEvent) {
        pixelX = e.domEvent.clientX - rect.left;
        pixelY = e.domEvent.clientY - rect.top;
      } else {
        const pixelPoint = this.#latLngToPoint(e.latLng);
        pixelX = pixelPoint.x;
        pixelY = pixelPoint.y;
      }
      
      const point = {
        latLng: e.latLng,
        lat: e.latLng.lat(),
        lng: e.latLng.lng(),
        pixel: { x: pixelX, y: pixelY }
      };
      
      callback(point);
    });
    
    this.#clickListeners.push(clickListener);
    console.log('Click listener set up successfully');
  }
  
  addMarker(position) {
    const marker = new google.maps.Marker({
      position: position,
      map: this.#map,
      icon: {
        path: google.maps.SymbolPath.CIRCLE,
        fillColor: '#4285F4',
        fillOpacity: 1,
        strokeColor: '#ffffff',
        strokeWeight: 2,
        scale: 8
      }
    });
    
    this.#markers.push(marker);
    return marker;
  }
  
  drawLine(point1, point2) {
    const line = new google.maps.Polyline({
      path: [
        { lat: point1.lat, lng: point1.lng },
        { lat: point2.lat, lng: point2.lng }
      ],
      geodesic: true,
      strokeColor: '#4285F4',
      strokeOpacity: 1.0,
      strokeWeight: 3,
      map: this.#map
    });
    
    this.#lines.push(line);
    return line;
  }
  
  #latLngToPoint(latLng) {
    try {
      const overlay = new google.maps.OverlayView();
      overlay.draw = function() {};
      overlay.setMap(this.#map);
      
      if (overlay.getProjection && overlay.getProjection()) {
        const projection = overlay.getProjection();
        const pixel = projection.fromLatLngToContainerPixel(latLng);
        return { x: pixel.x, y: pixel.y };
      }
      
      const projection = this.#map.getProjection();
      if (projection) {
        const scale = Math.pow(2, this.#map.getZoom());
        const bounds = this.#map.getBounds();
        const nw = projection.fromLatLngToPoint(
          new google.maps.LatLng(bounds.getNorthEast().lat(), bounds.getSouthWest().lng())
        );
        const worldPoint = projection.fromLatLngToPoint(latLng);
        
        const pixelX = Math.floor((worldPoint.x - nw.x) * scale);
        const pixelY = Math.floor((worldPoint.y - nw.y) * scale);
        
        return { x: pixelX, y: pixelY };
      }
      
      const mapDiv = this.#map.getDiv();
      console.warn('Could not get projection, using placeholder coordinates');
      return { 
        x: mapDiv.offsetWidth / 2, 
        y: mapDiv.offsetHeight / 2 
      };
    } catch (error) {
      console.error('Error converting LatLng to Point:', error);
      return { x: 0, y: 0 };
    }
  }
  
  calculatePixelDistance(points) {
    if (!points || points.length !== 2) return 0;
    
    const p1 = points[0].pixel;
    const p2 = points[1].pixel;
    console.log('Pixel points for distance calculation:', p1, p2);
  
    if (!p1 || !p2 || typeof p1.x !== 'number' || typeof p2.x !== 'number') {
      console.warn('Invalid pixel values, using geo coordinates as fallback');
      return Math.sqrt(
        Math.pow(points[1].lng - points[0].lng, 2) * 100000 + 
        Math.pow(points[1].lat - points[0].lat, 2) * 100000
      );
    }
    
    return Math.sqrt(
      Math.pow(p2.x - p1.x, 2) + 
      Math.pow(p2.y - p1.y, 2)
    );
  }
  
  clearMarkers() {
    this.#markers.forEach(marker => marker.setMap(null));
    this.#markers = [];
  }
  
  clearLines() {
    this.#lines.forEach(line => line.setMap(null));
    this.#lines = [];
  }
  
  clearListeners() {
    this.#clickListeners.forEach(listener => 
      google.maps.event.removeListener(listener)
    );
    this.#clickListeners = [];
  }
  
  cleanup() {
    this.clearMarkers();
    this.clearLines();
    this.clearListeners();
  }
}
