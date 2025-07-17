export class MapService {
    constructor() {
        this.map = null;
        this.activeMap = null;
        this.mapOptions = {
            center: { lat: 51.5074, lng: -0.1278 },
            zoom: 20,
            maxZoom: 22,
            tilt: 0,
            mapTypeId: google.maps.MapTypeId.SATELLITE,
            disableDoubleClickZoom: true,
            mapTypeControl: false,
            fullscreenControl: true,
            streetViewControl: true,
            rotateControl: false,
            zoomControl: true,
            draggable: true,
            scrollwheel: true,
            gestureHandling: 'auto'
        };
    }

    init() {
        this.map = new google.maps.Map(
            document.getElementById('map'), 
            this.mapOptions
        );
        this.activeMap = this.map;
    }

    setMapType(type) {
        this.map.setMapTypeId(type);
    }

    getMap() {
        return this.map;
    }

    setCenter(position, zoom = null) {
        this.map.setCenter(position);
        if (zoom) {
            this.map.setZoom(zoom);
            console.log(`MapService.setCenter: Requested zoom ${zoom}. Actual zoom: ${this.map.getZoom()}`);
        }
    }

    getCenter() {
        return this.map.getCenter();
    }

    getZoom() {
        return this.map.getZoom();
    }

    createMapInstance(element, customOptions = {}) {
        const options = { ...this.mapOptions, ...customOptions };
        return new google.maps.Map(element, options);
    }

    setActiveMap(map) {
        this.activeMap = map;
    }

    getActiveMap() {
        return this.activeMap || this.map;
    }
    
    _isCurrentMapImage() {
        return this.activeMap !== this.map && this.activeMap !== null;
    }
}
