/**
 * Analysis Summary Generator
 * Generates investment recommendations and summaries based on financial analysis
 */
export class AnalysisSummaryGenerator {
    /**
     * Generate comprehensive analysis summary
     * @param {object} systemCosts - System cost data
     * @param {object} roi - ROI analysis data
     * @param {object} co2Analysis - CO2 analysis data
     * @param {object} subsidies - Subsidy data
     * @returns {object} Analysis summary
     */
    generate(systemCosts, roi, co2Analysis, subsidies) {
        const recommendation = this.#determineRecommendation(roi, subsidies);
        const reasoning = this.#buildReasoning(roi, subsidies);
        const keyMetrics = this.#extractKeyMetrics(roi, co2Analysis);
        const riskAssessment = this.#assessRisks(roi, systemCosts);
        
        return {
            recommendation,
            reasoning: reasoning.join(", "),
            keyMetrics,
            riskAssessment,
            investmentGrade: this.#calculateInvestmentGrade(roi, subsidies),
            confidenceLevel: this.#calculateConfidenceLevel(roi)
        };
    }

    /**
     * Determine overall investment recommendation
     * @param {object} roi - ROI analysis data
     * @param {object} subsidies - Subsidy data
     * @returns {string} Recommendation level
     */
    #determineRecommendation(roi, subsidies) {
        const score = this.#calculateRecommendationScore(roi, subsidies);
        
        if (score >= 8) return "excellent";
        if (score >= 6) return "good";
        if (score >= 4) return "fair";
        return "poor";
    }

    /**
     * Calculate numerical recommendation score
     * @param {object} roi - ROI analysis data
     * @param {object} subsidies - Subsidy data
     * @returns {number} Score from 0-10
     */
    #calculateRecommendationScore(roi, subsidies) {
        let score = 0;
        
        // Payback period scoring (0-3 points)
        if (roi.simplePaybackYears <= 6) score += 3;
        else if (roi.simplePaybackYears <= 8) score += 2.5;
        else if (roi.simplePaybackYears <= 10) score += 2;
        else if (roi.simplePaybackYears <= 12) score += 1;
        
        // IRR scoring (0-3 points)
        if (roi.irr >= 10) score += 3;
        else if (roi.irr >= 8) score += 2.5;
        else if (roi.irr >= 6) score += 2;
        else if (roi.irr >= 4) score += 1;
        
        // ROI scoring (0-2 points)
        if (roi.roi >= 200) score += 2;
        else if (roi.roi >= 150) score += 1.5;
        else if (roi.roi >= 100) score += 1;
        
        // Subsidy scoring (0-2 points)
        if (subsidies.subsidyRate >= 20) score += 2;
        else if (subsidies.subsidyRate >= 15) score += 1.5;
        else if (subsidies.subsidyRate >= 10) score += 1;
        
        return Math.min(score, 10);
    }

    /**
     * Build reasoning array for recommendation
     * @param {object} roi - ROI analysis data
     * @param {object} subsidies - Subsidy data
     * @returns {Array} Array of reasoning strings
     */
    #buildReasoning(roi, subsidies) {
        const reasoning = [];
        
        // Payback analysis
        if (roi.simplePaybackYears <= 8) {
            reasoning.push("Kurze Amortisationszeit");
        } else if (roi.simplePaybackYears <= 12) {
            reasoning.push("Gute Amortisationszeit");
        } else {
            reasoning.push("Längere Amortisationszeit");
        }
        
        // IRR analysis
        if (roi.irr >= 8) {
            reasoning.push("Hohe Rendite");
        } else if (roi.irr >= 5) {
            reasoning.push("Solide Rendite");
        } else {
            reasoning.push("Moderate Rendite");
        }
        
        // Subsidy impact
        if (subsidies.subsidyRate >= 15) {
            reasoning.push("Hohe Förderung verfügbar");
        } else if (subsidies.subsidyRate >= 10) {
            reasoning.push("Gute Förderung verfügbar");
        }
        
        // NPV assessment
        if (roi.npv > 0) {
            reasoning.push("Positive Kapitalrendite");
        }
        
        return reasoning;
    }

    /**
     * Extract key metrics for summary display
     * @param {object} roi - ROI analysis data
     * @param {object} co2Analysis - CO2 analysis data
     * @returns {object} Key metrics
     */
    #extractKeyMetrics(roi, co2Analysis) {
        return {
            paybackYears: roi.simplePaybackYears,
            irr: roi.irr,
            totalLifetimeSavings: roi.totalLifetimeSavings,
            co2Savings: co2Analysis.totalCO2AvoidedTons,
            roiPercentage: roi.roi
        };
    }

    /**
     * Assess investment risks
     * @param {object} roi - ROI analysis data
     * @param {object} systemCosts - System cost data
     * @returns {object} Risk assessment
     */
    #assessRisks(roi, systemCosts) {
        const risks = [];
        const mitigations = [];
        
        // Payback period risk
        if (roi.simplePaybackYears > 12) {
            risks.push("Lange Amortisationszeit");
            mitigations.push("Prüfung zusätzlicher Förderungen");
        }
        
        // IRR risk
        if (roi.irr < 5) {
            risks.push("Niedrige Rendite");
            mitigations.push("Optimierung des Eigenverbrauchs");
        }
        
        // System cost risk
        if (systemCosts.costPerWatt > 2.0) {
            risks.push("Hohe Systemkosten");
            mitigations.push("Vergleich von Angeboten");
        }
        
        const riskLevel = this.#calculateRiskLevel(risks.length);
        
        return {
            level: riskLevel,
            risks,
            mitigations,
            riskScore: risks.length
        };
    }

    /**
     * Calculate overall risk level
     * @param {number} riskCount - Number of identified risks
     * @returns {string} Risk level
     */
    #calculateRiskLevel(riskCount) {
        if (riskCount === 0) return "niedrig";
        if (riskCount <= 1) return "moderat";
        return "hoch";
    }

    /**
     * Calculate investment grade
     * @param {object} roi - ROI analysis data
     * @param {object} subsidies - Subsidy data
     * @returns {string} Investment grade (A+ to D)
     */
    #calculateInvestmentGrade(roi, subsidies) {
        const score = this.#calculateRecommendationScore(roi, subsidies);
        
        if (score >= 9) return "A+";
        if (score >= 8) return "A";
        if (score >= 7) return "B+";
        if (score >= 6) return "B";
        if (score >= 5) return "C+";
        if (score >= 4) return "C";
        if (score >= 3) return "D+";
        return "D";
    }

    /**
     * Calculate confidence level in the analysis
     * @param {object} roi - ROI analysis data
     * @returns {string} Confidence level
     */
    #calculateConfidenceLevel(roi) {
        // Base confidence on consistency between different ROI metrics
        const metrics = [roi.simplePaybackYears, roi.irr, roi.roi];
        const validMetrics = metrics.filter(m => m > 0 && !isNaN(m));
        
        if (validMetrics.length === metrics.length && roi.npv > 0) {
            return "hoch";
        } else if (validMetrics.length >= 2) {
            return "mittel";
        } else {
            return "niedrig";
        }
    }
}
