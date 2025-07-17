/**
 * Manages roof polygon selection for targeted panel generation
 */
export class RoofSelectionManager {
    #selectedRoofs = new Set();
    #originalPolygonStyles = new Map();
    #isSelectionMode = false;
    #detectionService;
    #onSelectionComplete;
    #onSelectionCancel;

    constructor(detectionService) {
        this.#detectionService = detectionService;
    }

    /**
     * Start roof selection mode
     * @param {Function} onComplete - Callback when selection is complete
     * @param {Function} onCancel - Callback when selection is cancelled
     */
    startSelection(onComplete, onCancel) {
        this.#onSelectionComplete = onComplete;
        this.#onSelectionCancel = onCancel;
        this.#isSelectionMode = true;
        this.#selectedRoofs.clear();
        
        this.#makeRoofsVisible();
        this.#enableRoofSelection();
        this.#showSelectionUI();
    }

    /**
     * Make roof polygons visible and clickable
     */
    #makeRoofsVisible() {
        if (!this.#detectionService?.currentPolygonsRoof) return;

        this.#detectionService.currentPolygonsRoof.forEach(polygon => {
            if (polygon && !polygon.isPanelElement) {
                // Store original styles
                this.#originalPolygonStyles.set(polygon, {
                    fillOpacity: polygon.fillOpacity || 0.2,
                    strokeOpacity: polygon.strokeOpacity || 0.8,
                    fillColor: polygon.fillColor,
                    strokeColor: polygon.strokeColor,
                    clickable: polygon.clickable
                });

