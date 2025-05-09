export class ResolutionPopupManager {
  #popup = null;
  #callbacks = {};
  
  constructor(callbacks) {
    this.#callbacks = callbacks;
  }
  
  createPopup() {
    this.removePopup();
    
    this.#popup = document.createElement('div');
    this.#popup.className = 'resolution-popup';
    
    const template = document.getElementById('resolution-popup-template');
    if (template) {
      const content = template.content.cloneNode(true);
      this.#popup.appendChild(content);
    } else {
      console.warn('Resolution popup template not found, creating content dynamically');
      this.#createPopupContentDynamically();
    }
    
    document.body.appendChild(this.#popup);
    this.#setupButtonHandlers();
  }

  #createPopupContentDynamically() {
    const content = document.createElement('div');
    content.className = 'resolution-popup-content';
    
    // Create title
    const title = document.createElement('h3');
    title.textContent = 'Calculate Resolution';
    
    // Create instructions
    const instructions = document.createElement('p');
    instructions.className = 'step-instructions';
    instructions.textContent = 'Step 1: Click on two points on the image to measure a known distance';
    
    // Create points status section
    const pointsStatus = document.createElement('div');
    pointsStatus.className = 'points-status';
    
    const point1Status = document.createElement('span');
    point1Status.id = 'point1-status';
    point1Status.textContent = 'Point 1: Not selected';
    
    const point2Status = document.createElement('span');
    point2Status.id = 'point2-status';
    point2Status.textContent = 'Point 2: Not selected';
    
    const br = document.createElement('br');
    
    pointsStatus.appendChild(point1Status);
    pointsStatus.appendChild(br);
    pointsStatus.appendChild(point2Status);
    
    // Create form
    const form = this.#createDistanceForm();
    
    // Assemble content
    content.appendChild(title);
    content.appendChild(instructions);
    content.appendChild(pointsStatus);
    content.appendChild(form);
    
    this.#popup.appendChild(content);
  }
  
  #createDistanceForm() {
    const form = document.createElement('div');
    form.className = 'resolution-form';
    form.style.display = 'none';
    
    // Create label
    const label = document.createElement('label');
    label.setAttribute('for', 'distance-input');
    label.textContent = 'Enter the real-world distance between the points:';
    form.appendChild(label);
    
    // Create input group
    const inputGroup = document.createElement('div');
    inputGroup.className = 'input-group';
    
    const distanceInput = document.createElement('input');
    distanceInput.type = 'number';
    distanceInput.id = 'distance-input';
    distanceInput.min = '0.1';
    distanceInput.step = '0.1';
    distanceInput.placeholder = 'Distance';
    
    const unitSelect = document.createElement('select');
    unitSelect.id = 'distance-unit';
    
    const units = [
      { value: 'cm', text: 'cm' },
      { value: 'm', text: 'm', selected: true },
      { value: 'ft', text: 'ft' },
      { value: 'in', text: 'in' }
    ];
    
    units.forEach(unit => {
      const option = document.createElement('option');
      option.value = unit.value;
      option.textContent = unit.text;
      if (unit.selected) {
        option.selected = true;
      }
      unitSelect.appendChild(option);
    });
    
    inputGroup.appendChild(distanceInput);
    inputGroup.appendChild(unitSelect);
    form.appendChild(inputGroup);
    
    // Create button group
    const buttonGroup = document.createElement('div');
    buttonGroup.className = 'button-group';
    
    const calculateBtn = document.createElement('button');
    calculateBtn.id = 'calculate-resolution-btn';
    calculateBtn.className = 'resolution-btn-primary';
    calculateBtn.textContent = 'Calculate';
    
    const cancelBtn = document.createElement('button');
    cancelBtn.id = 'cancel-resolution-btn';
    cancelBtn.className = 'resolution-btn-secondary';
    cancelBtn.textContent = 'Cancel';
    
    const resetBtn = document.createElement('button');
    resetBtn.id = 'reset-points-btn';
    resetBtn.className = 'resolution-btn-secondary';
    resetBtn.textContent = 'Reset Points';
    
    buttonGroup.appendChild(calculateBtn);
    buttonGroup.appendChild(cancelBtn);
    buttonGroup.appendChild(resetBtn);
    form.appendChild(buttonGroup);
    
    return form;
  }
  
  #setupButtonHandlers() {
    const calculateBtn = this.#popup.querySelector('#calculate-resolution-btn');
    calculateBtn.addEventListener('click', () => {
      if (this.#callbacks.calculateCallback) {
        this.#callbacks.calculateCallback();
      }
    });
    
    const cancelBtn = this.#popup.querySelector('#cancel-resolution-btn');
    cancelBtn.addEventListener('click', () => {
      if (this.#callbacks.cancelCallback) {
        this.#callbacks.cancelCallback();
      }
    });
    
    const resetBtn = this.#popup.querySelector('#reset-points-btn');
    resetBtn.addEventListener('click', () => {
      if (this.#callbacks.resetCallback) {
        this.#callbacks.resetCallback();
      }
    });
  }
  
  updatePointStatus(pointIndex, point) {
    if (!this.#popup) return;
    
    const pointStatus = this.#popup.querySelector(`#point${pointIndex}-status`);
    if (pointStatus) {
      const { x, y } = point.pixel;
      pointStatus.textContent = `Point ${pointIndex}: Selected (${point.lat}, ${point.lng}) - Pixel: (${Math.round(x)}, ${Math.round(y)})`;
    }
  }
  
  showDistanceForm() {
    if (!this.#popup) return;
    
    const form = this.#popup.querySelector('.resolution-form');
    if (form) form.style.display = 'block';
    
    const instructions = this.#popup.querySelector('.step-instructions');
    if (instructions) {
      instructions.textContent = 'Step 2: Enter the real-world distance between the selected points';
    }
  }
  
  hideDistanceForm() {
    if (!this.#popup) return;
    
    const form = this.#popup.querySelector('.resolution-form');
    if (form) form.style.display = 'none';
  }
  
  resetPointsDisplay() {
    if (!this.#popup) return;
    
    const point1Status = this.#popup.querySelector('#point1-status');
    const point2Status = this.#popup.querySelector('#point2-status');
    
    if (point1Status) point1Status.textContent = 'Point 1: Not selected';
    if (point2Status) point2Status.textContent = 'Point 2: Not selected';
    
    const instructions = this.#popup.querySelector('.step-instructions');
    if (instructions) {
      instructions.textContent = 'Step 1: Click on two points on the image to measure a known distance';
    }
  }
  
  getDistanceValues() {
    if (!this.#popup) return { distance: 0, unit: 'm' };
    
    const distanceInput = this.#popup.querySelector('#distance-input');
    const unitSelect = this.#popup.querySelector('#distance-unit');
    
    return {
      distance: parseFloat(distanceInput?.value || '0'),
      unit: unitSelect?.value || 'm'
    };
  }
  
  removePopup() {
    if (this.#popup && document.body.contains(this.#popup)) {
      document.body.removeChild(this.#popup);
      this.#popup = null;
    }
  }
}
