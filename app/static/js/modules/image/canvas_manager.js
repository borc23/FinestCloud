export class CanvasManager {
  #canvas = null;
  #currentMasks = null;
  #currentPolygonsRoof = [];
  #currentPolygonsObjects = [];
  #mapService = null;
  #styleConfig = null;
  
  constructor() {
    // Import StyleConfig if it hasn't been imported
    this.#styleConfig = window.StyleConfig;
    
    if (!this.#styleConfig) {
      // Dynamic import if StyleConfig is not available globally
      import('../edit/StyleConfig.js').then(module => {
        this.#styleConfig = module.StyleConfig;
      }).catch(err => {
        console.error('Error loading StyleConfig:', err);
      });
    }
  }
  
  setupCanvas(image, container) {
    this.#canvas = document.createElement('canvas');
    this.#canvas.className = 'mask-canvas';
    this.#canvas.style.zIndex = '3';
    container.appendChild(this.#canvas);
    
    this.resizeCanvas(image);
  }
  
  resizeCanvas(image) {
    if (!this.#canvas || !image) return;

    const rect = image.getBoundingClientRect();
    this.#canvas.style.position = 'absolute';
    this.#canvas.style.left = `${image.offsetLeft}px`;
    this.#canvas.style.top = `${image.offsetTop}px`;
    this.#canvas.width = rect.width;
    this.#canvas.height = rect.height;

    if (this.#currentMasks) {
      this.drawMasks(this.#currentMasks);
    }
  }
  
  clearCanvas() {
    if (!this.#canvas) return;
    
    const ctx = this.#canvas.getContext('2d');
    ctx.clearRect(0, 0, this.#canvas.width, this.#canvas.height);
    this.#currentMasks = null;
    
    this.clearCurrentPolygons();
  }
  
  clearCurrentPolygons() {
    if (this.#currentPolygonsRoof) {
      this.#currentPolygonsRoof.forEach(polygon => polygon.setMap(null));
      this.#currentPolygonsRoof = [];
    }
    
    if (this.#currentPolygonsObjects) {
      this.#currentPolygonsObjects.forEach(polygon => polygon.setMap(null));
      this.#currentPolygonsObjects = [];
    }
  }
  
  drawMasks(data) {
    if (!this.#canvas) return;
    
    this.#currentMasks = data;
    this.clearCurrentPolygons();
    
    if (data.roofs) {
      this.renderPolygons(data.roofs, true);  // isRoof = true
    } else if (Array.isArray(data)) {
      this.renderPolygons(data, true);  // isRoof = true
    }
    
    if (data.objects) {
      this.renderPolygons(data.objects, false);  // isRoof = false
    }
  }
  
  renderPolygons(polygonData, isRoof) {
    if (!polygonData) return;
    
    const flatPolygons = Array.isArray(polygonData) ? 
      polygonData.flat().filter(poly => poly && poly.coords) : 
      [polygonData].filter(poly => poly && poly.coords);
    
    const imageMap = document.getElementById('imageMapContainer');
    if (!imageMap) return;
    
    const mapInstance = this.getImageMap();
    if (!mapInstance) return;
    
    const detectionService = window.detectionService;
    const editService = window.editService;
    const polygonArray = isRoof ? this.#currentPolygonsRoof : this.#currentPolygonsObjects;
    
    // Get styling options from StyleConfig if available
    let options;
    if (this.#styleConfig) {
      options = this.#styleConfig.getOptionsForType(isRoof);
    } else {
      // Fallback options if StyleConfig isn't available
      const color = isRoof ? '#27ae60' : '#e74c3c';
      options = {
        strokeColor: color,
        strokeOpacity: 0.8,
        strokeWeight: 2,
        fillColor: color,
        fillOpacity: 0.2,
        zIndex: isRoof ? 900 : 1000
      };
    }
    
    flatPolygons.forEach(data => {
      const polygon = new google.maps.Polygon({
        paths: data.coords,
        ...options,
        map: mapInstance,
        editable: false,
        draggable: false,
        clickable: true
      });
      
      polygonArray.push(polygon);
      
      if (detectionService) {
        const targetCollection = isRoof ? 
          detectionService.currentPolygonsRoof : 
          detectionService.currentPolygonsObjects;
        
        if (!targetCollection) {
          if (isRoof) {
            detectionService.currentPolygonsRoof = [];
          } else {
            detectionService.currentPolygonsObjects = [];
          }
        }
        
        if (isRoof) {
          detectionService.currentPolygonsRoof.push(polygon);
        } else {
          detectionService.currentPolygonsObjects.push(polygon);
        }
      }
      
      if (editService && editService.polygonManager) {
        editService.polygonManager.addPolygonListeners(polygon);
      }
    });
    
    if (detectionService && detectionService.updateGeneratePanelsVisibility) {
      detectionService.updateGeneratePanelsVisibility();
    }
  }
  
  getImageMap() {
    if (window.imageMapInstance) {
      return window.imageMapInstance;
    }
    
    const maps = Array.from(document.querySelectorAll('.gm-style'))
      .map(el => {
        let parent = el.parentElement;
        while (parent && !parent.id) {
          parent = parent.parentElement;
        }
        return {element: el, parent: parent};
      })
      .filter(item => item.parent && item.parent.id === 'imageMapContainer');
      
    if (maps.length > 0) {
      for (const map of google.maps.Map.instances || []) {
        if (map.getDiv() === maps[0].element.parentElement) {
          return map;
        }
      }
    }
    
    return null;
  }
  
  setMapService(mapService) {
    this.#mapService = mapService;
  }
}
