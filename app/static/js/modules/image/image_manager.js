import { ImageDisplay } from './image_display.js';
import { CanvasManager } from './canvas_manager.js';
import { ImageMapService } from './image_map_service.js';
import { DetectionClient } from './detection_client.js';
import { UIManager } from './ui_manager.js';

export class ImageManager {
  #display;
  #canvas;
  #mapService;
  #detectionClient;
  #uiManager;
  #editService = null;
  #mapServiceInstance = null;
  
  constructor() {
    this.#display = new ImageDisplay();
    this.#canvas = new CanvasManager();
    this.#mapService = new ImageMapService();
    this.#detectionClient = new DetectionClient();
    this.#uiManager = new UIManager();
  }
  
  init(mapService) {
    this.#mapServiceInstance = mapService;
    this.#mapService.setMapService(mapService);
    this.#display.init(this.#canvas, this.#mapService);
    this.#canvas.setMapService(this.#mapService);
    this.#uiManager.init(this.handleUploadClick.bind(this));
    
    this.#display.onImageLoaded = (image, container) => {
      this.#canvas.setupCanvas(image, container);
      this.#mapService.initializeMap(image, container);
    };
    
    this.#display.onViewToggled = (showImage) => {
      this.#uiManager.updateButtonState(showImage);
      this.#canvas.clearCanvas();
      
      // Call clearAll when toggling view
      if (window.clearAll) {
        window.clearAll();
      }

      if (this.#mapServiceInstance.setActiveMap) {
        if (showImage && this.#mapService.getImageMap()) {
          this.#mapServiceInstance.setActiveMap(this.#mapService.getImageMap());
          
          window.imageMapInstance = this.#mapService.getImageMap();
          
          if (this.#editService && this.#editService.stateManager) {
            const state = this.#editService.stateManager.getState();
            if (state && state.isEditMode) {
              setTimeout(() => {
                this.#editService.updateMapOptions(true); 
                this.#editService.polygonManager.updateMapClickHandler(true);
              }, 250);
            }
          }
        } else {
          this.#mapServiceInstance.setActiveMap(this.#mapServiceInstance.getMap());
          
          if (this.#editService && this.#editService.stateManager) {
            const state = this.#editService.stateManager.getState();
            if (state && state.isEditMode) {
              setTimeout(() => {
                this.#editService.updateMapOptions(true);
                this.#editService.polygonManager.updateMapClickHandler(true);
              }, 250);
            }
          }
        }
      }
      
      if (this.#editService && this.#editService.polygonManager) {
        const state = this.#editService.stateManager?.getState();
        if (state && state.isEditMode) {
          setTimeout(() => {
            this.#editService.polygonManager.refreshAllPolygons();
          }, 250);
        }
      }
    };
    
    window.imageUploadService = this;
  }
  
  handleUploadClick() {
    if (this.isImageView) {
      this.toggleView();
    } else {
      this.#display.promptForImageUpload(this.handleImageSelect.bind(this));
    }
  }
  
  handleImageSelect(file) {
    this.#display.loadImage(file);
  }
  
  async detectRoofs() {
    const image = this.#display.getCurrentImage();
    if (!image) return;
    
    const loadingDiv = this.#uiManager.showLoading();
    try {
      const base64Image = await this.#detectionClient.imageToBase64(image);
      const bounds = this.#mapService.getBounds();
      console.log('Detecting roofs with bounds:', bounds);
      const response = await this.#detectionClient.detectRoofs(base64Image, bounds);
      
      this.#canvas.drawMasks(response);
    } catch (error) {
      console.error('Detection error:', error);
      alert('Detection failed: ' + error.message);
    } finally {
      this.#uiManager.hideLoading(loadingDiv);
    }
  }
  
  toggleView(showImage = false) {
    this.#display.toggleView(showImage);
  }
  
  setEditService(editService) {
    this.#editService = editService;
    
    if (this.#canvas) {
      this.#canvas.setEditService?.(editService);
    }
    
    window.editService = editService;
  }
  
  enableEditModeImageInteraction(isEditMode) {
    this.#display.enableEditModeImageInteraction(isEditMode, this.#mapService);
  }
  
  get isImageView() {
    return this.#display.isImageView;
  }
  
  getActiveMap() {
    return this.isImageView && this.#mapService.getImageMap() 
      ? this.#mapService.getImageMap() 
      : this.#mapServiceInstance.getMap();
  }
  
  getImageMap() {
    return this.#mapService.getImageMap();
  }
}
