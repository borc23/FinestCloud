export class CaptureService {
    constructor(mapService, imageUploadService) {
        this.mapService = mapService;
        this.imageUploadService = imageUploadService;
        this.captureSquare = document.getElementById('captureSquare');
        this.isSquareVisible = false;
    }

    toggle() {
        this.isSquareVisible = !this.isSquareVisible;
        this.captureSquare.style.display = this.isSquareVisible ? 'block' : 'none';
        
        if (this.isSquareVisible) {
            // Set a high z-index to ensure visibility
            this.captureSquare.style.zIndex = '999';
            this.updateSquarePosition();
        }
        
        this.updateButtonText();
    }

    updateButtonText() {
        const button = document.querySelector('button[onclick="handleDetection()"] span');
        if (button && !this.imageUploadService.isImageView) {
            button.textContent = this.isSquareVisible ? 'Detect' : 'Select Area';
        }
    }

    updateSquarePosition() {
        const mapContainer = document.getElementById('map');
        const containerRect = mapContainer.getBoundingClientRect();
        
        // Position the square in the center
        this.captureSquare.style.left = `${(containerRect.width - 640) / 2}px`;
        this.captureSquare.style.top = `${(containerRect.height - 640) / 2}px`;
        
        // Ensure the positioning is correct by setting position to absolute if not already set
        this.captureSquare.style.position = 'absolute';
        
        // Make sure it's visible with proper styling
        this.captureSquare.style.border = '2px dashed rgba(255, 0, 0, 0.8)';
        this.captureSquare.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
    }

    getBounds() {
        if (!this.isSquareVisible || !this.mapService.getMap()) return null;
        
        const overlay = new google.maps.OverlayView();
        overlay.draw = function() {};
        overlay.setMap(this.mapService.getMap());
        
        const mapContainer = document.getElementById('map');
        const containerRect = mapContainer.getBoundingClientRect();
        const squareRect = this.captureSquare.getBoundingClientRect();
        
        const projection = overlay.getProjection();
        if (!projection) return null;
        
        const topLeft = new google.maps.Point(
            squareRect.left - containerRect.left,
            squareRect.top - containerRect.top
        );
        const bottomRight = new google.maps.Point(
            squareRect.right - containerRect.left,
            squareRect.bottom - containerRect.top
        );
        
        const topLeftLatLng = projection.fromContainerPixelToLatLng(topLeft);
        const bottomRightLatLng = projection.fromContainerPixelToLatLng(bottomRight);
        
        return {
            north: topLeftLatLng.lat(),
            south: bottomRightLatLng.lat(),
            east: bottomRightLatLng.lng(),
            west: topLeftLatLng.lng()
        };
    }

    isVisible() {
        return this.isSquareVisible;
    }
}
