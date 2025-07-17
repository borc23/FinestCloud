/**
 * System Cost Calculator for Solar Installations
 * Calculates comprehensive system costs including panels, inverter, installation
 */
export class SystemCostCalculator {
    /**
     * Calculate complete system cost breakdown
     * @param {number} systemPowerKw - System power in kW
     * @param {object} config - Configuration object
     * @returns {object} System cost breakdown
     */
    calculate(systemPowerKw, config) {
        const systemPowerWp = systemPowerKw * 1000;
        const costPerWatt = this.#determineCostPerWatt(systemPowerKw, config);
        
        // Cost breakdown by component
        const costs = this.#calculateComponentCosts(systemPowerWp, costPerWatt);
        
        // Tax calculations
        const vat = costs.subtotal * config.subsidies.vatReduction;
        const totalCost = costs.subtotal + vat;
        
        // Additional metrics
        const costPerKwh = this.#calculateLevelizedCost(totalCost);
        
        return {
            ...costs,
            vat: Math.round(vat),
            totalCost: Math.round(totalCost),
            costPerWatt: costPerWatt,
            costPerKwh: costPerKwh
        };
    }

    /**
     * Determine cost per watt based on system size
     * @param {number} systemPowerKw - System power in kW
     * @param {object} config - Configuration object
     * @returns {number} Cost per watt
     */
    #determineCostPerWatt(systemPowerKw, config) {
        const costs = config.systemCostPerWatt;
        
        if (systemPowerKw < 10) {
            return costs.small;
        } else if (systemPowerKw > 40) {
            return costs.large;
        } else {
            return costs.medium;
        }
    }

    /**
     * Calculate cost breakdown by component
     * @param {number} systemPowerWp - System power in Wp
     * @param {number} costPerWatt - Cost per watt
     * @returns {object} Component cost breakdown
     */
    #calculateComponentCosts(systemPowerWp, costPerWatt) {
        const baseCost = systemPowerWp * costPerWatt;
        
        const panelCost = baseCost * 0.6;      // 55–60% panels
        const inverterCost = baseCost * 0.15;  // 10-15% inverter
        const installationCost = baseCost * 0.20; // 20-25% installation
        const otherCosts = baseCost * 0.05;    // 5-10% other (permits, etc.)
        
        const subtotal = panelCost + inverterCost + installationCost + otherCosts;
        
        return {
            panelCost: Math.round(panelCost),
            inverterCost: Math.round(inverterCost),
            installationCost: Math.round(installationCost),
            otherCosts: Math.round(otherCosts),
            subtotal: Math.round(subtotal)
        };
    }

    /**
     * Calculate levelized cost of electricity
     * @param {number} totalCost - Total system cost
     * @returns {number} Cost per kWh over 25 years
     */
    #calculateLevelizedCost(totalCost) {
        const systemLifespan = 25;
        const annualProduction = 1000; // Assumed kWh per kW per year
        const totalProduction = systemLifespan * annualProduction;
        
        return Math.round((totalCost / totalProduction) * 100) / 100;
    }
}
