export class ModuleSelectorService {
    constructor(generatePanelsService) {
        this.generatePanelsService = generatePanelsService;
        this.currentModule = 'standard';
        this.modules = {};
        
        this.moduleButton = document.querySelector('.module-select-button');
        this.modulePanel = document.querySelector('.module-search-panel');
        this.moduleList = document.querySelector('.module-list');
        this.searchInput = document.querySelector('.search-input');
        
        this.init();
    }
    
    async init() {
        await this.fetchModules();
        
        this.setupEventListeners();
        
        this.enhanceModuleButton();
        this.enhanceSearchHeader();
        
        this.renderModuleList();
    }
    
    enhanceModuleButton() {
        // Add dropdown icon if it doesn't exist
        if (!this.moduleButton.querySelector('.dropdown-icon')) {
            const iconSpan = document.createElement('span');
            iconSpan.className = 'dropdown-icon';
            iconSpan.innerHTML = '<i class="fas fa-chevron-down"></i>';
            this.moduleButton.appendChild(iconSpan);
        }
    }
    
    enhanceSearchHeader() {
        // Get or create search header
        let searchHeader = this.modulePanel.querySelector('.search-header');
        if (!searchHeader) {
            searchHeader = document.createElement('div');
            searchHeader.className = 'search-header';
            this.modulePanel.insertBefore(searchHeader, this.modulePanel.firstChild);
        }
        
        // Set header content with simpler text
        searchHeader.innerHTML = `
            <span>Solar Modules</span>
            <span class="close-panel"><i class="fas fa-times"></i></span>
        `;
        
        // Add close button functionality
        const closeBtn = searchHeader.querySelector('.close-panel');
        closeBtn.addEventListener('click', () => {
            this.modulePanel.classList.remove('active');
            
            // Reset dropdown icon
            const dropdownIcon = this.moduleButton.querySelector('.dropdown-icon i');
            if (dropdownIcon) {
                dropdownIcon.style.transform = 'rotate(0)';
            }
        });
        
        // Enhance search input but without adding icons
        this.enhanceSearchInput();
    }
    
    enhanceSearchInput() {
        // Create wrapper if needed
        let wrapper = this.modulePanel.querySelector('.search-input-wrapper');
        if (!wrapper) {
            // Get original search input
            const originalInput = this.searchInput;
            
            // Create wrapper
            wrapper = document.createElement('div');
            wrapper.className = 'search-input-wrapper';
            
            // Move input to wrapper
            if (originalInput && originalInput.parentNode) {
                originalInput.parentNode.insertBefore(wrapper, originalInput);
                wrapper.appendChild(originalInput);
            } else {
                // Create new input if original doesn't exist
                const newInput = document.createElement('input');
                newInput.type = 'text';
                newInput.className = 'search-input';
                newInput.placeholder = 'Search modules';
                wrapper.appendChild(newInput);
                this.searchInput = newInput;
            }
            
            // Add before search header
            const searchHeader = this.modulePanel.querySelector('.search-header');
            if (searchHeader && searchHeader.nextSibling) {
                this.modulePanel.insertBefore(wrapper, searchHeader.nextSibling);
            } else {
                this.modulePanel.appendChild(wrapper);
            }
        }
        
        // No search icon or clear button, keeping it clean and minimal
    }
    
    async fetchModules() {
        try {
            const response = await fetch('/get_panel_modules');
            const data = await response.json();
            
            if (data.success) {
                this.modules = data.modules;

                // Ensure "Custom" module is not duplicated
                if (!this.modules['custom']) {
                    this.modules['custom'] = {
                        id: 'custom',
                        name: 'Custom',
                        width_cm: null,
                        height_cm: null,
                        power_w: null,
                        efficiency: null,
                        color: '#7f8c8d',
                        path: 'https://res.cloudinary.com/dajy5yo5a/image/upload/v1746527441/solar-panel_acv6hz.png',
                        description: 'Define your custom module specifications.',
                    };
                }

                console.log('Available modules:', this.modules);
            } else {
                console.error('Failed to fetch modules:', data.error);
            }
        } catch (error) {
            console.error('Error fetching modules:', error);
        }
    }
    
    setupEventListeners() {
        this.moduleButton.addEventListener('click', () => {
            this.modulePanel.classList.toggle('active');
            
            // Rotate the dropdown icon when open
            const dropdownIcon = this.moduleButton.querySelector('.dropdown-icon i');
            if (dropdownIcon) {
                dropdownIcon.style.transform = this.modulePanel.classList.contains('active') 
                    ? 'rotate(180deg)' 
                    : 'rotate(0)';
            }
            
            // Focus search input when opened
            if (this.modulePanel.classList.contains('active')) {
                setTimeout(() => {
                    this.searchInput.focus();
                }, 100);
            }
        });
        
        document.addEventListener('click', (event) => {
            if (!event.target.closest('.module-selector') && 
                this.modulePanel.classList.contains('active')) {
                this.modulePanel.classList.remove('active');
                
                // Reset dropdown icon
                const dropdownIcon = this.moduleButton.querySelector('.dropdown-icon i');
                if (dropdownIcon) {
                    dropdownIcon.style.transform = 'rotate(0)';
                }
            }
        });

        this.searchInput.addEventListener('input', () => {
            this.renderModuleList();
        });
        
        this.modulePanel.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.modulePanel.classList.remove('active');
                return;
            }
            
