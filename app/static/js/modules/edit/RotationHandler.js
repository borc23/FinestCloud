/**
 * RotationHandler.js
 * Manages rotation functionality for panels
 */

export class RotationHandler {
    #rotationElements = {
        container: null,
        handle: null,
        line: null,
        center: null
    };
    
    constructor(dependencies) {
        const { 
            mapService,
            stateManager,
            polygonManager
        } = dependencies;
        
        this.mapService = mapService;
        this.stateManager = stateManager;
        this.polygonManager = polygonManager;
        
        // Create rotation handle elements
        this.#createRotationHandleElements();
        
        // Setup position tracking
        this.#setupPositionTracking();
    }
    
    #createRotationHandleElements() {
        // Create container if it doesn't exist
        if (!document.getElementById('rotationHandleContainer')) {
            // Create container
            const container = document.createElement('div');
            container.id = 'rotationHandleContainer';
            container.className = 'rotation-handle-container';
            container.style.display = 'none';
            
            // Create rotation center indicator
            const center = document.createElement('div');
            center.className = 'rotation-center';
            
            // Create rotation line
            const line = document.createElement('div');
            line.className = 'rotation-line';
            
            // Create rotation handle
            const handle = document.createElement('div');
            handle.className = 'rotation-handle';
            handle.innerHTML = '<i class="fas fa-sync-alt"></i>';
            
            // Add elements to container
            container.appendChild(center);
            container.appendChild(line);
            container.appendChild(handle);
            
            // Add container to body
            document.body.appendChild(container);
            
            // Store references
            this.#rotationElements = {
                container,
                handle,
                line,
                center
            };
            
            // Set up event listeners for rotation handle
            this.#setupRotationHandleEvents();
        } else {
            // Get existing elements
            this.#rotationElements = {
                container: document.getElementById('rotationHandleContainer'),
                handle: document.querySelector('#rotationHandleContainer .rotation-handle'),
                line: document.querySelector('#rotationHandleContainer .rotation-line'),
                center: document.querySelector('#rotationHandleContainer .rotation-center')
            };
        }
    }
    
    #setupRotationHandleEvents() {
        const { handle } = this.#rotationElements;
        if (!handle) return;
        
        // Variables to track rotation state
        let isDragging = false;
        let startAngle = 0;
        let currentAngle = 0;
        
        // Handle events
        handle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            handle.style.cursor = 'grabbing';
            
            // Get rotation center position
            const center = this.#getRotationCenter();
            if (!center) return;
            
            // Calculate starting angle
            startAngle = this.#calculateAngle(e.clientX, e.clientY, center.x, center.y);
            
            // Add document-level event listeners for move and up events
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            // Get rotation center
            const center = this.#getRotationCenter();
            if (!center) return;
            
            // Calculate current angle
            const angle = this.#calculateAngle(e.clientX, e.clientY, center.x, center.y);
            
            // Calculate angle difference
            const angleDifference = angle - startAngle;
            
            // Rotate the selected panels
            this.polygonManager.rotateSelectedPanels(angleDifference);
            
            // Update for next move
            startAngle = angle;
            currentAngle += angleDifference;
        };
        
        const handleMouseUp = () => {
            isDragging = false;
            handle.style.cursor = 'grab';
            
            // Remove temporary event listeners
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }
    
    #calculateAngle(x, y, centerX, centerY) {
        return Math.atan2(y - centerY, x - centerX) * 180 / Math.PI;
    }
    
    #getRotationCenter() {
        // Get all selected panels
        const state = this.stateManager.getState();
        const selectedPanels = Array.from(state.selectedPolygons).filter(p => p.isPanelElement);
        
        if (selectedPanels.length === 0) return null;
        
        // Get the map instance
        const map = this.mapService.getActiveMap();
        if (!map) return null;
        
        // Calculate the centroid of all vertices
        let totalLat = 0;
        let totalLng = 0;
        let totalVertices = 0;
        
        selectedPanels.forEach(panel => {
            const path = panel.getPath().getArray();
            path.forEach(point => {
                totalLat += point.lat();
                totalLng += point.lng();
            });
            totalVertices += path.length;
        });
        
        if (totalVertices === 0) return null;
        
        // Create centroid LatLng
        const centroid = new google.maps.LatLng(totalLat / totalVertices, totalLng / totalVertices);
        
        // Convert to pixel coordinates
        const projection = map.getProjection();
        const scale = Math.pow(2, map.getZoom());
        
        if (!projection) return null;
        
        const worldPoint = projection.fromLatLngToPoint(centroid);
        const topRight = projection.fromLatLngToPoint(map.getBounds().getNorthEast());
        const bottomLeft = projection.fromLatLngToPoint(map.getBounds().getSouthWest());
        
        const p = new google.maps.Point(
            (worldPoint.x - bottomLeft.x) * scale,
            (worldPoint.y - topRight.y) * scale
        );
        
        // Get the map container position
        const mapContainer = map.getDiv();
        const rect = mapContainer.getBoundingClientRect();
        
        // Return final screen coordinates
        return {
            x: rect.left + p.x,
            y: rect.top + p.y
        };
    }
    
    /**
     * Updates the position of the rotation handle
     */
    updateRotationHandlePosition() {
        const { container, handle, line, center } = this.#rotationElements;
        if (!container || !handle || !line || !center) return;
        
        // Get centroid of selected panels
        const centerPos = this.#getRotationCenter();
        if (!centerPos) {
            container.style.display = 'none';
            return;
        }
        
        // Calculate exact positioning
        const handleOffsetY = -70;
        
        // Set positions with direct DOM manipulation for more stability
        // Position the center indicator (exact center point)
        center.style.left = `${centerPos.x}px`;
        center.style.top = `${centerPos.y}px`;
        
        // Position the handle directly above center
        handle.style.left = `${centerPos.x}px`;
        handle.style.top = `${centerPos.y + handleOffsetY}px`;
        
        // Position and size the line to connect center to handle
        line.style.left = `${centerPos.x}px`;
        line.style.top = `${centerPos.y}px`;
        line.style.width = `${Math.abs(handleOffsetY)}px`;
        line.style.transform = 'rotate(-90deg) translateX(0) translateY(-1px)';
        
        // Ensure container is visible but doesn't interfere with interactions
        container.style.display = 'block';
        container.style.pointerEvents = 'none'; // Container should not catch any events
        handle.style.pointerEvents = 'auto';    // Only handle should catch events
    }
    
    /**
     * Hide rotation handle
     */
    hideRotationHandle() {
        const { container } = this.#rotationElements;
        if (container) {
            container.style.display = 'none';
        }
    }
    
    /**
     * Update position on map changes (zoom or pan)
     */
    onMapChanged() {
        // Only update position if handle is showing
        if (this.#rotationElements.container?.style.display !== 'none') {
            this.updateRotationHandlePosition();
        }
    }
    
    // Interval ID for continuous position updates
    #positionUpdaterId = null;
    
    /**
     * Start periodic position updates
     */
    #startPositionUpdater() {
        // Clear any existing updater first
        this.#stopPositionUpdater();
        
        // Update every 100ms while selected
        this.#positionUpdaterId = setInterval(() => {
            if (this.#rotationElements.container?.style.display !== 'none') {
                this.updateRotationHandlePosition();
            } else {
                this.#stopPositionUpdater();
            }
        }, 100);
    }
    
    /**
     * Stop periodic position updates
     */
    #stopPositionUpdater() {
        if (this.#positionUpdaterId !== null) {
            clearInterval(this.#positionUpdaterId);
            this.#positionUpdaterId = null;
        }
    }
    
    /**
     * Cleanup resources
     */
    cleanup() {
        this.#stopPositionUpdater();
        this.hideRotationHandle();
    }
    
    #setupPositionTracking() {
        // Add listener for selection changes to update handle position
        this.stateManager.addListener('selectedPolygons', (newSelection) => {
            const selectedPanels = Array.from(newSelection).filter(p => p.isPanelElement);
            if (selectedPanels.length > 0) {
                // Wait a small amount of time to ensure all DOM updates are complete
                setTimeout(() => {
                    this.updateRotationHandlePosition();
                    
                    // Start continuous position updating when panels are selected
                    this.#startPositionUpdater();
                }, 10);
            } else {
                this.hideRotationHandle();
                this.#stopPositionUpdater();
            }
        });
        
        // Add map event listeners to update handle position
        const map = this.mapService.getActiveMap();
        if (map) {
            // Update position on map movement
            ['zoom_changed', 'dragend', 'resize', 'projection_changed'].forEach(eventName => {
                google.maps.event.addListener(map, eventName, () => {
                    this.onMapChanged();
                });
            });
        }
    }
}