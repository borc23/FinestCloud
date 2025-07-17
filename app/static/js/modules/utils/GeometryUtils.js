/**
 * Utility class for geometric calculations and conversions
 */
export class GeometryUtils {
    /**
     * Checks if two points are close to each other in pixel space
     * @param {google.maps.Map} map The map instance for projection
     * @param {google.maps.LatLng} point1 The first point
     * @param {google.maps.LatLng} point2 The second point
     * @param {number} maxPixelDistance The maximum pixel distance to consider "close"
     * @returns {boolean} Whether the points are close enough
     */
    static isCloseToPoint(map, point1, point2, maxPixelDistance = 10) {
        try {
            const projection = map.getProjection();
            if (!projection) return false;
            
            const p1 = projection.fromLatLngToPoint(point1);
            const p2 = projection.fromLatLngToPoint(point2);
            
            // Calculate pixel distance based on current zoom level
            const zoom = Math.pow(2, map.getZoom());
            const dx = (p1.x - p2.x) * zoom;
            const dy = (p1.y - p2.y) * zoom;
            const pixelDistance = Math.sqrt(dx * dx + dy * dy);
            
            return pixelDistance <= maxPixelDistance;
        } catch (error) {
            console.error('Error calculating point distance:', error);
            return false;
        }
    }
    
    /**
     * Calculates the distance between two points in meters
     * @param {google.maps.LatLng} point1 The first point
     * @param {google.maps.LatLng} point2 The second point
     * @returns {number} The distance in meters
     */
    static calculateHaversineDistance(point1, point2) {
        const R = 6371000; // Earth's radius in meters
        const lat1 = point1.lat() * Math.PI / 180;
        const lat2 = point2.lat() * Math.PI / 180;
        const dLat = lat2 - lat1;
        const dLng = (point2.lng() - point1.lng()) * Math.PI / 180;
        
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(lat1) * Math.cos(lat2) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        
        return R * c;
    }
    
    /**
     * Calculates the area of a polygon in square meters
     * @param {Array<google.maps.LatLng>} path The polygon path
     * @returns {number} The area in square meters
     */
    static calculatePolygonArea(path) {
        const earthRadius = 6378137; // in meters
        
        if (path.length < 3) {
            return 0;
        }
        
        let total = 0;
        
        for (let i = 0; i < path.length; i++) {
            const j = (i + 1) % path.length;
            
            const xi = path[i].lng() * Math.PI / 180;
            const yi = path[i].lat() * Math.PI / 180;
            const xj = path[j].lng() * Math.PI / 180;
            const yj = path[j].lat() * Math.PI / 180;
            
            total += (xj - xi) * (2 + Math.sin(yi) + Math.sin(yj));
        }
        
        total = total * earthRadius * earthRadius / 2;
        
        return Math.abs(total);
    }
}
