export class UIManager {
  #uploadButton = null;
  #detectButton = null;
  #cachedElements = {};

  constructor() {
    // Cache commonly accessed elements
    this.#initializeCache();
  }

  #initializeCache() {
    this.#detectButton = document.querySelector('button[onclick="handleDetection()"]');
    this.#cachedElements = {
      body: document.body,
      loadingOverlay: null // Will be created on demand
    };
  }

  init(uploadClickHandler) {
    const uploadButton = document.querySelector('button[onclick="uploadImage()"]');
    if (uploadButton) {
      uploadButton.onclick = (e) => {
        e.preventDefault();
        uploadClickHandler();
      };
      this.#uploadButton = uploadButton;
    }
  }

  updateButtonState(isImageView) {
    if (!this.#uploadButton) return;

    const icon = this.#uploadButton.querySelector('i');
    const span = this.#uploadButton.querySelector('span');

    if (isImageView) {
      icon.className = 'fas fa-map';
      span.textContent = 'Map';
    } else {
      icon.className = 'fas fa-upload';
      span.textContent = 'Upload';
    }
    
    this.updateDetectionButton(isImageView);
  }

  updateDetectionButton(isImageView) {
    if (!this.#detectButton) return;

    const span = this.#detectButton.querySelector('span');
    const icon = this.#detectButton.querySelector('i');
    
    if (isImageView) {
      icon.className = 'fas fa-search';
      span.textContent = 'Detect';
    } else {
      icon.className = 'fas fa-home';
      span.textContent = 'Select Area';
    }
  }

  showLoading() {
    if (!this.#cachedElements.loadingOverlay) {
      const loadingDiv = document.createElement('div');
      loadingDiv.innerHTML = 'Processing...';
      loadingDiv.className = 'loading-overlay';
      this.#cachedElements.loadingOverlay = loadingDiv;
    }
    this.#cachedElements.body.appendChild(this.#cachedElements.loadingOverlay);
    return this.#cachedElements.loadingOverlay;
  }

  hideLoading(loadingDiv) {
    if (loadingDiv && this.#cachedElements.body.contains(loadingDiv)) {
      this.#cachedElements.body.removeChild(loadingDiv);
      // Clear the cache when removed
      if (loadingDiv === this.#cachedElements.loadingOverlay) {
        this.#cachedElements.loadingOverlay = null;
      }
    }
  }
}
