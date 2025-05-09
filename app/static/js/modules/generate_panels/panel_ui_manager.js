export class PanelUIManager {
    #calculator;
    #elements = {};

    static #UI_STATES = {
        HIDDEN: 'none',
        VISIBLE: 'block'
    };

    constructor(calculator) {
        if (!calculator) throw new Error('Calculator is required');
        this.#calculator = calculator;
        this.#initElements();
    }

    #initElements() {
        // Cache all DOM elements once during initialization
        const elements = {
            sliderWrapper: '#panelSliderWrapper',
            slider: '#panelSlider',
            currentPanelsSpan: '#currentPanels',
            maxPanelsSpan: '#maxPanels',
            sliderProgress: '#sliderProgress',
            generatePanelsBtn: '#generatePanelsBtn',
            statsPanelsCurrent: '#statsPanelsCurrent',
            statsPanelsMax: '#statsPanelsMax',
            statsEnergyOutput: '#statsEnergyOutput',
            panelsProgressBar: '#panelsProgressBar',
            energyProgressBar: '#energyProgressBar',
            statsPanel: '.roof-live-stats'
        };

        // Store cached elements
        this.#elements = Object.entries(elements).reduce((acc, [key, selector]) => {
            acc[key] = document.querySelector(selector);
            return acc;
        }, {});

        // Log warning for any missing elements
        Object.entries(this.#elements).forEach(([key, element]) => {
            if (!element) {
                console.warn(`UI element "${key}" not found in DOM`);
            }
        });
    }

    bindEvents(sliderChangeCallback) {
        const { slider, currentPanelsSpan, sliderProgress } = this.#elements;
        if (!slider || !currentPanelsSpan || !sliderProgress) return;

        slider.addEventListener('input', (event) => {
            const panelCount = parseInt(event.target.value);
            currentPanelsSpan.textContent = panelCount;

            const percentage = (panelCount / parseInt(event.target.max)) * 100;
            sliderProgress.style.width = `${percentage}%`;

            this.updateStatsPanel(panelCount, parseInt(event.target.max));

            sliderChangeCallback(panelCount, parseInt(event.target.max));
        });
    }

    updateSlider(maxPanels) {
        const { slider, currentPanelsSpan, maxPanelsSpan, sliderProgress, statsPanel } = this.#elements;
        if (!slider || !currentPanelsSpan || !maxPanelsSpan || !sliderProgress || !statsPanel) return;

        slider.max = maxPanels;
        slider.value = maxPanels;
        maxPanelsSpan.textContent = maxPanels;
        currentPanelsSpan.textContent = maxPanels;

        // Always hide the slider wrapper in v1 (disabled slider panel feature)
        this.hideSlider();

        // Always show stats panel if there are panels
        const shouldShowStats = maxPanels > 0;
        statsPanel.style.display = shouldShowStats ? PanelUIManager.#UI_STATES.VISIBLE : PanelUIManager.#UI_STATES.HIDDEN;

        sliderProgress.style.width = '100%';

        if (shouldShowStats) {
            this.updateStatsPanel(maxPanels, maxPanels);
        }
    }

    hideSlider() {
        const { sliderWrapper } = this.#elements;
        if (sliderWrapper) sliderWrapper.style.display = PanelUIManager.#UI_STATES.HIDDEN;
    }

    /**
     * Update the stats panel based on the actual number of panels on the map
     * @param {number} currentPanelCount - The current number of panels on the map
     * @param {number} maxPanels - The maximum number of panels (for reference)
     */
    updateStatsFromActualPanels(currentPanelCount, maxPanels) {
        const { statsPanel } = this.#elements;
        
        // If there are no panels, hide the stats panel
        if (currentPanelCount <= 0) {
            if (statsPanel) statsPanel.style.display = PanelUIManager.#UI_STATES.HIDDEN;
            return;
        }
        
        // Otherwise, show the stats panel and update it
        if (statsPanel) statsPanel.style.display = PanelUIManager.#UI_STATES.VISIBLE;
        
        // Update stats with actual panel count
        this.updateStatsPanel(currentPanelCount, maxPanels);
    }

    updateStatsPanel(currentPanels, maxPanels) {
        const { statsPanelsCurrent, statsPanelsMax, statsEnergyOutput, panelsProgressBar, energyProgressBar } = this.#elements;
        if (!statsPanelsCurrent || !statsPanelsMax || !statsEnergyOutput || !panelsProgressBar || !energyProgressBar) return;

        statsPanelsCurrent.textContent = currentPanels;
        statsPanelsMax.textContent = maxPanels;

        const panelsPercentage = maxPanels > 0 ? (currentPanels / maxPanels) : 0;
        panelsProgressBar.style.setProperty('--progress', panelsPercentage);

        const yearlyEnergy = this.#calculator.calculateYearlyEnergy(currentPanels);
        const maxYearlyEnergy = this.#calculator.calculateYearlyEnergy(maxPanels);

        statsEnergyOutput.textContent = yearlyEnergy.toLocaleString();

        const energyPercentage = maxYearlyEnergy > 0 ? (yearlyEnergy / maxYearlyEnergy) : 0;
        energyProgressBar.style.setProperty('--progress', energyPercentage);
    }

    showLoading() {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'loading-overlay';
        loadingDiv.innerHTML = `
            <div class="loading-content">
                <div class="spinner"></div>
                <div>Generating Panels...</div>
            </div>
        `;
        document.body.appendChild(loadingDiv);
        return loadingDiv;
    }

    hideLoading(loadingDiv) {
        loadingDiv?.remove();
    }
}
