'use client'

import { useState, useMemo } from 'react'
import styles from './FinancialCalculator.module.css'
import type { FinancialInputs } from '@/types/financial'
import type { ReportData } from '@/types/report'
import { calculateFinancials, estimateSystemCost } from '@/utils/financialCalculations'
import { generateSolarReport, downloadPDF } from '@/utils/pdfGenerator'
import { validateGermanProduction } from '@/utils/germanSolarCalculations'

interface FinancialCalculatorProps {
  annualProduction: number // kWh/year
  systemSize: number // kW
  panelCount?: number
  panelWattage?: number
  onClose?: () => void
}

export default function FinancialCalculator({
  annualProduction,
  systemSize,
  panelCount,
  panelWattage = 400,
  onClose
}: FinancialCalculatorProps) {
  // User inputs with German market defaults
  const [costPerKwh, setCostPerKwh] = useState(0.37) // €/kWh German average
  const [avgMonthlyBill, setAvgMonthlyBill] = useState(130) // € typical German household
  const [escalationRate, setEscalationRate] = useState(4) // % German average
  const [systemCostInput, setSystemCostInput] = useState(estimateSystemCost(systemSize))
  const [feedInTariff, setFeedInTariff] = useState(0.1623) // €/kWh - FIT April 2025 rate (16.23p/kWh)
  const [selfConsumptionRate, setSelfConsumptionRate] = useState(30) // %
  const [stateGrant, setStateGrant] = useState(0) // € State grant
  const [municipalGrant, setMunicipalGrant] = useState(0) // € Municipal grant
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Calculate financials
  const financialInputs: FinancialInputs = useMemo(() => ({
    annualProduction,
    systemSize,
    utilityRates: {
      costPerKwh,
      avgMonthlyBill,
      escalationRate,
      feedInTariff
    },
    systemCost: {
      totalCost: systemCostInput,
      pricePerWatt: systemCostInput / (systemSize * 1000)
    },
    incentives: {
      vatReduction: systemSize <= 30 ? 19 : 0, // 0% VAT for systems ≤30kWp
      stateGrant,
      municipalGrant
    },
    selfConsumptionRate
  }), [annualProduction, systemSize, costPerKwh, avgMonthlyBill, escalationRate, systemCostInput, feedInTariff, selfConsumptionRate, stateGrant, municipalGrant])

  const results = useMemo(() => calculateFinancials(financialInputs), [financialInputs])

  // VAT savings for display
  const vatSavings = systemSize <= 30 ? systemCostInput * 0.19 : 0

  // Validate production for German conditions
  const productionValidation = useMemo(
    () => validateGermanProduction(systemSize, annualProduction),
    [systemSize, annualProduction]
  )

  // Generate PDF report
  const handleGeneratePDF = () => {
    const reportData: ReportData = {
      systemSpecs: {
        panelCount: panelCount || Math.round(systemSize * 2.5), // Estimate if not provided
        systemSize,
        panelWattage,
        annualProduction,
      },
      financials: results,
      electricityRate: costPerKwh,
      monthlyBill: avgMonthlyBill,
      feedInTariff,
      selfConsumptionRate,
      systemCost: systemCostInput,
    }

    const doc = generateSolarReport(reportData, {
      includeFinancials: true,
      includeSystemSpecs: true,
      includeEnvironmental: true,
    })

    downloadPDF(doc, `solar-proposal-${systemSize}kW-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Financial Analysis</h3>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className={styles.scrollableContent}>
        {/* Key Metrics */}
        <div className={styles.keyMetrics}>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>Payback Period</div>
          <div className={styles.metricValue}>{results.paybackPeriod} years</div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>25-Year Savings</div>
          <div className={`${styles.metricValue} ${styles.savings}`}>
            €{results.twentyFiveYearSavings.toLocaleString()}
          </div>
        </div>
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>ROI</div>
          <div className={`${styles.metricValue} ${styles.roi}`}>{results.roi}%</div>
        </div>
      </div>

      {/* Energy Offset & Usage Comparison */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Energy Offset & Usage</h4>
        <div className={styles.energyOffset}>
          <div className={styles.offsetCircle}>
            <svg className={styles.offsetSvg} viewBox="0 0 200 200">
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="rgba(255, 255, 255, 0.1)"
                strokeWidth="20"
              />
              <circle
                cx="100"
                cy="100"
                r="85"
                fill="none"
                stroke="#4caf50"
                strokeWidth="20"
                strokeDasharray={`${(results.energyOffsetPercentage / 100) * 534.07} 534.07`}
                strokeLinecap="round"
                transform="rotate(-90 100 100)"
              />
              <text
                x="100"
                y="95"
                textAnchor="middle"
                fill="rgba(255, 255, 255, 0.95)"
                fontSize="36"
                fontWeight="bold"
              >
                {results.energyOffsetPercentage}%
              </text>
              <text
                x="100"
                y="115"
                textAnchor="middle"
                fill="rgba(255, 255, 255, 0.6)"
                fontSize="14"
              >
                Energy Offset
              </text>
            </svg>
          </div>
          <div className={styles.offsetDetails}>
            <div className={styles.offsetItem}>
              <span className={styles.offsetLabel}>Annual Household Usage</span>
              <span className={styles.offsetValue}>
                {Math.round((avgMonthlyBill * 12) / costPerKwh).toLocaleString()} kWh
              </span>
            </div>
            <div className={styles.offsetItem}>
              <span className={styles.offsetLabel}>Solar Production</span>
              <span className={styles.offsetValue}>
                {annualProduction.toLocaleString()} kWh
              </span>
            </div>
            <div className={styles.offsetItem}>
              <span className={styles.offsetLabel}>Self-Consumed</span>
              <span className={styles.offsetValue}>
                {results.selfConsumptionAmount.toLocaleString()} kWh ({selfConsumptionRate}%)
              </span>
            </div>
            <div className={styles.offsetItem}>
              <span className={styles.offsetLabel}>Grid Feed-in</span>
              <span className={styles.offsetValue}>
                {results.gridFeedInAmount.toLocaleString()} kWh ({100 - selfConsumptionRate}%)
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Monthly Comparison */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Monthly Bill Comparison</h4>
        <div className={styles.billComparison}>
          <div className={styles.billItem}>
            <span className={styles.billLabel}>Before Solar</span>
            <span className={styles.billValue}>€{results.avgMonthlyBillBefore}</span>
          </div>
          <div className={styles.billArrow}>→</div>
          <div className={styles.billItem}>
            <span className={styles.billLabel}>With Solar</span>
            <span className={`${styles.billValue} ${styles.billAfter}`}>
              €{results.avgMonthlyBillAfter}
            </span>
          </div>
          <div className={styles.billSavings}>
            Save €{results.avgMonthlySavings}/month
            {results.avgMonthlyFeedInRevenue > 0 && (
              <span className={styles.feedInHint}>
                + €{results.avgMonthlyFeedInRevenue} feed-in revenue
              </span>
            )}
          </div>
        </div>
      </div>

      {/* System Costs */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>System Costs</h4>
        <div className={styles.costBreakdown}>
          <div className={styles.costItem}>
            <span className={styles.costLabel}>Gross System Cost</span>
            <span className={styles.costValue}>€{results.grossSystemCost.toLocaleString()}</span>
          </div>
          {vatSavings > 0 && (
            <div className={styles.costItem}>
              <span className={styles.costLabel}>VAT Savings (19%)</span>
              <span className={`${styles.costValue} ${styles.incentive}`}>
                -€{vatSavings.toLocaleString()}
              </span>
            </div>
          )}
          {stateGrant > 0 && (
            <div className={styles.costItem}>
              <span className={styles.costLabel}>State Grant</span>
              <span className={`${styles.costValue} ${styles.incentive}`}>
                -€{stateGrant.toLocaleString()}
              </span>
            </div>
          )}
          {municipalGrant > 0 && (
            <div className={styles.costItem}>
              <span className={styles.costLabel}>Municipal Grant</span>
              <span className={`${styles.costValue} ${styles.incentive}`}>
                -€{municipalGrant.toLocaleString()}
              </span>
            </div>
          )}
          <div className={`${styles.costItem} ${styles.netCost}`}>
            <span className={styles.costLabel}>Net System Cost</span>
            <span className={styles.costValue}>€{results.netSystemCost.toLocaleString()}</span>
          </div>
          <div className={styles.costMeta}>
            €{results.effectiveCostPerWatt.toFixed(2)}/watt after incentives
          </div>
        </div>
      </div>

      {/* Energy & Environmental */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Energy & Environmental Impact</h4>
        <div className={styles.impactGrid}>
          <div className={styles.impactItem}>
            <div className={styles.impactValue}>{results.energyOffsetPercentage}%</div>
            <div className={styles.impactLabel}>Self-Consumption</div>
          </div>
          <div className={styles.impactItem}>
            <div className={styles.impactValue}>{results.lifetimeCO2Offset}</div>
            <div className={styles.impactLabel}>Tons CO₂ Offset</div>
          </div>
          <div className={styles.impactItem}>
            <div className={styles.impactValue}>{results.selfConsumptionAmount.toLocaleString()}</div>
            <div className={styles.impactLabel}>kWh Self-Used</div>
          </div>
        </div>
      </div>

      {/* Feed-in Revenue */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>Feed-in Tariff Revenue</h4>
        <div className={styles.feedInInfo}>
          <div className={styles.feedInRow}>
            <span className={styles.feedInLabel}>Grid Feed-in per Year</span>
            <span className={styles.feedInValue}>{results.gridFeedInAmount.toLocaleString()} kWh</span>
          </div>
          <div className={styles.feedInRow}>
            <span className={styles.feedInLabel}>Tariff Rate ({(feedInTariff * 100).toFixed(1)} ct/kWh)</span>
            <span className={styles.feedInValue}>€{results.firstYearFeedInRevenue} / year</span>
          </div>
          <div className={styles.feedInRow}>
            <span className={styles.feedInLabel}>25-Year Feed-in Revenue</span>
            <span className={`${styles.feedInValue} ${styles.feedInHighlight}`}>
              €{results.twentyFiveYearFeedInRevenue.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Input Controls */}
      <div className={styles.controls}>
        <button
          className={styles.toggleButton}
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '▼' : '▶'} Adjust Assumptions
        </button>

        {showAdvanced && (
          <div className={styles.inputs}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Electricity Rate (€/kWh)
                <input
                  type="number"
                  className={styles.input}
                  value={costPerKwh}
                  onChange={(e) => setCostPerKwh(parseFloat(e.target.value) || 0)}
                  step="0.01"
                  min="0"
                />
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Current Monthly Bill (€)
                <input
                  type="number"
                  className={styles.input}
                  value={avgMonthlyBill}
                  onChange={(e) => setAvgMonthlyBill(parseFloat(e.target.value) || 0)}
                  step="10"
                  min="0"
                />
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Rate Escalation (%/year)
                <input
                  type="number"
                  className={styles.input}
                  value={escalationRate}
                  onChange={(e) => setEscalationRate(parseFloat(e.target.value) || 0)}
                  step="0.5"
                  min="0"
                  max="10"
                />
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                System Cost (€)
                <input
                  type="number"
                  className={styles.input}
                  value={systemCostInput}
                  onChange={(e) => setSystemCostInput(parseFloat(e.target.value) || 0)}
                  step="100"
                  min="0"
                />
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Feed-in Tariff (€/kWh)
                <input
                  type="number"
                  className={styles.input}
                  value={feedInTariff}
                  onChange={(e) => setFeedInTariff(parseFloat(e.target.value) || 0)}
                  step="0.001"
                  min="0"
                />
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Self-Consumption Rate (%)
                <input
                  type="number"
                  className={styles.input}
                  value={selfConsumptionRate}
                  onChange={(e) => setSelfConsumptionRate(parseFloat(e.target.value) || 0)}
                  step="5"
                  min="0"
                  max="100"
                />
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                State Grant (€)
                <input
                  type="number"
                  className={styles.input}
                  value={stateGrant}
                  onChange={(e) => setStateGrant(parseFloat(e.target.value) || 0)}
                  step="100"
                  min="0"
                />
              </label>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Municipal Grant (€)
                <input
                  type="number"
                  className={styles.input}
                  value={municipalGrant}
                  onChange={(e) => setMunicipalGrant(parseFloat(e.target.value) || 0)}
                  step="100"
                  min="0"
                />
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Production Validation Warning */}
      {!productionValidation.isRealistic && (
        <div className={styles.warningBox}>
          <div className={styles.warningIcon}>⚠️</div>
          <div className={styles.warningContent}>
            <div className={styles.warningTitle}>Production Estimate Notice</div>
            <p className={styles.warningText}>
              {productionValidation.message}
            </p>
            <p className={styles.warningText}>
              <strong>Typical German range for {systemSize.toFixed(1)}kW system:</strong>{' '}
              {productionValidation.expectedRange.min.toLocaleString()} -{' '}
              {productionValidation.expectedRange.max.toLocaleString()} kWh/year
              <br />
              <small>(Based on 850-1,050 full load hours, ~10% capacity factor)</small>
            </p>
          </div>
        </div>
      )}

      {/* Disclaimer */}
      <div className={styles.disclaimer}>
        <p>
          * Estimates based on {systemSize.toFixed(1)}kW system producing{' '}
          {annualProduction.toLocaleString()} kWh/year. Actual savings may vary based on usage,
          utility rates, and system performance. {systemSize <= 30 &&
          '0% VAT applies to systems ≤30kWp (since Jan 2023).'}
          {' '}Typical German solar systems achieve 850-1,050 full load hours annually (~10% capacity factor).
        </p>
      </div>
      </div>

      {/* Export Button - Fixed at bottom */}
      <div className={styles.exportSection}>
        <button
          className={styles.exportButton}
          onClick={handleGeneratePDF}
        >
          📄 Download PDF Report
        </button>
      </div>
    </div>
  )
}
