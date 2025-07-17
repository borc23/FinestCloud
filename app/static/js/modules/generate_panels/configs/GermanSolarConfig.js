/**
 * German Solar Configuration
 * Contains all German-specific solar market conditions and regulations (2025)
 */
export class GermanSolarConfig {
    constructor(customConfig = {}) {
        this.config = this.#getDefaultConfig();
        this.merge(customConfig);
    }

    #getDefaultConfig() {
        return {
            // German electricity prices (2025 average)
            electricityPricePerKwh: 0.32, // €/kWh
            
            // German feed-in tariff (EEG 2023/2024 rates)
            feedInTariffPerKwh: 0.082, // €/kWh for rooftop systems <10kWp
            feedInTariffLarge: 0.071, // €/kWh for systems >10kWp
            
            // German solar system costs (2025 market prices)
            // Germany(2024):
            //     Small: €1.40 - €1.80 per Wp
            //     Medium: €1.10 - €1.50 per Wp
            //     Large: €0.85 - €1.20 per Wp
            systemCostPerWatt: {
                small: 1.6,    // €/Wp for systems <10kWp
                medium: 1.3,   // €/Wp for systems 10-40kWp  
                large: 1.05     // €/Wp for systems >40kWp
            },
            
            // German subsidies and incentives
            subsidies: {
                kfwSubsidy: 0.10,           // 10% KfW subsidy available
                regionalSubsidy: 0.05,       // 5% average regional subsidy
                vatReduction: 0.0,           // VAT reduced to 0% for solar systems
                maxKfwAmount: 10800,         // Max KfW subsidy amount €
            },
            
            // German financial parameters
            financing: {
                interestRate: 0.035,         // 3.5% average solar loan rate
                inflationRate: 0.025,        // 2.5% inflation
                electricityInflation: 0.04,  // 4% electricity price inflation
                degradationRate: 0.005,      // 0.5% panel degradation per year
                systemLifespan: 25,          // years
                maintenanceCostPerYear: 200, // €/year
                insuranceCostPerYear: 150    // €/year
            },
            
            // CO₂ factors for Germany
            co2: {
                gridEmissionFactor: 0.485,   // kg CO₂/kWh (German grid mix 2024)
                co2PricePerTon: 45,          // €/ton CO₂ (German carbon pricing)
                socialCostOfCarbon: 180      // €/ton CO₂ (social cost)
            }
        };
    }

    /**
     * Merge custom configuration with defaults
     * @param {object} customConfig - Custom configuration to merge
     * @returns {GermanSolarConfig} This instance for chaining
     */
    merge(customConfig) {
        this.config = this.#deepMerge(this.config, customConfig);
        return this;
    }

    /**
     * Get configuration value by path (e.g., 'subsidies.kfwSubsidy')
     * @param {string} path - Dot-separated path to configuration value
     * @returns {*} Configuration value
     */
    get(path) {
        return path.split('.').reduce((obj, key) => obj?.[key], this.config);
    }

    /**
     * Set configuration value by path
     * @param {string} path - Dot-separated path to configuration value
     * @param {*} value - Value to set
     */
    set(path, value) {
        const keys = path.split('.');
        const lastKey = keys.pop();
        const target = keys.reduce((obj, key) => obj[key] = obj[key] || {}, this.config);
        target[lastKey] = value;
    }

    /**
     * Get all configuration
     * @returns {object} Complete configuration object
     */
    getAll() {
        return { ...this.config };
    }

    /**
     * Deep merge two configuration objects
     * @param {object} target - Target object
     * @param {object} source - Source object to merge
     * @returns {object} Merged object
     */
    #deepMerge(target, source) {
        const result = { ...target };
        
        for (const key in source) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (result[key] && typeof result[key] === 'object' && !Array.isArray(result[key])) {
                    result[key] = this.#deepMerge(result[key], source[key]);
                } else {
                    result[key] = { ...source[key] };
                }
            } else {
                result[key] = source[key];
            }
        }
        
        return result;
    }
}
