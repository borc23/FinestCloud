'use client'

import { useState, useMemo } from 'react'
import styles from './FinancialCalculator.module.css'
import type { FinancialInputs } from '@/features/financial/types/financial'
import type { ReportData } from '@/features/reports/types/report'
import type { ShadeImpactSummary } from '@/features/solar-analysis/types/solar-api'
import { calculateFinancials, estimateSystemCost } from '@/features/financial/utils/financialCalculations'
import { generateSolarReport, downloadPDF } from '@/features/reports/utils/pdfGenerator'
import { validateGermanProduction } from '@/features/solar-analysis/utils/germanSolarCalculations'

interface FinancialCalculatorProps {
  annualProduction: number // kWh/year (already adjusted for shade)
  systemSize: number // kW
  panelCount?: number
  panelWattage?: number
  shadeImpact?: ShadeImpactSummary | null
  onClose?: () => void
}

export default function FinancialCalculator({
  annualProduction,
  systemSize,
  panelCount,
  panelWattage = 400,
  shadeImpact,
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
  const [discountRate, setDiscountRate] = useState(4) // % discount rate for NPV
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Financing options
  const [financingType, setFinancingType] = useState<'cash' | 'kfw' | 'loan'>('cash')
  const [downPayment, setDownPayment] = useState(0) // € down payment for loans
  const [loanTerm, setLoanTerm] = useState(15) // years
  const [kfwInterestRate, setKfwInterestRate] = useState(2.5) // % for KfW loan (2.0-3.5% typical)
  const [customInterestRate, setCustomInterestRate] = useState(4.5) // % for standard loan

  // Calculate net system cost after incentives for financing
  const vatSavingsAmount = systemSize <= 30 ? systemCostInput * 0.19 : 0
  const netSystemCost = systemCostInput - vatSavingsAmount - stateGrant - municipalGrant

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
    financing: financingType !== 'cash' ? {
      type: financingType,
      downPayment,
      loanAmount: netSystemCost - downPayment,
      interestRate: financingType === 'kfw' ? kfwInterestRate : customInterestRate,
      loanTerm
    } : undefined,
    selfConsumptionRate,
    discountRate
  }), [annualProduction, systemSize, costPerKwh, avgMonthlyBill, escalationRate, systemCostInput, feedInTariff, selfConsumptionRate, stateGrant, municipalGrant, discountRate, financingType, downPayment, loanTerm, kfwInterestRate, customInterestRate, netSystemCost])

  const results = useMemo(() => calculateFinancials(financialInputs), [financialInputs])

  // Calculate financing comparison scenarios
  const financingScenarios = useMemo(() => {
    const calculateLoan = (type: 'kfw' | 'loan', interestRate: number) => {
      const loanAmount = netSystemCost - downPayment
      const monthlyRate = interestRate / 100 / 12
      const numPayments = loanTerm * 12

      let monthlyPayment = 0
      let totalInterest = 0

      if (monthlyRate > 0) {
        monthlyPayment = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
          (Math.pow(1 + monthlyRate, numPayments) - 1)
        totalInterest = (monthlyPayment * numPayments) - loanAmount
      } else {
        monthlyPayment = loanAmount / numPayments
        totalInterest = 0
      }

      return {
        type,
        monthlyPayment: Math.round(monthlyPayment),
        totalInterest: Math.round(totalInterest),
        totalCost: Math.round(loanAmount + totalInterest + downPayment)
      }
    }

    return {
      cash: {
        type: 'cash' as const,
        monthlyPayment: 0,
        totalInterest: 0,
        totalCost: Math.round(netSystemCost)
      },
      kfw: calculateLoan('kfw', kfwInterestRate),
      standardLoan: calculateLoan('loan', customInterestRate)
    }
  }, [netSystemCost, downPayment, loanTerm, kfwInterestRate, customInterestRate])

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
      // Customer Information (placeholder - can be customized)
      customer: {
        name: 'Customer Name',
        address: 'Customer Address',
        propertyType: 'residential'
      },

      // Site Information (placeholder - can be customized)
      site: {
        address: 'Installation Address',
        roofType: 'Pitched',
        roofCondition: 'good',
        shadeAnalysis: shadeImpact || undefined
      },

      // System Specifications
      systemSpecs: {
        panelCount: panelCount || Math.round(systemSize * 2.5),
        systemSize,
        panelWattage: panelWattage || 400,
        panelManufacturer: 'Premium Solar',
        panelModel: 'High Efficiency',
        panelEfficiency: 21.5,
        annualProduction,
        performanceRatio: 85,
        degradationRate: 0.5,
      },

      // Energy Production Estimate
      energyProduction: {
        monthlyYield: generateMonthlyEstimate(annualProduction),
        annualYield: annualProduction,
        performanceRatio: 85,
        solarIrradiance: 1100,
        degradationRate: 0.5,
        estimatedOutput25Years: generate25YearProjection(annualProduction, 0.5)
      },

      // Inverter Specifications
      inverter: {
        type: 'string',
        manufacturer: 'Premium Inverter Co.',
        model: 'String Inverter 10kW',
        quantity: 1,
        efficiency: 97.5,
        warranty: 10
      },

      // Monitoring & Maintenance
      monitoring: {
        monitoringSystem: 'Web Portal & Mobile App',
        appAccess: true,
        maintenanceSchedule: {
          frequency: 'Annual',
          tasks: [
            'Visual inspection of panels for damage or debris',
            'Clean panels if necessary',
            'Check inverter status and error logs',
            'Inspect mounting structure for corrosion',
            'Verify electrical connections are secure',
            'Test surge protection devices',
            'Review monitoring system data for anomalies'
          ]
        },
        warranty: {
          panels: 25,
          inverter: 10,
          installation: 5
        }
      },

      // Financial Data
      financials: results,
      electricityRate: costPerKwh,
      monthlyBill: avgMonthlyBill,
      feedInTariff,
      selfConsumptionRate,
      systemCost: systemCostInput,

      // Report Metadata
      companyName: 'Solar Installation Company',
      projectDate: new Date(),
      proposalValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
    }

    const doc = generateSolarReport(reportData, {
      includeCustomerInfo: true,
      includeSiteInfo: true,
      includeSystemSpecs: true,
      includeEnergyProduction: true,
      includeFinancials: true,
      includeEnvironmental: true,
      includeMonitoring: true,
    })

    downloadPDF(doc, `solar-proposal-${systemSize}kW-${new Date().toISOString().split('T')[0]}.pdf`)
  }

  // Helper function to generate monthly production estimate
  function generateMonthlyEstimate(annualProduction: number): number[] {
    // Typical monthly distribution for Germany (percentage of annual)
    const monthlyDistribution = [
      0.04, 0.06, 0.08, 0.10, 0.11, 0.12,  // Jan-Jun
      0.13, 0.12, 0.10, 0.07, 0.04, 0.03   // Jul-Dec
    ]
    return monthlyDistribution.map(ratio => Math.round(annualProduction * ratio))
  }

  // Helper function to generate 25-year projection
  function generate25YearProjection(annualProduction: number, degradationRate: number): number[] {
    const projection = []
    for (let year = 0; year < 25; year++) {
      const degradationFactor = Math.pow(1 - degradationRate / 100, year)
      projection.push(Math.round(annualProduction * degradationFactor))
    }
    return projection
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
          <div className={styles.metricLabel}>Net Present Value</div>
          <div className={`${styles.metricValue} ${results.npv >= 0 ? styles.savings : styles.negative}`}>
            €{results.npv.toLocaleString()}
          </div>
          <div className={styles.metricHint}>Present value at {discountRate}% discount</div>
        </div>
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
        <div className={styles.metricCard}>
          <div className={styles.metricLabel}>IRR</div>
          <div className={`${styles.metricValue} ${styles.roi}`}>{results.irr}%</div>
          <div className={styles.metricHint}>Internal Rate of Return</div>
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

      {/* Financing Options Comparison */}
      <div className={styles.section}>
        <h4 className={styles.sectionTitle}>💰 Financing Options Comparison</h4>
        <div className={styles.financingComparison}>
          <table className={styles.comparisonTable}>
            <thead>
              <tr>
                <th>Payment Method</th>
                <th>Monthly Payment</th>
                <th>Solar Savings</th>
                <th>Net Monthly</th>
                <th>Total Interest</th>
                <th>Total Cost</th>
              </tr>
            </thead>
            <tbody>
              {/* Cash Purchase */}
              <tr className={financingType === 'cash' ? styles.selectedRow : ''}>
                <td>
                  <strong>Cash Purchase</strong>
                  <br />
                  <small>Pay upfront</small>
                </td>
                <td>€0</td>
                <td className={styles.positive}>+€{results.avgMonthlySavings}</td>
                <td className={styles.positive}>
                  <strong>+€{results.avgMonthlySavings}</strong>
                </td>
                <td>€0</td>
                <td>€{financingScenarios.cash.totalCost.toLocaleString()}</td>
              </tr>

              {/* KfW Loan */}
              <tr className={financingType === 'kfw' ? styles.selectedRow : ''}>
                <td>
                  <strong>KfW 270 Loan</strong>
                  <br />
                  <small>{kfwInterestRate}% interest, {loanTerm} years</small>
                </td>
                <td>€{financingScenarios.kfw.monthlyPayment}</td>
                <td className={styles.positive}>+€{results.avgMonthlySavings}</td>
                <td className={results.avgMonthlySavings > financingScenarios.kfw.monthlyPayment ? styles.positive : styles.negative}>
                  <strong>{results.avgMonthlySavings > financingScenarios.kfw.monthlyPayment ? '+' : ''}€{results.avgMonthlySavings - financingScenarios.kfw.monthlyPayment}</strong>
                </td>
                <td>€{financingScenarios.kfw.totalInterest.toLocaleString()}</td>
                <td>€{financingScenarios.kfw.totalCost.toLocaleString()}</td>
              </tr>

              {/* Standard Loan */}
              <tr className={financingType === 'loan' ? styles.selectedRow : ''}>
                <td>
                  <strong>Standard Loan</strong>
                  <br />
                  <small>{customInterestRate}% interest, {loanTerm} years</small>
                </td>
                <td>€{financingScenarios.standardLoan.monthlyPayment}</td>
                <td className={styles.positive}>+€{results.avgMonthlySavings}</td>
                <td className={results.avgMonthlySavings > financingScenarios.standardLoan.monthlyPayment ? styles.positive : styles.negative}>
                  <strong>{results.avgMonthlySavings > financingScenarios.standardLoan.monthlyPayment ? '+' : ''}€{results.avgMonthlySavings - financingScenarios.standardLoan.monthlyPayment}</strong>
                </td>
                <td>€{financingScenarios.standardLoan.totalInterest.toLocaleString()}</td>
                <td>€{financingScenarios.standardLoan.totalCost.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          {/* Key Insight */}
          <div className={styles.financingInsight}>
            {financingType === 'cash' ? (
              <p>💡 <strong>Cash purchase maximizes savings:</strong> No interest payments means you keep all €{results.twentyFiveYearSavings.toLocaleString()} in 25-year savings.</p>
            ) : financingType === 'kfw' ? (
              <p>💡 <strong>KfW financing advantage:</strong> Government-subsidized {kfwInterestRate}% interest rate means you save €{(financingScenarios.standardLoan.totalInterest - financingScenarios.kfw.totalInterest).toLocaleString()} vs standard loans!</p>
            ) : (
              <p>💡 <strong>Standard loan option:</strong> While interest is higher, solar savings of €{results.avgMonthlySavings}/month help offset your €{financingScenarios.standardLoan.monthlyPayment}/month payment.</p>
            )}
          </div>

          {/* Monthly Cash Flow Visualization */}
          {financingType !== 'cash' && (
            <div className={styles.monthlyCashFlow}>
              <h5>Monthly Cash Flow Impact</h5>
              <div className={styles.cashFlowBars}>
                <div className={styles.cashFlowItem}>
                  <div className={styles.cashFlowLabel}>Loan Payment</div>
                  <div className={styles.cashFlowBar} style={{ width: '100%', backgroundColor: '#ff6b6b' }}>
                    €{financingType === 'kfw' ? financingScenarios.kfw.monthlyPayment : financingScenarios.standardLoan.monthlyPayment}
                  </div>
                </div>
                <div className={styles.cashFlowItem}>
                  <div className={styles.cashFlowLabel}>Solar Savings</div>
                  <div className={styles.cashFlowBar} style={{
                    width: `${(results.avgMonthlySavings / (financingType === 'kfw' ? financingScenarios.kfw.monthlyPayment : financingScenarios.standardLoan.monthlyPayment)) * 100}%`,
                    backgroundColor: '#4caf50'
                  }}>
                    €{results.avgMonthlySavings}
                  </div>
                </div>
                <div className={styles.cashFlowItem}>
                  <div className={styles.cashFlowLabel}>Net Monthly Impact</div>
                  <div className={styles.cashFlowBar} style={{
                    width: `${Math.abs(results.avgMonthlySavings - (financingType === 'kfw' ? financingScenarios.kfw.monthlyPayment : financingScenarios.standardLoan.monthlyPayment)) / (financingType === 'kfw' ? financingScenarios.kfw.monthlyPayment : financingScenarios.standardLoan.monthlyPayment) * 100}%`,
                    backgroundColor: results.avgMonthlySavings > (financingType === 'kfw' ? financingScenarios.kfw.monthlyPayment : financingScenarios.standardLoan.monthlyPayment) ? '#4caf50' : '#ff6b6b'
                  }}>
                    {results.avgMonthlySavings > (financingType === 'kfw' ? financingScenarios.kfw.monthlyPayment : financingScenarios.standardLoan.monthlyPayment) ? '+' : ''}€{results.avgMonthlySavings - (financingType === 'kfw' ? financingScenarios.kfw.monthlyPayment : financingScenarios.standardLoan.monthlyPayment)}
                  </div>
                </div>
              </div>
            </div>
          )}
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

      {/* Shade Analysis */}
      {shadeImpact && shadeImpact.averageShadePercentage > 0 && (
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>☀️ Shade Analysis</h4>
          <div className={styles.shadeInfo}>
            <div className={styles.shadeItem}>
              <span className={styles.shadeLabel}>Average Shade Impact</span>
              <span className={styles.shadeValue}>{shadeImpact.averageShadePercentage.toFixed(1)}%</span>
            </div>
            <div className={styles.shadeItem}>
              <span className={styles.shadeLabel}>Annual Energy Loss</span>
              <span className={styles.shadeValue}>{shadeImpact.estimatedAnnualLoss.toLocaleString()} kWh</span>
            </div>
            <div className={styles.shadeItem}>
              <span className={styles.shadeLabel}>Financial Loss</span>
              <span className={styles.shadeValue}>€{shadeImpact.estimatedFinancialLoss.toFixed(0)}/year</span>
            </div>
            <div className={styles.shadeRecommendation}>
              {shadeImpact.recommendation}
            </div>
          </div>
        </div>
      )}

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
            {/* Financing Options */}
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Financing Method
                <select
                  className={styles.input}
                  value={financingType}
                  onChange={(e) => setFinancingType(e.target.value as 'cash' | 'kfw' | 'loan')}
                >
                  <option value="cash">Cash Purchase</option>
                  <option value="kfw">KfW 270 Loan (Government-Subsidized)</option>
                  <option value="loan">Standard Bank Loan</option>
                </select>
              </label>
              {financingType === 'kfw' && (
                <small className={styles.inputHint}>
                  ℹ️ KfW 270 "Renewable Energy - Standard" offers low-interest government-backed loans for solar installations
                </small>
              )}
            </div>

            {financingType !== 'cash' && (
              <>
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    Down Payment (€)
                    <input
                      type="number"
                      className={styles.input}
                      value={downPayment}
                      onChange={(e) => setDownPayment(parseFloat(e.target.value) || 0)}
                      step="1000"
                      min="0"
                      max={netSystemCost}
                    />
                  </label>
                  <small className={styles.inputHint}>
                    Loan amount: €{(netSystemCost - downPayment).toLocaleString()}
                  </small>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    Loan Term (years)
                    <input
                      type="number"
                      className={styles.input}
                      value={loanTerm}
                      onChange={(e) => setLoanTerm(parseInt(e.target.value) || 15)}
                      step="1"
                      min="5"
                      max="25"
                    />
                  </label>
                </div>

                {financingType === 'kfw' ? (
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      KfW Interest Rate (%)
                      <input
                        type="number"
                        className={styles.input}
                        value={kfwInterestRate}
                        onChange={(e) => setKfwInterestRate(parseFloat(e.target.value) || 2.5)}
                        step="0.1"
                        min="2.0"
                        max="3.5"
                      />
                    </label>
                    <small className={styles.inputHint}>
                      Typical KfW 270 range: 2.0-3.5% (varies by credit rating)
                    </small>
                  </div>
                ) : financingType === 'loan' && (
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      Interest Rate (%)
                      <input
                        type="number"
                        className={styles.input}
                        value={customInterestRate}
                        onChange={(e) => setCustomInterestRate(parseFloat(e.target.value) || 4.5)}
                        step="0.1"
                        min="0"
                        max="15"
                      />
                    </label>
                    <small className={styles.inputHint}>
                      Typical German range: 3.5-6.5% (secured loans: 2-4%)
                    </small>
                  </div>
                )}
              </>
            )}

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

            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Discount Rate (% for NPV)
                <input
                  type="number"
                  className={styles.input}
                  value={discountRate}
                  onChange={(e) => setDiscountRate(parseFloat(e.target.value) || 0)}
                  step="0.5"
                  min="0"
                  max="15"
                />
              </label>
              <small className={styles.inputHint}>
                Typical: 3-6% (conservative to aggressive)
              </small>
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
    </div>
  )
}
