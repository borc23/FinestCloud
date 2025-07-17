export class PolygonInteractionManager {
  #map;
  #originalPolygonSettings = [];
  
  constructor(map) {
    this.#map = map;
  }
  
  disablePolygonClicks() {
    this.#originalPolygonSettings = [];
    
    const detectionService = window.detectionService;
    if (!detectionService) return;
    
    this.#processPolygonCollection(detectionService.currentPolygonsRoof);
    this.#processPolygonCollection(detectionService.currentPolygonsObjects);
  }
  
  #processPolygonCollection(polygons) {
    if (!polygons || !polygons.length) return;
    
    polygons.forEach(polygon => {
      if (!polygon) return;
      
      const isClickable = polygon.getClickable !== undefined ? 
        polygon.getClickable() : 
        true;
      
      this.#originalPolygonSettings.push({
        polygon: polygon,
        clickable: isClickable
      });
      
      polygon.setOptions({ clickable: false });
    });
  }
  
  restorePolygonClicks() {
    this.#originalPolygonSettings.forEach(settings => {
      if (settings.polygon) {
        settings.polygon.setOptions({ clickable: settings.clickable });
      }
    });
    this.#originalPolygonSettings = [];
  }
}
