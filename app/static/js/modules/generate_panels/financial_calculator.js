import { GermanSolarConfig } from './configs/GermanSolarConfig.js';
import { SubsidyCalculator } from './calculators/SubsidyCalculator.js';
import { ROICalculator } from './calculators/ROICalculator.js';
import { CO2Calculator } from './calculators/CO2Calculator.js';
import { SystemCostCalculator } from './calculators/SystemCostCalculator.js';
import { EnergyEconomicsCalculator } from './calculators/EnergyEconomicsCalculator.js';
import { CashFlowCalculator } from './calculators/CashFlowCalculator.js';
import { AnalysisSummaryGenerator } from './calculators/AnalysisSummaryGenerator.js';

/**
 * German Solar Financial Calculator
 * Refactored with modular calculator classes for improved maintainability
 * Based on German solar market conditions and regulations (2025)
 */
export class FinancialCalculator {
    constructor(customConfig = {}) {
        // Initialize configuration
        this.config = new GermanSolarConfig(customConfig);
        
        // Initialize calculator services
        this.subsidyCalc = new SubsidyCalculator();
        this.roiCalc = new ROICalculator();
        this.co2Calc = new CO2Calculator();
        this.systemCostCalc = new SystemCostCalculator();
        this.energyEconomicsCalc = new EnergyEconomicsCalculator();
        this.cashFlowCalc = new CashFlowCalculator();
        this.summaryGenerator = new AnalysisSummaryGenerator();
    }    /**
     * Calculate comprehensive financial analysis
     * @param {number} panelCount - Number of panels
     * @param {number} yearlyEnergyKwh - Annual energy production in kWh
     * @param {number} systemPowerKw - System power in kW
     * @param {object} userConfig - User-specific configuration
     * @returns {object} Complete financial analysis
     */
    calculateFinancialAnalysis(panelCount, yearlyEnergyKwh, systemPowerKw, userConfig = {}) {
        // Merge user configuration with defaults
        const config = this.config.merge(userConfig).getAll();
        
        // Calculate all components using specialized calculators
        const systemCosts = this.systemCostCalc.calculate(systemPowerKw, config);
        const energyEconomics = this.energyEconomicsCalc.calculate(yearlyEnergyKwh, config);
        const subsidies = this.subsidyCalc.calculate(systemCosts.totalCost, systemPowerKw, config);
        const roi = this.roiCalc.calculate(systemCosts, energyEconomics, subsidies, config);
        const co2Analysis = this.co2Calc.calculate(yearlyEnergyKwh, config);
        const cashFlow = this.cashFlowCalc.calculate(systemCosts, energyEconomics, subsidies, config);
        const summary = this.summaryGenerator.generate(systemCosts, roi, co2Analysis, subsidies);
        
        return {
            systemInfo: {
                panelCount,
                yearlyEnergyKwh,
                systemPowerKw,
                systemEfficiency: this.energyEconomicsCalc.calculateSystemEfficiency(yearlyEnergyKwh, systemPowerKw)
            },
            costs: systemCosts,
            energy: energyEconomics,
            subsidies,
            roi,
            co2: co2Analysis,   
            cashFlow,
            summary
        };
    }

    /**
     * Update configuration
     * @param {object} newConfig - New configuration values
     */
    updateConfig(newConfig) {
        this.config.merge(newConfig);
    }

    /**
     * Get current configuration
     * @returns {object} Current configuration
     */
    getConfig() {
        return this.config.getAll();
    }
}