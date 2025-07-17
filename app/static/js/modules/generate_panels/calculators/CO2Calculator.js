/**
 * CO2 Calculator for Solar Systems
 * Calculates environmental impact and carbon savings
 */
export class CO2Calculator {
    /**
     * Calculate comprehensive CO2 analysis
     * @param {number} yearlyEnergyKwh - Annual energy production in kWh
     * @param {object} config - Configuration object
     * @returns {object} CO2 analysis results
     */
    calculate(yearlyEnergyKwh, config) {
        const co2Config = config.co2;
        
        // Annual CO₂ avoided
        const annualCO2Avoided = yearlyEnergyKwh * co2Config.gridEmissionFactor / 1000; // tons
        
        // Lifetime CO₂ avoided (with degradation)
        const totalCO2Avoided = this.#calculateLifetimeCO2Avoided(
            yearlyEnergyKwh, config
        );
        
        // Carbon value calculations
        const carbonValues = this.#calculateCarbonValues(
            annualCO2Avoided, totalCO2Avoided, co2Config
        );
        
        // Equivalent metrics for visualization
        const equivalents = this.#calculateEquivalents(annualCO2Avoided);
        
        return {
            annualCO2AvoidedTons: Math.round(annualCO2Avoided * 100) / 100,
            totalCO2AvoidedTons: Math.round(totalCO2Avoided * 100) / 100,
            ...carbonValues,
            ...equivalents,
            co2PerKwh: Math.round(co2Config.gridEmissionFactor * 1000) / 1000
        };
    }

    /**
     * Calculate lifetime CO2 avoided with system degradation
     * @param {number} yearlyEnergyKwh - Annual energy production
     * @param {object} config - Configuration object
     * @returns {number} Total CO2 avoided over system lifetime
     */
    #calculateLifetimeCO2Avoided(yearlyEnergyKwh, config) {
        let totalCO2Avoided = 0;
        
        for (let year = 1; year <= config.financing.systemLifespan; year++) {
            const energyFactor = Math.pow(1 - config.financing.degradationRate, year - 1);
            const yearlyEnergy = yearlyEnergyKwh * energyFactor;
            totalCO2Avoided += yearlyEnergy * config.co2.gridEmissionFactor / 1000;
        }
        
        return totalCO2Avoided;
    }

    /**
     * Calculate carbon value using different pricing models
     * @param {number} annualCO2Avoided - Annual CO2 avoided in tons
     * @param {number} totalCO2Avoided - Total CO2 avoided in tons
     * @param {object} co2Config - CO2 configuration
     * @returns {object} Carbon value calculations
     */
    #calculateCarbonValues(annualCO2Avoided, totalCO2Avoided, co2Config) {
        const annualCarbonValue = annualCO2Avoided * co2Config.co2PricePerTon;
        const totalCarbonValue = totalCO2Avoided * co2Config.co2PricePerTon;
        const socialCarbonValue = totalCO2Avoided * co2Config.socialCostOfCarbon;
        
        return {
            annualCarbonValue: Math.round(annualCarbonValue),
            totalCarbonValue: Math.round(totalCarbonValue),
            socialCarbonValue: Math.round(socialCarbonValue)
        };
    }

    /**
     * Calculate equivalent metrics for easy understanding
     * @param {number} annualCO2Avoided - Annual CO2 avoided in tons
     * @returns {object} Equivalent metrics
     */
    #calculateEquivalents(annualCO2Avoided) {
        // Average car emits 4.6 tons CO₂/year
        const carsOffRoad = Math.round(annualCO2Avoided / 4.6);
        
        // Tree absorbs ~25kg CO₂/year
        const treesEquivalent = Math.round(annualCO2Avoided / 0.025);
        
        return {
            equivalentCarsOffRoad: carsOffRoad,
            equivalentTreesPlanted: treesEquivalent
        };
    }
}