                // Apply selection mode styles
                polygon.setOptions({
                    fillOpacity: 0.3,
                    strokeOpacity: 1,
                    fillColor: '#4285f4',
                    strokeColor: '#1a73e8',
                    clickable: true,
                    visible: true
                });
            }
        });
    }

    /**
     * Enable roof polygon selection
     */
    #enableRoofSelection() {
        if (!this.#detectionService?.currentPolygonsRoof) return;

        this.#detectionService.currentPolygonsRoof.forEach(polygon => {
            if (polygon && !polygon.isPanelElement) {
                // Add click listener for roof selection
                polygon.addListener('click', (e) => {
                    e.stop && e.stop();
                    this.#toggleRoofSelection(polygon);
                });
            }
        });
    }

    /**
     * Toggle selection state of a roof polygon
     */
    #toggleRoofSelection(polygon) {
        if (this.#selectedRoofs.has(polygon)) {
            this.#selectedRoofs.delete(polygon);
            this.#applyUnselectedStyle(polygon);
        } else {
            this.#selectedRoofs.add(polygon);
            this.#applySelectedStyle(polygon);
        }
        
        this.#updateSelectionUI();
    }

    /**
     * Apply selected style to roof polygon
     */
    #applySelectedStyle(polygon) {
        polygon.setOptions({
            fillOpacity: 0.5,
            strokeOpacity: 1,
            fillColor: '#34a853',
            strokeColor: '#137333',
            strokeWeight: 3
        });
    }

    /**
     * Apply unselected style to roof polygon
     */
    #applyUnselectedStyle(polygon) {
        polygon.setOptions({
            fillOpacity: 0.3,
            strokeOpacity: 1,
            fillColor: '#4285f4',
            strokeColor: '#1a73e8',
            strokeWeight: 2
        });
    }    /**
     * Show the selection UI
     */
    #showSelectionUI() {
        // Create selection UI if it doesn't exist
        let selectionPanel = document.getElementById('roof-selection-panel');
        if (!selectionPanel) {
            selectionPanel = this.#createSelectionUI();
            document.body.appendChild(selectionPanel);
        }
        
        selectionPanel.classList.add('active');
        this.#updateSelectionUI();
    }

    /**
     * Create the selection UI element
     */
    #createSelectionUI() {
        const panel = document.createElement('div');
        panel.id = 'roof-selection-panel';
        panel.className = 'roof-selection-panel';
        panel.innerHTML = `
            <div class="roof-selection-header">
                <button class="roof-selection-close">&times;</button>
                <h3 class="roof-selection-title">Select Roof Areas</h3>
                <p class="roof-selection-subtitle">Choose which roofs to generate panels on</p>
            </div>
            <div class="roof-selection-content">
                <div class="roof-selection-info">
                    Click on roof polygons to select them. Selected roofs will show the new module while others remain unchanged.
                </div>
                
                <div class="roof-selection-controls">
                    <label class="select-all-option">
                        <input type="checkbox" id="select-all-roofs">
                        <span>Select All Roofs (<span class="selected-count" id="selected-count">0</span> selected)</span>
                    </label>
                </div>
                
                <div class="roof-selection-actions">
                    <button class="roof-selection-btn secondary" id="cancel-roof-selection">Cancel</button>
                    <button class="roof-selection-btn primary" id="generate-selected-roofs" disabled>Generate Panels</button>
                </div>
            </div>
        `;

        // Add event listeners
        this.#setupSelectionUIEvents(panel);
        
        return panel;
    }    /**
     * Setup event listeners for the selection UI
     */
    #setupSelectionUIEvents(panel) {
        const selectAllCheckbox = panel.querySelector('#select-all-roofs');
        const generateBtn = panel.querySelector('#generate-selected-roofs');
        const cancelBtn = panel.querySelector('#cancel-roof-selection');
        const closeBtn = panel.querySelector('.roof-selection-close');

        selectAllCheckbox.addEventListener('change', (e) => {
            if (e.target.checked) {
                this.#selectAllRoofs();
            } else {
                this.#deselectAllRoofs();
            }
        });

        generateBtn.addEventListener('click', () => {
            this.#completeSelection();
        });

        cancelBtn.addEventListener('click', () => {
            this.#cancelSelection();
        });

        closeBtn.addEventListener('click', () => {
            this.#cancelSelection();
        });
    }

    /**
     * Select all roof polygons
     */
    #selectAllRoofs() {
        if (!this.#detectionService?.currentPolygonsRoof) return;

        this.#detectionService.currentPolygonsRoof.forEach(polygon => {
            if (polygon && !polygon.isPanelElement) {
                this.#selectedRoofs.add(polygon);
                this.#applySelectedStyle(polygon);
            }
        });

        this.#updateSelectionUI();
    }    /**
     * Update the selection UI
     */
    #updateSelectionUI() {
        const countSpan = document.getElementById('selected-count');
        const generateBtn = document.getElementById('generate-selected-roofs');
        const selectAllCheckbox = document.getElementById('select-all-roofs');

        const selectedCount = this.#selectedRoofs.size;
        const totalRoofs = this.#detectionService?.currentPolygonsRoof?.filter(p => !p.isPanelElement).length || 0;

        if (countSpan) {
            countSpan.textContent = selectedCount;
        }

        if (generateBtn) {
            generateBtn.disabled = selectedCount === 0;
            generateBtn.textContent = selectedCount > 0 ? 
                `Generate on ${selectedCount} Roof${selectedCount !== 1 ? 's' : ''}` : 
                'Generate Panels';
        }

        if (selectAllCheckbox) {
            selectAllCheckbox.checked = selectedCount === totalRoofs && totalRoofs > 0;
            selectAllCheckbox.indeterminate = selectedCount > 0 && selectedCount < totalRoofs;
        }
    }

    /**
     * Deselect all roof polygons
     */
    #deselectAllRoofs() {
        this.#selectedRoofs.forEach(polygon => {
            this.#applyUnselectedStyle(polygon);
        });
        this.#selectedRoofs.clear();
        this.#updateSelectionUI();
    }

    /**
     * Complete the selection process
     */
    #completeSelection() {
        const selectedRoofIndices = [];
        
        if (this.#detectionService?.currentPolygonsRoof) {
            this.#detectionService.currentPolygonsRoof.forEach((polygon, index) => {
                if (!polygon.isPanelElement && this.#selectedRoofs.has(polygon)) {
                    selectedRoofIndices.push(index);
                }
            });
        }

        this.#cleanup();
        
        if (this.#onSelectionComplete) {
            this.#onSelectionComplete(selectedRoofIndices);
        }
    }

    /**
     * Cancel the selection process
     */
    #cancelSelection() {
        this.#cleanup();
        
        if (this.#onSelectionCancel) {
            this.#onSelectionCancel();
        }
    }    /**
     * Clean up selection mode
     */
    #cleanup() {
        this.#isSelectionMode = false;
        this.#selectedRoofs.clear();
        
        // Hide selection UI
        const selectionPanel = document.getElementById('roof-selection-panel');
        if (selectionPanel) {
            selectionPanel.classList.remove('active');
        }

        // Restore original polygon styles and hide roof polygons
        this.#restoreOriginalStyles();
        
        // Hide all roof polygons (non-panel elements) after selection
        if (this.#detectionService?.currentPolygonsRoof) {
            this.#detectionService.currentPolygonsRoof.forEach(polygon => {
                if (polygon && !polygon.isPanelElement) {
                    // Remove click listeners
                    google.maps.event.clearListeners(polygon, 'click');
                    // Hide the roof polygon
                    polygon.setVisible(false);
                }
            });
        }
    }

    /**
     * Restore original polygon styles
     */
    #restoreOriginalStyles() {
        this.#originalPolygonStyles.forEach((style, polygon) => {
            if (polygon) {
                polygon.setOptions(style);
            }
        });
        this.#originalPolygonStyles.clear();
    }

    /**
     * Check if currently in selection mode
     */
    isInSelectionMode() {
        return this.#isSelectionMode;
    }

    /**
     * Get selected roof indices
     */
    getSelectedRoofIndices() {
        const indices = [];
        if (this.#detectionService?.currentPolygonsRoof) {
            this.#detectionService.currentPolygonsRoof.forEach((polygon, index) => {
                if (!polygon.isPanelElement && this.#selectedRoofs.has(polygon)) {
                    indices.push(index);
                }
            });
        }
        return indices;
    }
}
