/**
 * Energy Economics Calculator for Solar Systems
 * Calculates energy savings, feed-in income, and total benefits
 */
export class EnergyEconomicsCalculator {
    /**
     * Calculate energy economics and savings
     * @param {number} yearlyEnergyKwh - Annual energy production in kWh
     * @param {object} config - Configuration object
     * @returns {object} Energy economics breakdown
     */
    calculate(yearlyEnergyKwh, config) {
        // German household typical consumption patterns
        const consumptionPatterns = this.#getConsumptionPatterns();
        
        // Calculate energy distribution
        const energyDistribution = this.#calculateEnergyDistribution(
            yearlyEnergyKwh, consumptionPatterns
        );
        
        // Calculate financial benefits
        const financialBenefits = this.#calculateFinancialBenefits(
            energyDistribution, config
        );
        
        // Calculate efficiency metrics
        const efficiency = this.#calculateEfficiencyMetrics(
            yearlyEnergyKwh, financialBenefits
        );
        
        return {
            yearlyEnergyKwh,
            ...energyDistribution,
            ...financialBenefits,
            ...efficiency
        };
    }

    /**
     * Get typical German household consumption patterns
     * @returns {object} Consumption patterns
     */
    #getConsumptionPatterns() {
        return {
            selfConsumptionRate: 0.30, // 30% typical for German households
            feedInRate: 0.70,          // 70% fed into grid
            peakConsumptionHours: 6,   // Hours of peak consumption per day
            offPeakMultiplier: 0.4     // Off-peak consumption multiplier
        };
    }

    /**
     * Calculate how energy is distributed between self-consumption and feed-in
     * @param {number} yearlyEnergyKwh - Annual energy production
     * @param {object} patterns - Consumption patterns
     * @returns {object} Energy distribution
     */
    #calculateEnergyDistribution(yearlyEnergyKwh, patterns) {
        const selfConsumedEnergy = yearlyEnergyKwh * patterns.selfConsumptionRate;
        const feedInEnergy = yearlyEnergyKwh * patterns.feedInRate;
        
        return {
            selfConsumedEnergy: Math.round(selfConsumedEnergy),
            feedInEnergy: Math.round(feedInEnergy),
            selfConsumptionRate: patterns.selfConsumptionRate,
            feedInRate: patterns.feedInRate
        };
    }

    /**
     * Calculate financial benefits from energy production
     * @param {object} energyDistribution - Energy distribution data
     * @param {object} config - Configuration object
     * @returns {object} Financial benefits
     */
    #calculateFinancialBenefits(energyDistribution, config) {
        // Electricity savings from self-consumption
        const electricitySavings = energyDistribution.selfConsumedEnergy * 
            config.electricityPricePerKwh;
        
        // Income from feed-in tariff
        const feedInIncome = energyDistribution.feedInEnergy * 
            config.feedInTariffPerKwh;
        
        const totalAnnualSavings = electricitySavings + feedInIncome;
        
        return {
            electricitySavings: Math.round(electricitySavings),
            feedInIncome: Math.round(feedInIncome),
            totalAnnualSavings: Math.round(totalAnnualSavings)
        };
    }

    /**
     * Calculate energy efficiency metrics
     * @param {number} yearlyEnergyKwh - Annual energy production
     * @param {object} financialBenefits - Financial benefits data
     * @returns {object} Efficiency metrics
     */
    #calculateEfficiencyMetrics(yearlyEnergyKwh, financialBenefits) {
        const savingsPerKwh = financialBenefits.totalAnnualSavings / yearlyEnergyKwh;
        
        return {
            savingsPerKwh: Math.round(savingsPerKwh * 100) / 100
        };
    }

    /**
     * Calculate system efficiency based on German solar conditions
     * @param {number} yearlyEnergyKwh - Annual energy production
     * @param {number} systemPowerKw - System power in kW
     * @returns {number} System efficiency percentage
     */
    calculateSystemEfficiency(yearlyEnergyKwh, systemPowerKw) {
        const peakSunHours = 1000; // Average peak sun hours in Germany
        const maxPossibleEnergy = systemPowerKw * peakSunHours;
        return Math.round((yearlyEnergyKwh / maxPossibleEnergy) * 100 * 10) / 10;
    }
}
