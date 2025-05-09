export class ImageDisplay {
  #currentImage = null;
  #imageContainer = null;
  #isImageView = false;
  #canvas = null;
  #mapService = null;
  #resizeObserver = null;
  
  // Event callbacks
  onImageLoaded = null;
  onViewToggled = null;
  
  init(canvas, mapService) {
    this.#canvas = canvas;
    this.#mapService = mapService;
  }
  
  promptForImageUpload(callback) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => callback(e.target.files[0]);
    input.click();
  }
  
  loadImage(file) {
    if (!file || !file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    const imageUrl = URL.createObjectURL(file);
    this.displayImage(imageUrl);
  }
  
  displayImage(imageUrl) {
    if (!this.#imageContainer) {
      this.#imageContainer = document.createElement('div');
      this.#imageContainer.id = 'imageContainer';
      this.#imageContainer.className = 'image-container';
      document.body.appendChild(this.#imageContainer);
    }

    this.#imageContainer.innerHTML = '';
    
    const imageMapContainer = document.createElement('div');
    imageMapContainer.id = 'imageMapContainer';
    imageMapContainer.className = 'image-map-container';
    imageMapContainer.style.position = 'absolute';
    imageMapContainer.style.zIndex = '5';
    imageMapContainer.style.pointerEvents = 'auto';
    this.#imageContainer.appendChild(imageMapContainer);
    
    const img = new Image();
    img.src = imageUrl;
    img.className = 'uploaded-image';
    img.style.position = 'relative';
    img.style.zIndex = '2';
    this.#imageContainer.appendChild(img);
    this.#currentImage = img;
    
    img.onload = () => {
      if (this.onImageLoaded) {
        this.onImageLoaded(img, this.#imageContainer);
      }
      
      if (!this.#resizeObserver) {
        this.#resizeObserver = new ResizeObserver(() => {
          this.#canvas.resizeCanvas(this.#currentImage);
          this.#mapService.resizeImageMap(this.#currentImage);
        });
        this.#resizeObserver.observe(this.#imageContainer);
      }
    };
    
    this.toggleView(true);
  }
  
  toggleView(showImage = false) {
    const mapContainer = document.querySelector('.map-container');
    this.#isImageView = showImage;
    
    if (this.#imageContainer) {
      this.#imageContainer.style.display = showImage ? 'block' : 'none';
    }
    if (mapContainer) {
      mapContainer.style.display = showImage ? 'none' : 'block';
    }
    
    if (this.onViewToggled) {
      this.onViewToggled(showImage);
    }
  }
  
  enableEditModeImageInteraction(isEditMode) {
    if (!this.#currentImage) return;
    
    if (isEditMode) {
      this.#currentImage.style.pointerEvents = 'none';
      
      const imageMapContainer = document.getElementById('imageMapContainer');
      if (imageMapContainer) {
        imageMapContainer.style.zIndex = '5';
        imageMapContainer.style.pointerEvents = 'auto';
        imageMapContainer.style.backgroundColor = 'transparent';
        
        if (this.#currentImage) {
          imageMapContainer.style.left = `${this.#currentImage.offsetLeft}px`;
          imageMapContainer.style.top = `${this.#currentImage.offsetTop}px`;
        }
        
        // Ensure map doesn't move when interacting with polygons
        const mapInstance = window.imageMapInstance;
        if (mapInstance) {
          mapInstance.setOptions({
            draggableCursor: 'default',
            draggingCursor: 'default',
            disableDoubleClickZoom: true,
            scrollwheel: false,
            gestureHandling: 'none'
          });
        }
        
        // Disable context menu on the image container in edit mode
        imageMapContainer.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          return false;
        });
      }
      
      // Ensure all detected polygons are updated for edit mode
      if (window.editService && window.editService.polygonManager && 
          window.detectionService) {
        window.editService.polygonManager.updateAllPolygons(true);
      }
      
      console.log('Image pointer events disabled for edit mode, map ready for interaction');
    } else {
      this.#currentImage.style.pointerEvents = 'auto';
      
      // Remove contextmenu event listener when exiting edit mode
      const imageMapContainer = document.getElementById('imageMapContainer');
      if (imageMapContainer) {
        const newImageMapContainer = imageMapContainer.cloneNode(true);
        imageMapContainer.parentNode.replaceChild(newImageMapContainer, imageMapContainer);
      }
      
      console.log('Image pointer events restored');
    }
  }
  
  getCurrentImage() {
    return this.#currentImage;
  }
  
  get isImageView() {
    return this.#isImageView;
  }
}