            if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
                e.preventDefault();
                
                const items = Array.from(this.moduleList.querySelectorAll('.module-item'));
                const activeItem = this.moduleList.querySelector('.module-item.keyboard-focus');
                let nextIndex = 0;
                
                if (activeItem) {
                    const currentIndex = items.indexOf(activeItem);
                    activeItem.classList.remove('keyboard-focus');
                    
                    if (e.key === 'ArrowDown') {
                        nextIndex = (currentIndex + 1) % items.length;
                    } else {
                        nextIndex = (currentIndex - 1 + items.length) % items.length;
                    }
                }
                
                if (items[nextIndex]) {
                    items[nextIndex].classList.add('keyboard-focus');
                    items[nextIndex].scrollIntoView({ block: 'nearest' });
                }
            }
            
            if (e.key === 'Enter') {
                const focusedItem = this.moduleList.querySelector('.module-item.keyboard-focus');
                if (focusedItem) {
                    const moduleId = focusedItem.dataset.moduleId;
                    this.selectModule(moduleId);
                }
            }
        });
    }
    
    renderModuleList() {
        const searchTerm = this.searchInput.value.toLowerCase();
        this.moduleList.innerHTML = '';

        const filteredModules = Object.values(this.modules).filter((module) => {
            return module.name.toLowerCase().includes(searchTerm) || 
                   (module.description && module.description.toLowerCase().includes(searchTerm));
        });

        if (filteredModules.length === 0) {
            this.moduleList.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <span>No modules found matching "${searchTerm}"</span>
                </div>
            `;
        }

        filteredModules.forEach((module) => {
            const moduleItem = document.createElement('div');
            moduleItem.className = `module-item ${this.currentModule === module.id ? 'active' : ''}`;
            moduleItem.dataset.moduleId = module.id;
            
            const power = module.power_w !== null ? `${module.power_w}W` : 'N/A';
            const efficiency = module.efficiency !== null ? `${module.efficiency}%` : 'N/A';

            const dimensions = module.id === 'custom' && module.height_cm && module.width_cm 
            ? `<span><i class="fas fa-ruler"></i>${module.height_cm}x${module.width_cm}cm</span>` 
            : '';
            
            const efficiencyClass = this.getEfficiencyClass(module.efficiency);
            
            moduleItem.innerHTML = `
                <div class="module-icon">
                    <img src="${module.path}" alt="${module.name}" />
                </div>
                <div class="module-info">
                    <div class="module-name">${module.name}</div>
                    <div class="module-specs">
                        <span><i class="fas fa-bolt"></i>${power}</span>
                        <span class="${efficiencyClass}"><i class="fas fa-percentage"></i>${efficiency}</span>
                        ${dimensions}
                    </div>
                    <div class="module-description">${module.description || 'No description available'}</div>
                    ${this.renderModuleTags(module)}
                </div>
            `;
            
            moduleItem.addEventListener('click', () => this.selectModule(module.id));
            this.moduleList.appendChild(moduleItem);
        });

        const currentModuleData = Object.values(this.modules).find(m => m.id === this.currentModule);
        if (currentModuleData) {
            let buttonText = currentModuleData.name;
            if (currentModuleData.id === 'custom' && currentModuleData.power_w) {
                buttonText += ` (${currentModuleData.power_w}W)`;
            }
            this.moduleButton.querySelector('span').textContent = buttonText;
        }
    }
    
    getEfficiencyClass(efficiency) {
        if (!efficiency) return '';
        
        const eff = parseFloat(efficiency);
        if (eff >= 22) return 'high-efficiency';
        if (eff >= 19) return 'medium-efficiency';
        return 'standard-efficiency';
    }
    
    renderModuleTags(module) {
        const tags = [];
        
        if (module.power_w > 400) tags.push('High Power');
        if (parseFloat(module.efficiency) > 21) tags.push('High Efficiency');
        if (module.type === 'mono') tags.push('Monocrystalline');
        if (module.type === 'poly') tags.push('Polycrystalline');
        if (module.bifacial) tags.push('Bifacial');
        if (module.blackframe) tags.push('Black Frame');
        
        if (tags.length === 0) return '';
        
        return `
            <div class="module-tags">
                ${tags.map(tag => `<span class="module-tag">${tag}</span>`).join('')}
            </div>
        `;
    }
      selectModule(moduleId) {
        this.currentModule = moduleId;

        document.querySelectorAll('.module-item').forEach(item => {
            item.classList.toggle('active', item.dataset.moduleId === moduleId);
        });

        const selectedModule = Object.values(this.modules).find(m => m.id === moduleId);
        this.moduleButton.querySelector('span').textContent = selectedModule.name;

        const selectedItem = document.querySelector(`.module-item[data-module-id="${moduleId}"]`);
        if (selectedItem) {
            selectedItem.classList.add('module-selected');
            setTimeout(() => {
                selectedItem.classList.remove('module-selected');
            }, 500);
        }

        this.modulePanel.classList.remove('active');

        const dropdownIcon = this.moduleButton.querySelector('.dropdown-icon i');
        if (dropdownIcon) {
            dropdownIcon.style.transform = 'rotate(0)';
        }

        if (moduleId === 'custom') {
            this.showCustomModulePopup();
        } else if (this.generatePanelsService && this.generatePanelsService.hasPanels()) {
            // Check if we have roof polygons to enable selective generation
            const hasRoofPolygons = this.generatePanelsService.hasRoofPolygons();
            
            if (hasRoofPolygons) {
                // Start roof selection mode for targeted panel generation
                this.startRoofSelectionMode(moduleId);
            } else {
                // Fallback to full regeneration
                this.regeneratePanels();
            }
        } else {
            console.log('No panels available to regenerate');
        }

        console.log(`Selected module: ${moduleId}`);
    }

    async showCustomModulePopup() {
        const popup = document.querySelector('.custom-module-popup');
        if (popup) {
            const customModule = this.modules.custom;
            if (customModule) {
                popup.querySelector('#custom-height').value = customModule.height_cm || '';
                popup.querySelector('#custom-width').value = customModule.width_cm || '';
                popup.querySelector('#custom-power').value = customModule.power_w || '';
                popup.querySelector('#custom-efficiency').value = customModule.efficiency || '';
            }
            popup.style.display = 'flex';
        }
    
        const closeButton = popup.querySelector('.close-popup');
        closeButton.addEventListener('click', () => {
            popup.style.display = 'none';
        });
    
        const saveButton = popup.querySelector('.save-custom-module');
        saveButton.addEventListener('click', async () => {
            const height = parseFloat(popup.querySelector('#custom-height').value);
            const width = parseFloat(popup.querySelector('#custom-width').value);
            const power = parseFloat(popup.querySelector('#custom-power').value);
            const efficiency = parseFloat(popup.querySelector('#custom-efficiency').value);
    
            if (isNaN(height) || isNaN(width) || isNaN(power) || isNaN(efficiency)) {
                alert('Please fill in all fields with valid numbers.');
                return;
            }
    
            try {
                const response = await fetch('/custom_module', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        width_cm: width,
                        height_cm: height,
                        power_w: power,
                        efficiency: efficiency
                    })
                });
    
                const { success, module } = await response.json();
                if (success) {
                    console.log('Received custom module data:', module);
                    this.modules.custom = module;
                    this.renderModuleList();
                    this.selectModule('custom');
                    popup.style.display = 'none';
    
                    if (this.generatePanelsService && this.generatePanelsService.hasPanels()) {
                        this.regeneratePanels();
                    }
                }
            } catch (error) {
                console.error('Error saving custom specifications:', error);
                alert('Failed to save custom specifications. Please try again.');
            }
        });
    }

    regeneratePanels() {
        this.generatePanelsService.setModule(this.currentModule);
        this.generatePanelsService.clearPanels();
        this.generatePanelsService.generatePanels(this.currentModule);
    }
    
    getCurrentModule() {
        return this.currentModule;
    }

    /**
     * Start roof selection mode for targeted panel generation
     */
    startRoofSelectionMode(moduleId) {
        // Lazy load the RoofSelectionManager
        if (!this.roofSelectionManager) {
            import('./generate_panels/roof_selection_manager.js')
                .then(module => {
                    this.roofSelectionManager = new module.RoofSelectionManager(
                        this.generatePanelsService.getDetectionService()
                    );
                    this.#initiateRoofSelection(moduleId);
                })
                .catch(error => {
                    console.error('Failed to load RoofSelectionManager:', error);
                    // Fallback to full regeneration
                    this.regeneratePanels();
                });
        } else {
            this.#initiateRoofSelection(moduleId);
        }
    }

    /**
     * Initiate the roof selection process
     */
    #initiateRoofSelection(moduleId) {
        this.roofSelectionManager.startSelection(
            // On selection complete
            (selectedRoofIndices) => {
                this.generatePanelsOnSelectedRoofs(moduleId, selectedRoofIndices);
            },
            // On selection cancel
            () => {
                console.log('Roof selection cancelled');
                // Could optionally revert module selection here
            }
        );
    }

    /**
     * Generate panels on selected roofs with the new module
     */
    async generatePanelsOnSelectedRoofs(moduleId, selectedRoofIndices) {
        try {
            // Set the new module
            this.generatePanelsService.setModule(moduleId);
            
            // Generate panels only on selected roofs
            await this.generatePanelsService.generatePanelsOnSelectedRoofs(selectedRoofIndices, moduleId);
            
            console.log(`Generated panels with module ${moduleId} on ${selectedRoofIndices.length} selected roofs`);
        } catch (error) {
            console.error('Failed to generate panels on selected roofs:', error);
            // Show user-friendly error message
            alert('Failed to generate panels on selected roofs. Please try again.');
        }
    }
}
