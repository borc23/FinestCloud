export class AngleInputManager {
    #popup;
    #polygons = [];
    #labels = [];
    #cachedElements = {};

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

    showAngleInputs(polygons) {
        return new Promise((resolve, reject) => {
            this.#polygons = polygons;
            this.#addPolygonLabels();
            this.#createAngleInputs();
            
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

    #createAngleInputs() {
        const { inputsContainer } = this.#cachedElements;
        if (!inputsContainer) return;

        inputsContainer.innerHTML = '';
        
        this.#polygons.forEach((_, index) => {
            const inputGroup = document.createElement('div');
            inputGroup.className = 'angle-input-item';
            inputGroup.innerHTML = `
                <label><span class="angle-badge">${index + 1}</span>Roof Section</label>
                <div class="angle-unit">
                    <input type="number" min="0" max="90" step="0.1" 
                           placeholder="0-90" required
                           class="angle-input"
                           data-index="${index}">
                </div>
            `;
            inputsContainer.appendChild(inputGroup);
        });
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