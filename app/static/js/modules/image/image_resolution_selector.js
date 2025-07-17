import { ResolutionPopupManager } from './resolution/ResolutionPopupManager.js';
import { MapInteractionManager } from './resolution/MapInteractionManager.js';
import { PolygonInteractionManager } from './resolution/PolygonInteractionManager.js';

export class ImageResolutionSelector {
  #mapService;
  #mapInteractionManager;
  #popupManager;
  #polygonManager;
  #points = [];
  #clickPromiseResolve = null;
  
  constructor(mapService) {
    this.#mapService = mapService;
  }
  
  getResolution() {
    return new Promise((resolve) => {
      try {
        const map = this.#getMapInstance();
        if (!map) {
          throw new Error('Could not obtain valid map instance');
        }
        
        this.#clickPromiseResolve = resolve;
        this.#initializeManagers(map);
        this.#polygonManager.disablePolygonClicks();
        this.#popupManager.createPopup();
        this.#mapInteractionManager.setupClickListener(this.#handleMapClick.bind(this));
        
      } catch (error) {
        console.error('Error in getResolution:', error);
        this.#showError('An error occurred while initializing the resolution calculator.');
        this.#cleanup();
        resolve(null);
      }
    });
  }

  getVisibleEdgePixels() {
    try {
      const map = this.#getMapInstance();
      if (!map) {
        return null;
      }
      
      const mapDiv = map.getDiv();
      const width = mapDiv.offsetWidth;
      const height = mapDiv.offsetHeight;
      
      return {
        top: 0,
        bottom: height,
        left: 0,
        right: width,
        width: width,
        height: height
      };
    } catch (error) {
      console.error('Error getting visible edge pixels:', error);
      return null;
    }
  }
  
  #getMapInstance() {
    const map = window.imageMapInstance || 
                window.imageUploadService?.getImageMap() || 
                this.#mapService.getMap();
    
    console.log('Using map instance:', map);
    return map;
  }
  
  #initializeManagers(map) {
    this.#mapInteractionManager = new MapInteractionManager(map);
    this.#popupManager = new ResolutionPopupManager({
      calculateCallback: this.#calculateResolution.bind(this),
      cancelCallback: this.#handleCancel.bind(this),
      resetCallback: this.#resetPoints.bind(this)
    });
    this.#polygonManager = new PolygonInteractionManager(map);
  }
  
  #handleMapClick(point) {
    if (this.#points.length >= 2) return;
    
    this.#points.push(point);
    this.#mapInteractionManager.addMarker(point.latLng);
    
    const pointIndex = this.#points.length;
    this.#popupManager.updatePointStatus(pointIndex, point);
    
    if (this.#points.length === 2) {
      this.#mapInteractionManager.drawLine(this.#points[0], this.#points[1]);
      this.#popupManager.showDistanceForm();
    }
  }
  
  #calculateResolution() {
    const { distance, unit } = this.#popupManager.getDistanceValues();
    
    if (isNaN(distance) || distance <= 0) {
      this.#showError('Please enter a valid distance');
      return;
    }
    
    const pixelDistance = this.#mapInteractionManager.calculatePixelDistance(this.#points);
    console.log('Pixel distance:', pixelDistance);
    
    const distanceCm = this.#convertToCm(distance, unit);
    console.log('Distance in cm:', distanceCm, 'cm');

    const cmPerPixel = distanceCm / pixelDistance;
    this.#cleanup();
    this.#clickPromiseResolve(cmPerPixel);
  }
  
  #convertToCm(distance, unit) {
    console.log('Converting from user units to cm:', distance, unit, 'to cm');
    switch(unit) {
      case 'cm': return distance;
      case 'm': return distance * 100;
      case 'ft': return distance * 30.48;
      case 'in': return distance * 2.54;
      default: return distance;
    }
  }
  
  #resetPoints() {
    this.#points = [];
    this.#mapInteractionManager.clearMarkers();
    this.#mapInteractionManager.clearLines();
    this.#popupManager.resetPointsDisplay();
    this.#popupManager.hideDistanceForm();
  }
  
  #handleCancel() {
    this.#cleanup();
    this.#clickPromiseResolve(null);
  }
  
  #showError(message) {
    alert(message);
  }
  
  #cleanup() {
    try {
      if (this.#mapInteractionManager) {
        this.#mapInteractionManager.cleanup();
      }
      
      if (this.#polygonManager) {
        this.#polygonManager.restorePolygonClicks();
      }
      
      if (this.#popupManager) {
        this.#popupManager.removePopup();
      }
      
      this.#points = [];
    } catch (error) {
      console.error('Error during cleanup:', error);
    }
  }
}
