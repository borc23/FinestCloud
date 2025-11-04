/**
 * Financial Calculator Component (Refactored)
 * Main component that orchestrates financial analysis display
 * Now broken down into smaller, reusable sub-components
 */

'use client'

import { useState, useMemo } from 'react'
import styles from './FinancialCalculator.module.css'
import type { FinancialInputs } from '@/features/financial/types/financial'
import { calculateFinancials, estimateSystemCost } from '@/features/financial/utils/financialCalculations'
import { validateGermanProduction } from '@/features/solar-analysis/utils/germanSolarCalculations'
import { validateFinancialInputs } from '@/features/financial/utils/validation'
import {
  calculateGermanFeedInTariff,
  getFeedInTariffBreakdown,
  formatFeedInTariff
} from '@/features/financial/utils/germanFeedInTariff'

// Sub-components
import KeyMetrics from './KeyMetrics'
import EnergyOffsetDisplay from './EnergyOffsetDisplay'
import FinancingComparisonTable from './FinancingComparisonTable'
import FinancialInputForm from './FinancialInputForm'
import ValidationDisplay from './ValidationDisplay'

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
  // Calculate accurate German feed-in tariff based on system size (EEG 2025)
  const calculatedFeedInTariff = useMemo(
    () => calculateGermanFeedInTariff(systemSize, true, false),
    [systemSize]
  )

  // User inputs with German market defaults
  const [costPerKwh, setCostPerKwh] = useState(0.37)
  const [avgMonthlyBill, setAvgMonthlyBill] = useState(130)
  const [escalationRate, setEscalationRate] = useState(4)
  const [systemCostInput, setSystemCostInput] = useState(estimateSystemCost(systemSize))
  const [feedInTariff, setFeedInTariff] = useState(calculatedFeedInTariff)
  const [selfConsumptionRate, setSelfConsumptionRate] = useState(30)
  const [stateGrant, setStateGrant] = useState(0)
  const [municipalGrant, setMunicipalGrant] = useState(0)
  const [discountRate, setDiscountRate] = useState(4)
  const [showAdvanced, setShowAdvanced] = useState(false)

  // Validation state
  const [validationResult, setValidationResult] = useState<any | null>(null)

  // Financing options
  const [financingType, setFinancingType] = useState<'cash' | 'kfw' | 'loan'>('cash')
  const [downPayment, setDownPayment] = useState(0)
  const [loanTerm, setLoanTerm] = useState(15)
  const [kfwInterestRate, setKfwInterestRate] = useState(2.5)
  const [customInterestRate, setCustomInterestRate] = useState(4.5)

  // Calculate net system cost after incentives
  const vatSavingsAmount = systemSize <= 30 ? systemCostInput * 0.19 : 0
  const netSystemCost = systemCostInput - vatSavingsAmount - stateGrant - municipalGrant

  // Validate all inputs
  const validation = useMemo(() => {
    const result = validateFinancialInputs({
      systemSize,
      annualProduction,
      costPerKwh,
      avgMonthlyBill,
      escalationRate,
      systemCost: systemCostInput,
      feedInTariff,
      selfConsumptionRate,
      stateGrant,
      municipalGrant,
      discountRate,
      downPayment: financingType !== 'cash' ? downPayment : undefined,
      loanTerm: financingType !== 'cash' ? loanTerm : undefined,
      interestRate: financingType !== 'cash' ? (financingType === 'kfw' ? kfwInterestRate : customInterestRate) : undefined,
      netSystemCost
    })
    setValidationResult(result)
    return result
  }, [
    systemSize, annualProduction, costPerKwh, avgMonthlyBill, escalationRate,
    systemCostInput, feedInTariff, selfConsumptionRate, stateGrant, municipalGrant,
    discountRate, financingType, downPayment, loanTerm, kfwInterestRate,
    customInterestRate, netSystemCost
  ])

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
      vatReduction: systemSize <= 30 ? 19 : 0,
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
  }), [
    annualProduction, systemSize, costPerKwh, avgMonthlyBill, escalationRate,
    systemCostInput, feedInTariff, selfConsumptionRate, stateGrant, municipalGrant,
    discountRate, financingType, downPayment, loanTerm, kfwInterestRate,
    customInterestRate, netSystemCost
  ])

  const results = useMemo(() => {
    if (!validation.isValid) {
      return null
    }
    try {
      return calculateFinancials(financialInputs)
    } catch (error) {
      console.error('Financial calculation error:', error)
      return null
    }
  }, [financialInputs, validation.isValid])

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

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Financial Analysis</h3>
        <button className={styles.closeButton} onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>

      <div className={styles.scrollableContent}>
        {/* Validation Messages */}
        <ValidationDisplay validation={validation} />

        {/* Only show results if validation passes */}
        {results && (
          <>
            {/* Key Metrics */}
            <KeyMetrics results={results} discountRate={discountRate} />

            {/* Energy Offset */}
            <EnergyOffsetDisplay
              results={results}
              annualProduction={annualProduction}
              avgMonthlyBill={avgMonthlyBill}
              costPerKwh={costPerKwh}
              selfConsumptionRate={selfConsumptionRate}
            />

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

            {/* Financing Comparison */}
            <FinancingComparisonTable
              financingScenarios={financingScenarios}
              financingType={financingType}
              kfwInterestRate={kfwInterestRate}
              customInterestRate={customInterestRate}
              loanTerm={loanTerm}
              results={results}
            />

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
                  <span className={styles.feedInLabel}>EEG 2025 Tiered Rates for {systemSize.toFixed(1)} kW</span>
                  <span className={styles.feedInValue}>
                    {getFeedInTariffBreakdown(systemSize, true, false).map((tier, idx) => (
                      <div key={idx}>
                        {tier.tier}: {tier.capacityKw.toFixed(2)} kW @ {formatFeedInTariff(tier.rateEuroPerKwh)}
                      </div>
                    ))}
                  </span>
                </div>
                <div className={styles.feedInRow}>
                  <span className={styles.feedInLabel}>Weighted Average Rate</span>
                  <span className={styles.feedInValue}>{formatFeedInTariff(feedInTariff)} (fixed for 20 years)</span>
                </div>
                <div className={styles.feedInRow}>
                  <span className={styles.feedInLabel}>Grid Feed-in per Year (Year 1)</span>
                  <span className={styles.feedInValue}>{results.gridFeedInAmount.toLocaleString()} kWh</span>
                </div>
                <div className={styles.feedInRow}>
                  <span className={styles.feedInLabel}>Annual Feed-in Revenue (Year 1)</span>
                  <span className={styles.feedInValue}>€{results.firstYearFeedInRevenue}</span>
                </div>
                <div className={styles.feedInRow}>
                  <span className={styles.feedInLabel}>25-Year Feed-in Revenue (with degradation)</span>
                  <span className={`${styles.feedInValue} ${styles.feedInHighlight}`}>
                    €{results.twentyFiveYearFeedInRevenue.toLocaleString()}
                  </span>
                </div>
              </div>
              <div className={styles.feedInNote}>
                Note: Includes 0.6 ct/kWh bonus to compensate for exclusion during negative-price hours (2025 regulation)
              </div>
            </div>
          </>
        )}

        {/* Input Controls */}
        <FinancialInputForm
          financingType={financingType}
          downPayment={downPayment}
          loanTerm={loanTerm}
          kfwInterestRate={kfwInterestRate}
          customInterestRate={customInterestRate}
          costPerKwh={costPerKwh}
          avgMonthlyBill={avgMonthlyBill}
          escalationRate={escalationRate}
          systemCostInput={systemCostInput}
          feedInTariff={feedInTariff}
          selfConsumptionRate={selfConsumptionRate}
          stateGrant={stateGrant}
          municipalGrant={municipalGrant}
          discountRate={discountRate}
          netSystemCost={netSystemCost}
          systemSize={systemSize}
          showAdvanced={showAdvanced}
          setFinancingType={setFinancingType}
          setDownPayment={setDownPayment}
          setLoanTerm={setLoanTerm}
          setKfwInterestRate={setKfwInterestRate}
          setCustomInterestRate={setCustomInterestRate}
          setCostPerKwh={setCostPerKwh}
          setAvgMonthlyBill={setAvgMonthlyBill}
          setEscalationRate={setEscalationRate}
          setSystemCostInput={setSystemCostInput}
          setFeedInTariff={setFeedInTariff}
          setSelfConsumptionRate={setSelfConsumptionRate}
          setStateGrant={setStateGrant}
          setMunicipalGrant={setMunicipalGrant}
          setDiscountRate={setDiscountRate}
          setShowAdvanced={setShowAdvanced}
        />

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
