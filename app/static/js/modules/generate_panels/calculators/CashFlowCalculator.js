/**
 * Cash Flow Calculator for Solar Systems
 * Calculates year-by-year cash flow analysis with inflation and degradation
 */
export class CashFlowCalculator {
    /**
     * Calculate detailed cash flow analysis
     * @param {object} systemCosts - System cost data
     * @param {object} energyEconomics - Energy economics data
     * @param {object} subsidies - Subsidy data
     * @param {object} config - Configuration object
     * @returns {Array} Annual cash flow data
     */
    calculate(systemCosts, energyEconomics, subsidies, config) {
        const cashFlow = [];
        let cumulativeCashFlow = -subsidies.netSystemCost;
        
        // Year 0 - Initial investment
        cashFlow.push(this.#createInitialYear(subsidies.netSystemCost, cumulativeCashFlow));
        
        // Years 1 through system lifespan
        for (let year = 1; year <= config.financing.systemLifespan; year++) {
            const yearData = this.#calculateYearlyData(year, energyEconomics, config);
            cumulativeCashFlow += yearData.netCashFlow;
            
            cashFlow.push({
                ...yearData,
                cumulativeCashFlow: Math.round(cumulativeCashFlow)
            });
        }
        
        return cashFlow;
    }

    /**
     * Create initial year (Year 0) cash flow entry
     * @param {number} netSystemCost - Net system cost after subsidies
     * @param {number} cumulativeCashFlow - Starting cumulative cash flow
     * @returns {object} Year 0 cash flow data
     */
    #createInitialYear(netSystemCost, cumulativeCashFlow) {
        return {
            year: 0,
            energyProduction: 0,
            energySavings: 0,
            maintenance: 0,
            netCashFlow: -netSystemCost,
            cumulativeCashFlow: cumulativeCashFlow
        };
    }

    /**
     * Calculate cash flow data for a specific year
     * @param {number} year - Year number
     * @param {object} energyEconomics - Energy economics data
     * @param {object} config - Configuration object
     * @returns {object} Yearly cash flow data
     */
    #calculateYearlyData(year, energyEconomics, config) {
        // Energy production with degradation
        const energyProduction = this.#calculateDegradedEnergy(
            year, energyEconomics.yearlyEnergyKwh, config
        );
        
        // Energy savings with inflation
        const energySavings = this.#calculateInflatedSavings(
            year, energyProduction, config
        );
        
        // Maintenance costs with inflation
        const maintenance = this.#calculateInflatedMaintenance(year, config);
        
        const netCashFlow = energySavings - maintenance;
        
        return {
            year,
            energyProduction: Math.round(energyProduction),
            energySavings: Math.round(energySavings),
            maintenance: Math.round(maintenance),
            netCashFlow: Math.round(netCashFlow)
        };
    }

    /**
     * Calculate energy production with degradation factor
     * @param {number} year - Year number
     * @param {number} baseEnergyKwh - Base annual energy production
     * @param {object} config - Configuration object
     * @returns {number} Degraded energy production
     */
    #calculateDegradedEnergy(year, baseEnergyKwh, config) {
        const energyFactor = Math.pow(1 - config.financing.degradationRate, year - 1);
        return baseEnergyKwh * energyFactor;
    }

    /**
     * Calculate energy savings with inflated electricity prices
     * @param {number} year - Year number
     * @param {number} energyProduction - Energy production for the year
     * @param {object} config - Configuration object
     * @returns {number} Energy savings with inflation
     */
    #calculateInflatedSavings(year, energyProduction, config) {
        // Inflated electricity prices
        const electricityPrice = config.electricityPricePerKwh * 
            Math.pow(1 + config.financing.electricityInflation, year);
        
        // Feed-in tariff remains fixed for 20 years in Germany
        const feedInPrice = config.feedInTariffPerKwh;
        
        // Energy distribution (30% self-consumed, 70% fed-in)
        const selfConsumed = energyProduction * 0.30;
        const feedIn = energyProduction * 0.70;
        
        return (selfConsumed * electricityPrice) + (feedIn * feedInPrice);
    }

    /**
     * Calculate maintenance costs with inflation
     * @param {number} year - Year number
     * @param {object} config - Configuration object
     * @returns {number} Inflated maintenance costs
     */
    #calculateInflatedMaintenance(year, config) {
        const baseMaintenance = config.financing.maintenanceCostPerYear + 
            config.financing.insuranceCostPerYear;
        
        return baseMaintenance * Math.pow(1 + config.financing.inflationRate, year);
    }

    /**
     * Get cash flow summary statistics
     * @param {Array} cashFlow - Cash flow array
     * @returns {object} Summary statistics
     */
    getSummary(cashFlow) {
        const operationalYears = cashFlow.filter(year => year.year > 0);
        
        const totalEnergySavings = operationalYears.reduce(
            (sum, year) => sum + year.energySavings, 0
        );
        
        const totalMaintenance = operationalYears.reduce(
            (sum, year) => sum + year.maintenance, 0
        );
        
        const finalCumulativeCashFlow = cashFlow[cashFlow.length - 1].cumulativeCashFlow;
        
        const paybackYear = cashFlow.find(year => year.cumulativeCashFlow >= 0)?.year || null;
        
        return {
            totalEnergySavings: Math.round(totalEnergySavings),
            totalMaintenance: Math.round(totalMaintenance),
            finalCumulativeCashFlow: Math.round(finalCumulativeCashFlow),
            paybackYear,
            averageAnnualSavings: Math.round(totalEnergySavings / operationalYears.length)
        };
    }
}
