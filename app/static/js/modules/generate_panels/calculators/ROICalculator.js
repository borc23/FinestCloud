/**
 * ROI Calculator for Solar Systems
 * Calculates NPV, IRR, payback periods, and lifetime savings
 */
export class ROICalculator {
    /**
     * Calculate comprehensive ROI analysis
     * @param {object} systemCosts - System cost breakdown
     * @param {object} energyEconomics - Energy economics data
     * @param {object} subsidies - Subsidy data
     * @param {object} config - Configuration object
     * @returns {object} ROI analysis
     */
    calculate(systemCosts, energyEconomics, subsidies, config) {
        const netCost = subsidies.netSystemCost;
        const annualSavings = energyEconomics.totalAnnualSavings;
        const annualCosts = config.financing.maintenanceCostPerYear + config.financing.insuranceCostPerYear;
        const netAnnualBenefit = annualSavings - annualCosts;
        
        // Guard against invalid calculations
        if (!this.#isValidCost(netCost) || !this.#isValidBenefit(netAnnualBenefit)) {
            return this.#getDefaultROI();
        }
        
        // Simple payback period
        const simplePaybackYears = netCost / netAnnualBenefit;
        
        // NPV and cash flow calculations
        const { npv, paybackYear, cumulativeCashFlow } = this.#calculateNPV(
            netCost, energyEconomics, config
        );
        
        // IRR calculation
        const irr = this.#calculateIRR(netCost, netAnnualBenefit, config.financing.systemLifespan);
        
        // Lifetime savings calculations
        const totalLifetimeSavings = npv + netCost;
        const totalNominalSavings = cumulativeCashFlow + netCost;
        
        // ROI calculations
        const npvBasedROI = ((totalLifetimeSavings - netCost) / netCost) * 100;
        const nominalROI = ((totalNominalSavings - netCost) / netCost) * 100;
        
        return {
            simplePaybackYears: Math.round(simplePaybackYears * 10) / 10,
            discountedPaybackYears: paybackYear || config.financing.systemLifespan,
            npv: Math.round(npv),
            irr: Math.round(irr * 100 * 10) / 10,
            roi: Math.round(nominalROI * 10) / 10, // Display nominal ROI (industry standard)
            roiNpvBased: Math.round(npvBasedROI * 10) / 10,
            roiNominal: Math.round(nominalROI * 10) / 10,
            totalLifetimeSavings: Math.round(totalLifetimeSavings),
            totalNominalSavings: Math.round(totalNominalSavings),
            annualROI: Math.round((netAnnualBenefit / netCost) * 100 * 10) / 10,
            profitabilityIndex: Math.round(((npv + netCost) / netCost) * 100) / 100
        };
    }

    /**
     * Calculate Net Present Value and payback period
     * @param {number} netCost - Net system cost after subsidies
     * @param {object} energyEconomics - Energy economics data
     * @param {object} config - Configuration object
     * @returns {object} NPV analysis results
     */
    #calculateNPV(netCost, energyEconomics, config) {
        let npv = -netCost;
        let cumulativeCashFlow = -netCost;
        let paybackYear = null;
        
        for (let year = 1; year <= config.financing.systemLifespan; year++) {
            const netYearlyBenefit = this.#calculateYearlyBenefit(year, energyEconomics, config);
            
            // Discount to present value
            const discountFactor = Math.pow(1 + config.financing.interestRate, year);
            const presentValue = netYearlyBenefit / discountFactor;
            
            npv += presentValue;
            cumulativeCashFlow += netYearlyBenefit;
            
            // Find payback year
            if (paybackYear === null && cumulativeCashFlow >= 0) {
                paybackYear = year;
            }
        }
        
        return { npv, paybackYear, cumulativeCashFlow };
    }

    /**
     * Calculate yearly benefit considering degradation and inflation
     * @param {number} year - Year number
     * @param {object} energyEconomics - Energy economics data
     * @param {object} config - Configuration object
     * @returns {number} Net yearly benefit
     */
    #calculateYearlyBenefit(year, energyEconomics, config) {
        // Degraded energy production
        const energyFactor = Math.pow(1 - config.financing.degradationRate, year - 1);
        const yearlyEnergy = energyEconomics.yearlyEnergyKwh * energyFactor;
        
        // Inflated electricity prices
        const electricityPrice = config.electricityPricePerKwh * 
            Math.pow(1 + config.financing.electricityInflation, year);
        const feedInPrice = config.feedInTariffPerKwh; // Fixed for 20 years in Germany
        
        // Annual benefits with inflation
        const selfConsumed = yearlyEnergy * 0.30;
        const feedIn = yearlyEnergy * 0.70;
        const yearlyBenefit = (selfConsumed * electricityPrice) + (feedIn * feedInPrice);
        
        // Annual costs with inflation
        const yearlyMaintenanceCost = config.financing.maintenanceCostPerYear * 
            Math.pow(1 + config.financing.inflationRate, year);
        const yearlyInsuranceCost = config.financing.insuranceCostPerYear * 
            Math.pow(1 + config.financing.inflationRate, year);
        const totalYearlyCosts = yearlyMaintenanceCost + yearlyInsuranceCost;
        
        return yearlyBenefit - totalYearlyCosts;
    }

    /**
     * Calculate Internal Rate of Return (IRR)
     * @param {number} initialInvestment - Initial investment amount
     * @param {number} annualBenefit - Annual benefit
     * @param {number} years - Number of years
     * @returns {number} IRR as decimal
     */
    #calculateIRR(initialInvestment, annualBenefit, years) {
        let rate = 0.1; // Start with 10%
        const precision = 0.001;
        const maxIterations = 100;
        
        for (let i = 0; i < maxIterations; i++) {
            let npv = -initialInvestment;
            for (let year = 1; year <= years; year++) {
                npv += annualBenefit / Math.pow(1 + rate, year);
            }
            
            if (Math.abs(npv) < precision) {
                return rate;
            }
            
            if (npv > 0) {
                rate += 0.001;
            } else {
                rate -= 0.001;
            }
            
            if (rate <= 0) return 0;
        }
        
        return rate;
    }

    /**
     * Validate if cost is valid for calculations
     * @param {number} cost - Cost value to validate
     * @returns {boolean} True if valid
     */
    #isValidCost(cost) {
        return cost && cost > 0 && !isNaN(cost);
    }

    /**
     * Validate if benefit is valid for calculations
     * @param {number} benefit - Benefit value to validate
     * @returns {boolean} True if valid
     */
    #isValidBenefit(benefit) {
        return benefit && benefit > 0 && !isNaN(benefit);
    }

    /**
     * Return default ROI values when calculations fail
     * @returns {object} Default ROI values
     */
    #getDefaultROI() {
        return {
            simplePaybackYears: 0,
            discountedPaybackYears: 0,
            npv: 0,
            irr: 0,
            roi: 0,
            roiNpvBased: 0,
            roiNominal: 0,
            totalLifetimeSavings: 0,
            totalNominalSavings: 0,
            annualROI: 0,
            profitabilityIndex: 0
        };
    }
}
