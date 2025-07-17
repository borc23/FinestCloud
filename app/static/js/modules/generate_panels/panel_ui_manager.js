export class PanelUIManager {
    #calculator;
    #financialCalculator;
    #financialConfigManager;
    #elements = {};
    #isMinimized = false;

    static #UI_STATES = {
        HIDDEN: 'none',
        VISIBLE: 'block'
    };constructor(calculator, financialCalculator = null, financialConfigManager = null) {
        if (!calculator) throw new Error('Calculator is required');
        this.#calculator = calculator;
        this.#financialCalculator = financialCalculator;
        this.#financialConfigManager = financialConfigManager;
        this.#initElements();
    }    #initElements() {
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
            statsPanel: '.roof-live-stats',
            statsMinimizeBtn: '#statsMinimizeBtn',
            summaryPanelsCount: '#summaryPanelsCount',
            summaryEnergyOutput: '#summaryEnergyOutput'
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

        // Initialize minimize/expand functionality
        this.#initializeMinimizeToggle();
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
    }    /**
     * Update the stats panel based on the actual number of panels on the map
     * @param {number} currentPanelCount - The current number of panels on the map
     * @param {number} maxPanels - The maximum number of panels (for reference)
     * @param {object} electricalSystem - Electrical system data (optional)
     */
    updateStatsFromActualPanels(currentPanelCount, maxPanels, electricalSystem = null) {
        const { statsPanel } = this.#elements;
        
        // If there are no panels, hide the stats panel
        if (currentPanelCount <= 0) {
            if (statsPanel) statsPanel.style.display = PanelUIManager.#UI_STATES.HIDDEN;
            return;
        }
        
        // Otherwise, show the stats panel and update it
        if (statsPanel) statsPanel.style.display = PanelUIManager.#UI_STATES.VISIBLE;
        
        // Update stats with actual panel count and electrical system data
        this.updateStatsPanel(currentPanelCount, maxPanels, electricalSystem);
    }updateStatsPanel(currentPanels, maxPanels, electricalSystem = null) {
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

        // Update summary values for minimized state
        this.#updateSummaryValues(currentPanels, yearlyEnergy);

        // Add financial analysis if available
        this.#updateFinancialStats(currentPanels, yearlyEnergy);
    }

    /**
     * Initialize minimize/expand toggle functionality
     */
    #initializeMinimizeToggle() {
        const { statsMinimizeBtn, statsPanel } = this.#elements;
        if (!statsMinimizeBtn || !statsPanel) return;

        statsMinimizeBtn.addEventListener('click', () => {
            this.#toggleStatsPanel();
        });

        // Store the state
        this.#isMinimized = false;
    }

    /**
     * Toggle between minimized and expanded states
     */
    #toggleStatsPanel() {
        const { statsPanel, statsMinimizeBtn } = this.#elements;
        if (!statsPanel || !statsMinimizeBtn) return;

        this.#isMinimized = !this.#isMinimized;
        
        if (this.#isMinimized) {
            statsPanel.classList.add('minimized');
            statsMinimizeBtn.innerHTML = '<i class="fas fa-plus"></i>';
            statsMinimizeBtn.setAttribute('aria-label', 'Expand stats panel');
        } else {
            statsPanel.classList.remove('minimized');
            statsMinimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
            statsMinimizeBtn.setAttribute('aria-label', 'Minimize stats panel');
        }
    }

    /**
     * Update summary values in minimized state
     */
    #updateSummaryValues(currentPanels, yearlyEnergy) {
        const { summaryPanelsCount, summaryEnergyOutput } = this.#elements;
        
        if (summaryPanelsCount) {
            summaryPanelsCount.textContent = currentPanels.toLocaleString();
        }
        
        if (summaryEnergyOutput) {
            summaryEnergyOutput.textContent = `${yearlyEnergy.toLocaleString()} kWh`;
        }
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
    }    /**
     * Update financial statistics in the stats panel
     * @param {number} currentPanels - Current number of panels
     * @param {number} yearlyEnergy - Yearly energy production in kWh
     */    #updateFinancialStats(currentPanels, yearlyEnergy) {
        if (!this.#financialCalculator || !this.#financialConfigManager) {
            return; // Financial services not available
        }

        try {
            // Get user configuration
            const userConfig = this.#financialConfigManager.getConfig();
            
            // Use the calculator's getSystemPower method for more accurate calculation
            const systemPowerKw = this.#calculator.getSystemPower(currentPanels);
            
            // Get comprehensive financial analysis
            const analysis = this.#financialCalculator.calculateFinancialAnalysis(
                currentPanels,
                yearlyEnergy,
                systemPowerKw,
                userConfig
            );

            // Update or create financial display elements
            this.#updateFinancialDisplay(analysis);
            
        } catch (error) {
            console.error('Failed to update financial stats:', error);
        }
    }

    /**
     * Update financial information in the UI
     * @param {object} analysis - Financial analysis results
     */    #updateFinancialDisplay(analysis) {
        // Check if financial info section already exists
        let financialSection = document.getElementById('financial-info-section');
          if (!financialSection) {
            // Create financial info section
            financialSection = this.#createFinancialSection();
        }

        // Update the financial information
        this.#populateFinancialData(financialSection, analysis);
    }

    /**
     * Create the financial information section in the stats panel
     * @returns {HTMLElement} The created financial section
     */
    #createFinancialSection() {
        const { statsPanel } = this.#elements;
        if (!statsPanel) return null;

        // Find the existing stats items container
        const statsItems = statsPanel.querySelector('.roof-live-stats__items');
        if (!statsItems) return null;        // Create financial section HTML
        const financialSection = document.createElement('div');
        financialSection.id = 'financial-info-section';
        financialSection.className = 'financial-info-section';
        financialSection.innerHTML = `
            <div class="financial-header">
                <h4>Financial Analysis</h4>
                <button id="financial-config-btn" class="financial-config-btn" title="Financial Settings">
                    <i class="fas fa-cog"></i>
                </button>
            </div>
            <div class="financial-grid">
                <div class="financial-item">
                    <div class="financial-label">System Cost</div>
                    <div class="financial-value" id="system-cost">€0</div>
                </div>
                <div class="financial-item">
                    <div class="financial-label">Annual Savings</div>
                    <div class="financial-value" id="annual-savings">€0</div>
                </div>
                <div class="financial-item">
                    <div class="financial-label">Payback Period</div>
                    <div class="financial-value" id="payback-period">0 years</div>
                </div>
                <div class="financial-item">
                    <div class="financial-label">25-Year ROI</div>
                    <div class="financial-value" id="roi-value">0%</div>
                </div>
                <div class="financial-item">
                    <div class="financial-label">CO₂ Savings/Year</div>
                    <div class="financial-value" id="co2-savings">0 kg</div>
                </div>
                <div class="financial-item">
                    <div class="financial-label">Government Subsidies</div>
                    <div class="financial-value" id="subsidies-total">€0</div>
                </div>
            </div>
        `;

        // Insert financial section after the existing stats items
        statsPanel.appendChild(financialSection);

        // Add event listener for the config button
        const configBtn = financialSection.querySelector('#financial-config-btn');
        if (configBtn) {
            configBtn.addEventListener('click', () => this.#showFinancialConfigPopup());
        }

        return financialSection;
    }

    /**
     * Populate financial data in the display section
     * @param {HTMLElement} section - The financial section element
     * @param {object} analysis - Financial analysis data
     */    #populateFinancialData(section, analysis) {
        if (!section || !analysis) return;

        // Update system cost
        const systemCostEl = section.querySelector('#system-cost');
        if (systemCostEl) {
            systemCostEl.textContent = `€${analysis.costs.totalCost.toLocaleString()}`;
        }

        // Update annual savings
        const annualSavingsEl = section.querySelector('#annual-savings');
        if (annualSavingsEl) {
            annualSavingsEl.textContent = `€${Math.round(analysis.energy.totalAnnualSavings).toLocaleString()}`;
        }

        // Update payback period
        const paybackEl = section.querySelector('#payback-period');
        if (paybackEl) {
            const years = Math.round(analysis.roi.simplePaybackYears * 10) / 10;
            paybackEl.textContent = `${years} years`;
        }        // Update ROI
        const roiEl = section.querySelector('#roi-value');
        if (roiEl) {
            const roiValue = analysis.roi.roi;
            roiEl.textContent = `${Math.round(roiValue * 10) / 10}%`;
        }

        // Update CO₂ savings (convert tons to kg for display)
        const co2El = section.querySelector('#co2-savings');
        if (co2El) {
            const co2Kg = Math.round(analysis.co2.annualCO2AvoidedTons * 1000);
            co2El.textContent = `${co2Kg.toLocaleString()} kg`;
        }

        // Update subsidies
        const subsidiesEl = section.querySelector('#subsidies-total');
        if (subsidiesEl) {
            subsidiesEl.textContent = `€${Math.round(analysis.subsidies.totalSubsidies).toLocaleString()}`;
        }
    }    /**
     * Show financial configuration popup
     */
    #showFinancialConfigPopup() {
        const popup = document.getElementById('financial-config-popup');
        
        if (popup) {
            // Initialize event handlers if not already done
            if (!popup.hasAttribute('data-events-initialized')) {
                this.#initFinancialConfigPopupEvents(popup);
                popup.setAttribute('data-events-initialized', 'true');
            }
              // Show popup
            popup.style.display = 'flex';
            document.body.classList.add('popup-active');
        }
    }    /**
     * Initialize financial configuration popup event handlers
     * @param {HTMLElement} popup - The popup element
     */
    #initFinancialConfigPopupEvents(popup) {
        if (!popup || !this.#financialConfigManager) return;

        // Close button
        const closeBtn = popup.querySelector('.popup-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                popup.style.display = 'none';
                document.body.classList.remove('popup-active');
            });
        }

        // Cancel button
        const cancelBtn = popup.querySelector('#financial-cancel-btn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                popup.style.display = 'none';
                document.body.classList.remove('popup-active');
            });
        }        // Save button
        const saveBtn = popup.querySelector('#financial-save-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => {
                this.#saveFinancialConfig(popup);
            });
        }

        // Reset to defaults button
        const resetBtn = popup.querySelector('#financial-reset-btn');
        if (resetBtn) {
            resetBtn.addEventListener('click', () => {
                this.#resetFinancialConfigToDefaults(popup);
            });
        }

        // Load current configuration
        this.#loadCurrentFinancialConfig(popup);
    }    /**
     * Load current financial configuration into the popup form
     * @param {HTMLElement} popup - The popup element
     */
    #loadCurrentFinancialConfig(popup) {
        if (!popup || !this.#financialConfigManager) return;

        const config = this.#financialConfigManager.getConfig();
        const calculatorConfig = this.#financialCalculator?.getConfig() || {};

        // System costs
        const panelCostSmallInput = popup.querySelector('#panel-cost-small');
        if (panelCostSmallInput) panelCostSmallInput.value = calculatorConfig.systemCostPerWatt?.small || 1.8;

        const panelCostMediumInput = popup.querySelector('#panel-cost-medium');
        if (panelCostMediumInput) panelCostMediumInput.value = calculatorConfig.systemCostPerWatt?.medium || 1.6;

        const panelCostLargeInput = popup.querySelector('#panel-cost-large');
        if (panelCostLargeInput) panelCostLargeInput.value = calculatorConfig.systemCostPerWatt?.large || 1.4;

        const maintenanceCostInput = popup.querySelector('#maintenance-cost');
        if (maintenanceCostInput) maintenanceCostInput.value = calculatorConfig.financing?.maintenanceCostPerYear || 200;

        const insuranceCostInput = popup.querySelector('#insurance-cost');
        if (insuranceCostInput) insuranceCostInput.value = calculatorConfig.financing?.insuranceCostPerYear || 150;

        // Energy prices
        const electricityPriceInput = popup.querySelector('#electricity-price');
        if (electricityPriceInput) electricityPriceInput.value = calculatorConfig.electricityPricePerKwh || 0.32;

        const feedInTariffInput = popup.querySelector('#feed-in-tariff');
        if (feedInTariffInput) feedInTariffInput.value = calculatorConfig.feedInTariffPerKwh || 0.082;

        const electricityInflationInput = popup.querySelector('#electricity-inflation');
        if (electricityInflationInput) electricityInflationInput.value = (calculatorConfig.financing?.electricityInflation || 0.04) * 100;

        // Financial parameters
        const interestRateInput = popup.querySelector('#interest-rate');
        if (interestRateInput) interestRateInput.value = (calculatorConfig.financing?.interestRate || 0.035) * 100;

        const inflationRateInput = popup.querySelector('#inflation-rate');
        if (inflationRateInput) inflationRateInput.value = (calculatorConfig.financing?.inflationRate || 0.025) * 100;

        const degradationRateInput = popup.querySelector('#degradation-rate');
        if (degradationRateInput) degradationRateInput.value = (calculatorConfig.financing?.degradationRate || 0.005) * 100;

    }    /**
     * Save financial configuration from the popup form
     * @param {HTMLElement} popup - The popup element
     */
    #saveFinancialConfig(popup) {
        if (!popup || !this.#financialConfigManager) return;

        try {
            // Collect form data
            const formData = {
                location: {
                    state: popup.querySelector('#user-state')?.value || 'BY',
                    householdSize: parseInt(popup.querySelector('#household-size')?.value) || 4
                },
                consumption: {
                    electricityUsageKwh: parseInt(popup.querySelector('#electricity-usage')?.value) || 3500,
                    heatingType: 'gas', // Default since we removed this field
                    evPlanned: popup.querySelector('#plan-ev')?.checked || false,
                    heatPumpPlanned: popup.querySelector('#plan-heat-pump')?.checked || false,
                    planPool: popup.querySelector('#plan-pool')?.checked || false
                },
                financing: {
                    paymentMethod: popup.querySelector('#financing-type')?.value || 'cash',
                    downPaymentPercent: 20 // Default since we removed this field
                }
            };

            // Collect financial calculator configuration
            const calculatorConfig = {
                systemCostPerWatt: {
                    small: parseFloat(popup.querySelector('#panel-cost-small')?.value) || 1.8,
                    medium: parseFloat(popup.querySelector('#panel-cost-medium')?.value) || 1.6,
                    large: parseFloat(popup.querySelector('#panel-cost-large')?.value) || 1.4
                },
                electricityPricePerKwh: parseFloat(popup.querySelector('#electricity-price')?.value) || 0.32,
                feedInTariffPerKwh: parseFloat(popup.querySelector('#feed-in-tariff')?.value) || 0.082,
                financing: {
                    maintenanceCostPerYear: parseFloat(popup.querySelector('#maintenance-cost')?.value) || 200,
                    insuranceCostPerYear: parseFloat(popup.querySelector('#insurance-cost')?.value) || 150,
                    interestRate: (parseFloat(popup.querySelector('#interest-rate')?.value) || 3.5) / 100,
                    inflationRate: (parseFloat(popup.querySelector('#inflation-rate')?.value) || 2.5) / 100,
                    electricityInflation: (parseFloat(popup.querySelector('#electricity-inflation')?.value) || 4.0) / 100,
                    degradationRate: (parseFloat(popup.querySelector('#degradation-rate')?.value) || 0.5) / 100,
                    systemLifespan: 25
                }
            };

            // Save user configuration
            this.#financialConfigManager.updateConfig(formData);

            // Update financial calculator configuration
            if (this.#financialCalculator) {
                this.#financialCalculator.updateConfig(calculatorConfig);
            }

            // Close popup
            popup.style.display = 'none';
            document.body.classList.remove('popup-active');

            // Refresh financial stats with new config
            const currentPanels = parseInt(this.#elements.statsPanelsCurrent?.textContent) || 0;
            const yearlyEnergy = this.#calculator.getYearlyEnergy();
            this.#updateFinancialStats(currentPanels, yearlyEnergy);            console.log('Financial configuration saved successfully');

        } catch (error) {
            console.error('Failed to save financial configuration:', error);
        }
    }

    /**
     * Reset financial configuration to default values
     * @param {HTMLElement} popup - The popup element
     */
    #resetFinancialConfigToDefaults(popup) {
        if (!popup) return;

        // System costs - reset to default values
        const panelCostSmallInput = popup.querySelector('#panel-cost-small');
        if (panelCostSmallInput) panelCostSmallInput.value = 1.8;

        const panelCostMediumInput = popup.querySelector('#panel-cost-medium');
        if (panelCostMediumInput) panelCostMediumInput.value = 1.6;

        const panelCostLargeInput = popup.querySelector('#panel-cost-large');
        if (panelCostLargeInput) panelCostLargeInput.value = 1.4;

        const maintenanceCostInput = popup.querySelector('#maintenance-cost');
        if (maintenanceCostInput) maintenanceCostInput.value = 200;

        const insuranceCostInput = popup.querySelector('#insurance-cost');
        if (insuranceCostInput) insuranceCostInput.value = 150;

        // Energy prices - reset to defaults
        const electricityPriceInput = popup.querySelector('#electricity-price');
        if (electricityPriceInput) electricityPriceInput.value = 0.32;

        const feedInTariffInput = popup.querySelector('#feed-in-tariff');
        if (feedInTariffInput) feedInTariffInput.value = 0.082;

        const electricityInflationInput = popup.querySelector('#electricity-inflation');
        if (electricityInflationInput) electricityInflationInput.value = 4.0;

        // Financial parameters - reset to defaults
        const interestRateInput = popup.querySelector('#interest-rate');
        if (interestRateInput) interestRateInput.value = 3.5;

        const inflationRateInput = popup.querySelector('#inflation-rate');
        if (inflationRateInput) inflationRateInput.value = 2.5;

        const degradationRateInput = popup.querySelector('#degradation-rate');
        if (degradationRateInput) degradationRateInput.value = 0.5;

        console.log('Financial configuration reset to defaults');
    }

    /**
     * Reset UI manager state to defaults
     */
    resetState() {
        // Reset minimized state
        this.#isMinimized = false;
        
        // Reset stats panel to expanded state if it exists
        const { statsPanel, statsMinimizeBtn } = this.#elements;
        if (statsPanel) {
            statsPanel.classList.remove('minimized');
            statsPanel.style.display = 'none'; // Hide initially
        }
        if (statsMinimizeBtn) {
            statsMinimizeBtn.innerHTML = '<i class="fas fa-minus"></i>';
            statsMinimizeBtn.setAttribute('aria-label', 'Minimize stats panel');
        }
        
        // Reset slider values
        const { slider, currentPanelsSpan, maxPanelsSpan, sliderProgress } = this.#elements;
        if (slider) {
            slider.value = 0;
            slider.max = 0;
        }
        if (currentPanelsSpan) currentPanelsSpan.textContent = '0';
        if (maxPanelsSpan) maxPanelsSpan.textContent = '0';
        if (sliderProgress) sliderProgress.style.width = '0%';
        
        console.log('PanelUIManager state reset completed');
    }

    /**
     * Create the electrical information section in the stats panel
     * @returns {HTMLElement} The created electrical section
     */    #createElectricalSection() {
        const { statsPanel } = this.#elements;
        if (!statsPanel) return null;

        const electricalSection = document.createElement('div');
        electricalSection.id = 'electrical-info-section';
        electricalSection.className = 'electrical-info-section';
        electricalSection.innerHTML = `
            <div class="electrical-header">
                <h4>Electrical System</h4>
            </div>
            <div class="electrical-grid">
                <div class="electrical-item">
                    <div class="electrical-label">Total Strings</div>
                    <div class="electrical-value" id="total-strings">0</div>
                </div>
                <div class="electrical-item">
                    <div class="electrical-label">Inverters</div>
                    <div class="electrical-value" id="inverter-count">0</div>
                </div>
                <div class="electrical-item">
                    <div class="electrical-label">Inverter Size</div>
                    <div class="electrical-value" id="inverter-size">0 kW</div>
                </div>
                <div class="electrical-item">
                    <div class="electrical-label">DC/AC Ratio</div>
                    <div class="electrical-value" id="dc-ac-ratio">0</div>
                </div>
                <div class="electrical-item">
                    <div class="electrical-label">Wire Length</div>
                    <div class="electrical-value" id="wire-length">0 m</div>
                </div>
            </div>
        `;

        // Insert electrical section after the existing stats items but before financial section
        const financialSection = document.getElementById('financial-info-section');
        if (financialSection) {
            statsPanel.insertBefore(electricalSection, financialSection);
        } else {
            // Insert before the stats summary if no financial section exists
            const statsSummary = statsPanel.querySelector('.stats-summary');
            if (statsSummary) {
                statsPanel.insertBefore(electricalSection, statsSummary);
            } else {
                statsPanel.appendChild(electricalSection);
            }
        }

        return electricalSection;
    }

    /**
     * Populate electrical data in the display section
     * @param {HTMLElement} section - The electrical section element
     * @param {object} electricalSystem - Electrical system data
     */
    #populateElectricalData(section, electricalSystem) {
        if (!section || !electricalSystem) return;

        // Update total strings
        const totalStringsEl = section.querySelector('#total-strings');
        if (totalStringsEl) {
            totalStringsEl.textContent = electricalSystem.total_strings || 0;
        }

        // Update inverter count
        const inverterCountEl = section.querySelector('#inverter-count');
        if (inverterCountEl) {
            inverterCountEl.textContent = electricalSystem.inverter_count || 0;
        }

        // Update inverter size
        const inverterSizeEl = section.querySelector('#inverter-size');
        if (inverterSizeEl) {
            const size = electricalSystem.inverter_size_kw || 0;
            inverterSizeEl.textContent = `${size.toFixed(1)} kW`;
        }

        // Update DC/AC ratio
        const dcAcRatioEl = section.querySelector('#dc-ac-ratio');
        if (dcAcRatioEl) {
            const ratio = electricalSystem.dc_ac_ratio || 0;
            dcAcRatioEl.textContent = ratio.toFixed(2);
        }

        // Update wire length
        const wireLengthEl = section.querySelector('#wire-length');
        if (wireLengthEl) {
            const length = electricalSystem.estimated_wire_length || 0;
            wireLengthEl.textContent = `${Math.round(length)} m`;
        }
    }
}
