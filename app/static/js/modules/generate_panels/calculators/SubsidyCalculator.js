/**
 * Subsidy Calculator for German Solar Systems
 * Handles KfW, regional, and VAT subsidies
 */
export class SubsidyCalculator {
    /**
     * Calculate all available subsidies
     * @param {number} totalCost - Total system cost
     * @param {number} systemPowerKw - System power in kW
     * @param {object} config - Configuration object
     * @returns {object} Subsidy breakdown
     */
    calculate(totalCost, systemPowerKw, config) {
        const subsidies = config.subsidies;
        
        // KfW subsidy (capped)
        const kfwAmount = Math.min(totalCost * subsidies.kfwSubsidy, subsidies.maxKfwAmount);
        
        // Regional subsidy (varies by Bundesland)
        const regionalAmount = totalCost * subsidies.regionalSubsidy;
        
        // VAT reduction (already applied in cost calculation)
        const vatSavings = totalCost * subsidies.vatReduction;
        
        const totalSubsidies = kfwAmount + regionalAmount + vatSavings;
        const netCost = totalCost - totalSubsidies;
        
        return {
            kfwSubsidy: Math.round(kfwAmount),
            regionalSubsidy: Math.round(regionalAmount),
            vatSavings: Math.round(vatSavings),
            totalSubsidies: Math.round(totalSubsidies),
            netSystemCost: Math.round(netCost),
            subsidyRate: Math.round((totalSubsidies / totalCost) * 100)
        };
    }
}
