/**
 * Financial Configuration Manager
 * Manages user preferences and configuration for German solar financial calculations
 */

export class FinancialConfigManager {
    #config = {};
    #defaults = {
        // User location and preferences
        location: {
            state: 'bavaria', // Default to Bavaria (highest solar subsidies)
            electricityProvider: 'standard',
            roofOrientation: 'south',
            householdSize: 4
        },
        
        // Financial preferences
        financing: {
            paymentMethod: 'cash', // 'cash', 'loan', 'leasing'
            downPayment: 100, // percentage for loans
            loanTerm: 15, // years
            preferredPaybackPeriod: 10 // years
        },
        
        // Energy consumption preferences
        consumption: {
            averageMonthlyBill: 120, // €/month
            electricityUsageKwh: 4000, // kWh/year
            heatingType: 'gas', // 'gas', 'electric', 'oil', 'heatpump'
            evPlanned: false, // Electric vehicle planned
            heatPumpPlanned: false // Heat pump planned
        },
        
        // Investment preferences
        investment: {
            riskTolerance: 'moderate', // 'conservative', 'moderate', 'aggressive'
            prioritizeCO2: false,
            prioritizeROI: true,
            includeStorage: false // Battery storage
        }
    };

    constructor() {
        this.loadConfig();
    }

    /**
     * Load configuration from localStorage or use defaults
     */
    loadConfig() {
        try {
            const saved = localStorage.getItem('solarFinancialConfig');
            this.#config = saved ? { ...this.#defaults, ...JSON.parse(saved) } : { ...this.#defaults };
        } catch (error) {
            console.warn('Failed to load financial config, using defaults:', error);
            this.#config = { ...this.#defaults };
        }
    }

    /**
     * Save configuration to localStorage
     */
    saveConfig() {
        try {
            localStorage.setItem('solarFinancialConfig', JSON.stringify(this.#config));
        } catch (error) {
            console.error('Failed to save financial config:', error);
        }
    }

    /**
     * Get current configuration
     */
    getConfig() {
        return { ...this.#config };
    }

    /**
     * Update configuration
     */
    updateConfig(newConfig) {
        this.#config = { ...this.#config, ...newConfig };
        this.saveConfig();
    }

    /**
     * Reset to defaults
     */
    resetToDefaults() {
        this.#config = { ...this.#defaults };
        this.saveConfig();
    }

    /**
     * Get financial calculator configuration based on user preferences
     */
    getCalculatorConfig() {
        const config = this.getConfig();
        
        // Base calculator config adjustments based on user preferences
        const calculatorConfig = {};

        // Adjust electricity price based on usage and provider
        if (config.consumption.electricityUsageKwh > 5000) {
            calculatorConfig.electricityPricePerKwh = 0.29; // Lower rate for high consumers
        } else if (config.consumption.electricityUsageKwh < 2500) {
            calculatorConfig.electricityPricePerKwh = 0.35; // Higher rate for low consumers
        }

        // Adjust subsidies based on state
        const stateSubsidies = this.#getStateSubsidies(config.location.state);
        if (stateSubsidies) {
            calculatorConfig.subsidies = {
                ...calculatorConfig.subsidies,
                regionalSubsidy: stateSubsidies.regional,
                maxRegionalAmount: stateSubsidies.maxAmount
            };
        }

        // Adjust financing parameters based on payment method
        if (config.financing.paymentMethod === 'loan') {
            calculatorConfig.financing = {
                ...calculatorConfig.financing,
                interestRate: this.#getLoanInterestRate(config.financing.loanTerm),
                downPaymentPercent: config.financing.downPayment / 100
            };
        }

        // Adjust self-consumption rate based on household characteristics
        const selfConsumptionRate = this.#calculateSelfConsumptionRate(config);
        calculatorConfig.selfConsumptionRate = selfConsumptionRate;

        return calculatorConfig;
    }

    /**
     * Get state-specific subsidies
     */
    #getStateSubsidies(state) {
        const subsidies = {
            'bavaria': { regional: 0.08, maxAmount: 3000 },
            'baden-wurttemberg': { regional: 0.06, maxAmount: 2500 },
            'north-rhine-westphalia': { regional: 0.05, maxAmount: 2000 },
            'lower-saxony': { regional: 0.07, maxAmount: 2800 },
            'hesse': { regional: 0.04, maxAmount: 1500 },
            'rhineland-palatinate': { regional: 0.09, maxAmount: 3500 },
            'schleswig-holstein': { regional: 0.06, maxAmount: 2200 },
            'berlin': { regional: 0.10, maxAmount: 5000 },
            'hamburg': { regional: 0.08, maxAmount: 4000 },
            'bremen': { regional: 0.07, maxAmount: 3000 }
        };
        
        return subsidies[state] || { regional: 0.05, maxAmount: 2000 };
    }

    /**
     * Calculate loan interest rate based on term
     */
    #getLoanInterestRate(loanTerm) {
        if (loanTerm <= 10) return 0.025; // 2.5% for short term
        if (loanTerm <= 15) return 0.035; // 3.5% for medium term
        return 0.045; // 4.5% for long term
    }

    /**
     * Calculate self-consumption rate based on household characteristics
     */
    #calculateSelfConsumptionRate(config) {
        let baseRate = 0.30; // Default 30%

        // Adjust based on household size
        if (config.location.householdSize >= 5) {
            baseRate += 0.10; // +10% for large households
        } else if (config.location.householdSize <= 2) {
            baseRate -= 0.05; // -5% for small households
        }

        // Adjust for electric vehicle
        if (config.consumption.evPlanned) {
            baseRate += 0.15; // +15% for EV charging
        }

        // Adjust for heat pump
        if (config.consumption.heatPumpPlanned) {
            baseRate += 0.20; // +20% for heat pump
        }

        // Adjust for heating type
        if (config.consumption.heatingType === 'electric') {
            baseRate += 0.10; // +10% for electric heating
        }

        // Cap between 20% and 80%
        return Math.max(0.20, Math.min(0.80, baseRate));
    }

    /**
     * Get user-friendly configuration summary
     */
    getConfigSummary() {
        const config = this.getConfig();
        
        return {
            location: `${this.#formatStateName(config.location.state)}`,
            household: `${config.location.householdSize} Person(en)`,
            consumption: `${config.consumption.electricityUsageKwh.toLocaleString()} kWh/Jahr`,
            financing: this.#formatFinancing(config.financing),
            features: this.#getPlannedFeatures(config.consumption)
        };
    }

    /**
     * Format state name for display
     */
    #formatStateName(state) {
        const stateNames = {
            'bavaria': 'Bayern',
            'baden-wurttemberg': 'Baden-Württemberg',
            'north-rhine-westphalia': 'Nordrhein-Westfalen',
            'lower-saxony': 'Niedersachsen',
            'hesse': 'Hessen',
            'rhineland-palatinate': 'Rheinland-Pfalz',
            'schleswig-holstein': 'Schleswig-Holstein',
            'berlin': 'Berlin',
            'hamburg': 'Hamburg',
            'bremen': 'Bremen'
        };
        
        return stateNames[state] || state;
    }

    /**
     * Format financing information
     */
    #formatFinancing(financing) {
        switch (financing.paymentMethod) {
            case 'cash':
                return 'Barzahlung';
            case 'loan':
                return `Finanzierung (${financing.loanTerm} Jahre)`;
            case 'leasing':
                return 'Leasing';
            default:
                return financing.paymentMethod;
        }
    }

    /**
     * Get planned features summary
     */
    #getPlannedFeatures(consumption) {
        const features = [];
        
        if (consumption.evPlanned) features.push('E-Auto geplant');
        if (consumption.heatPumpPlanned) features.push('Wärmepumpe geplant');
        if (consumption.heatingType === 'electric') features.push('Elektrische Heizung');
        
        return features.length > 0 ? features.join(', ') : 'Keine besonderen Pläne';
    }

    /**
     * Validate configuration
     */
    validateConfig(config) {
        const errors = [];

        // Validate electricity usage
        if (config.consumption?.electricityUsageKwh < 1000 || config.consumption?.electricityUsageKwh > 20000) {
            errors.push('Stromverbrauch muss zwischen 1.000 und 20.000 kWh/Jahr liegen');
        }

        // Validate household size
        if (config.location?.householdSize < 1 || config.location?.householdSize > 10) {
            errors.push('Haushaltsgröße muss zwischen 1 und 10 Personen liegen');
        }

        // Validate loan term
        if (config.financing?.paymentMethod === 'loan') {
            if (config.financing?.loanTerm < 5 || config.financing?.loanTerm > 25) {
                errors.push('Finanzierungslaufzeit muss zwischen 5 und 25 Jahren liegen');
            }
        }

        return errors;
    }
}