export class MapAngleInputManager {
    #popup;
    #polygons = [];
    #labels = [];
    #cachedElements = {};
    #roofSegments = [];

    constructor() {
        this.#cachePopup();
    }

    #cachePopup() {
        this.#popup = document.querySelector('.angle-input-popup');
        if (this.#popup) {
            // Cache frequently accessed elements
            this.#cachedElements = {
                inputsContainer: this.#popup.querySelector('#angleInputs'),
                confirmBtn: this.#popup.querySelector('#confirmAngles'),
                cancelBtn: this.#popup.querySelector('#cancelAngles')
            };
        }
    }

    showAngleInputs(polygons, roofSegments = []) {
        return new Promise((resolve, reject) => {
            this.#polygons = polygons;
            this.#roofSegments = roofSegments;
            this.#addPolygonLabels();
            this.#createAngleInputsWithPrefilledData();
            
            const { confirmBtn, cancelBtn } = this.#cachedElements;
            
            const handleConfirm = () => {
                try {
                    const angles = this.#collectAngles();
                    this.#cleanup();
                    resolve(angles);
                } catch (error) {
                    alert(error.message);
                }
            };
            
            const handleCancel = () => {
                this.#cleanup();
                reject('Cancelled by user');
            };
            
            // Remove existing listeners
            confirmBtn.removeEventListener('click', handleConfirm);
            cancelBtn.removeEventListener('click', handleCancel);
            
            confirmBtn.addEventListener('click', handleConfirm);
            cancelBtn.addEventListener('click', handleCancel);
            
            this.#popup.style.display = 'flex';
        });
    }

    #addPolygonLabels() {
        this.#polygons.forEach((polygon, index) => {
            const label = new google.maps.Marker({
                position: this.#getPolygonCenter(polygon),
                map: polygon.getMap(),
                label: {
                    text: (index + 1).toString(),
                    color: 'white',
                    fontSize: '16px',
                    fontWeight: 'bold'
                },
                icon: {
                    path: google.maps.SymbolPath.CIRCLE,
                    fillColor: '#4285F4',
                    fillOpacity: 1,
                    strokeColor: '#ffffff',
                    strokeWeight: 2,
                    scale: 12
                }
            });
            this.#labels.push(label);
        });
    }

    #createAngleInputsWithPrefilledData() {
        const { inputsContainer } = this.#cachedElements;
        if (!inputsContainer) return;

        inputsContainer.innerHTML = '';
        
        this.#polygons.forEach((polygon, index) => {
            // Find matching roof segment for this polygon
            const coords = this.#extractPolygonCoordinates(polygon);
            const matchingSegment = this.#findMatchingRoofSegment(coords, this.#roofSegments);
            
            // Get API angle or default to empty
            const apiAngle = matchingSegment?.pitchDegrees || '';
            const azimuthAngle = matchingSegment?.azimuthDegrees || '';
            
            const inputGroup = document.createElement('div');
            inputGroup.className = 'angle-input-item';
            inputGroup.innerHTML = `
                <label>
                    <span class="angle-badge">${index + 1}</span>
                    Roof Section
                    ${apiAngle ? `<small style="color: #666; display: block; font-size: 12px;">${apiAngle.toFixed(1)}° pitch, ${azimuthAngle.toFixed(0)}° azimuth</small>` : ''}
                </label>
                <div class="angle-unit">
                    <input type="number" min="0" max="90" step="0.1" 
                           placeholder="0-90" 
                           value="${apiAngle ? apiAngle.toFixed(1) : ''}"
                           class="angle-input"
                           data-index="${index}">
                    <span class="unit-label">°</span>
                </div>
            `;
            inputsContainer.appendChild(inputGroup);
        });
    }

    #extractPolygonCoordinates(polygon) {
        const path = polygon.getPath();
        return Array.from({ length: path.getLength() }, (_, i) => {
            const point = path.getAt(i);
            return { lat: point.lat(), lng: point.lng() };
        });
    }

    #findMatchingRoofSegment(coords, roofSegments) {
        return roofSegments.find(segment => {
            if (!segment.center?.latitude || !segment.center?.longitude) {
                return false;
            }
            
            const center = {
                lat: segment.center.latitude,
                lng: segment.center.longitude
            };
            
            return this.#isPointInPolygon(center, coords);
        });
    }

    #isPointInPolygon(point, polygon) {
        let inside = false;
        let j = polygon.length - 1;
        
        for (let i = 0; i < polygon.length; i++) {
            const xi = polygon[i].lat;
            const yi = polygon[i].lng;
            const xj = polygon[j].lat;
            const yj = polygon[j].lng;
            
            if (((yi > point.lng) !== (yj > point.lng)) &&
                (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi)) {
                inside = !inside;
            }
            j = i;
        }
        
        return inside;
    }    #collectAngles() {
        const angles = [];
        this.#popup.querySelectorAll('.angle-input').forEach(input => {
            const value = parseFloat(input.value);
            if (isNaN(value) || value < 0 || value > 90) {
                throw new Error(`Invalid angle value for roof section ${parseInt(input.dataset.index) + 1}`);
            }
            angles.push(value);
        });
        
        // Collect padding value
        const paddingInput = this.#popup.querySelector('#edgePadding');
        const paddingValue = paddingInput ? parseFloat(paddingInput.value) : 20;
        
        if (isNaN(paddingValue) || paddingValue < 0 || paddingValue > 200) {
            throw new Error('Edge padding must be between 0 and 200 cm');
        }
        
        return {
            angles: angles,
            edgePadding: paddingValue
        };
    }

    #getPolygonCenter(polygon) {
        const bounds = new google.maps.LatLngBounds();
        polygon.getPath().forEach(point => bounds.extend(point));
        return bounds.getCenter();
    }

    #cleanup() {
        this.#labels.forEach(label => label.setMap(null));
        this.#labels = [];
        if (this.#popup) {
            this.#popup.style.display = 'none';
        }
    }
}
