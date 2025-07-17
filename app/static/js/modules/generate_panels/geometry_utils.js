export class GeometryUtils {
    constructor() {}
    
    isPointInPolygon(point, polygon, padding = 0.0000075) {
      if (!point || !polygon?.length) return false;
      
      if (padding > 0) {
        const testPoints = [
          { lat: point.lat, lng: point.lng },
          { lat: point.lat + padding, lng: point.lng },
          { lat: point.lat - padding, lng: point.lng },
          { lat: point.lat, lng: point.lng + padding },
          { lat: point.lat, lng: point.lng - padding },
          { lat: point.lat + padding, lng: point.lng + padding },
          { lat: point.lat + padding, lng: point.lng - padding },
          { lat: point.lat - padding, lng: point.lng + padding },
          { lat: point.lat - padding, lng: point.lng - padding }
        ];
        
        return testPoints.some(testPoint => this.pointInPolygonRayCasting(testPoint, polygon));
      }
      
      return this.pointInPolygonRayCasting(point, polygon);
    }
    
    pointInPolygonRayCasting(point, polygon) {
      let inside = false;
      
      for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lng, yi = polygon[i].lat;
        const xj = polygon[j].lng, yj = polygon[j].lat;
        
        if (typeof xi !== 'number' || typeof yi !== 'number' || 
            typeof xj !== 'number' || typeof yj !== 'number' ||
            typeof point.lat !== 'number' || typeof point.lng !== 'number') {
          continue;
        }
        
        const intersect = ((yi > point.lat) !== (yj > point.lat))
            && (point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi);
        
        if (intersect) inside = !inside;
      }
      
      return inside;
    }
    
    getMapBounds(map) {
      const bounds = map.getBounds();
      
      if (!bounds) return null;
      
      const center = bounds.getCenter();
      return {
        north: bounds.getNorthEast().lat(),
        east: bounds.getNorthEast().lng(),
        south: bounds.getSouthWest().lat(),
        west: bounds.getSouthWest().lng(),
        center: {
          lat: center.lat(),
          lng: center.lng()
        }
      };
    }
  
    getMapDimensions(map) {
      const mapDiv = map.getDiv();
      return {
        width: mapDiv.offsetWidth,
        height: mapDiv.offsetHeight
      };
    }

    getMapBoundsImage(map) {
      const mapDiv = map.getDiv();
      const width = mapDiv.offsetWidth;
      const height = mapDiv.offsetHeight;
      
      // For images, we're working with normalized coordinates
      // where center is around (0.5, 0.5)
      return {
        north: 0.4999041110277158,
        east: 1,
        south: 1,
        west: 0.49997746701949985,
        center: {
          lat: 0.5,
          lng: 0.5
        },
        pixelWidth: width,
        pixelHeight: height
      };
    }
  
    calculateCmPerPixel(map) {
      const mapDiv = map.getDiv();
      const offsetWidthPx = mapDiv.offsetWidth;
      const bounds = map.getBounds();
      
      const ne = bounds.getNorthEast();
      const sw = bounds.getSouthWest();
      
      const distanceInMeters = google.maps.geometry.spherical.computeDistanceBetween(
        new google.maps.LatLng(ne.lat(), sw.lng()),
        new google.maps.LatLng(ne.lat(), ne.lng())
      );
      
      return (distanceInMeters * 100) / offsetWidthPx;
    }
  }
  