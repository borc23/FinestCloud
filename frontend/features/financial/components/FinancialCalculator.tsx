/**
 * Financial Calculator Component
 * Main component that orchestrates financial analysis display
 */

"use client";

import { useState, useMemo } from "react";
import styles from "./FinancialCalculator.module.css";
import panel from "@/shared/styles/panel.module.css";
import {
  calculateFinancials,
  calculateVatSavings,
} from "@/features/financial/utils/financialCalculations";
import {
  validateFinancialInputs,
  validateGermanProduction,
} from "@/features/financial/utils/validation";
import {
  getFeedInTariffBreakdown,
  formatFeedInTariff,
} from "@/features/financial/utils/germanFeedInTariff";

// Sub-components
import KeyMetrics from "./KeyMetrics";
import EnergyOffsetDisplay from "./EnergyOffsetDisplay";
import FinancingComparisonTable from "./FinancingComparisonTable";
import FinancialInputForm, { defaultInputs } from "./FinancialInputForm";
import ValidationDisplay from "./ValidationDisplay";

interface FinancialCalculatorProps {
  annualProduction: number; // kWh/year
  systemSize: number; // kW
  onClose?: () => void;
}

/** Monthly payment and totals for an annuity loan */
function calculateLoan(
  type: "kfw" | "loan",
  netSystemCost: number,
  downPayment: number,
  interestRate: number,
  loanTerm: number,
) {
  const loanAmount = netSystemCost - downPayment;
  const monthlyRate = interestRate / 100 / 12;
  const numPayments = loanTerm * 12;
  const monthlyPayment =
    monthlyRate > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1)
      : loanAmount / numPayments;
  const totalInterest =
    monthlyRate > 0 ? monthlyPayment * numPayments - loanAmount : 0;

  return {
    type,
    monthlyPayment: Math.round(monthlyPayment),
    totalInterest: Math.round(totalInterest),
    totalCost: Math.round(loanAmount + totalInterest + downPayment),
  };
}

export default function FinancialCalculator({
  annualProduction,
  systemSize,
  onClose,
}: FinancialCalculatorProps) {
  // User inputs with German market defaults (EEG 2025 feed-in tariff for this system size)
  const defaults = useMemo(() => defaultInputs(systemSize), [systemSize]);
  const [inputs, setInputs] = useState(defaults);
  const {
    financingType,
    costPerKwh,
    avgMonthlyBill,
    systemCost,
    feedInTariff,
    selfConsumptionRate,
    stateGrant,
    municipalGrant,
    discountRate,
    downPayment,
    loanTerm,
    kfwInterestRate,
    customInterestRate,
  } = inputs;
  const financed = financingType !== "cash";

  // Net system cost after incentives
  const netSystemCost =
    systemCost -
    calculateVatSavings(systemSize, systemCost) -
    stateGrant -
    municipalGrant;

  // Validate all inputs
  const validation = useMemo(
    () =>
      validateFinancialInputs({
        ...inputs,
        systemSize,
        annualProduction,
        downPayment: financed ? downPayment : undefined,
        loanTerm: financed ? loanTerm : undefined,
        interestRate: !financed
          ? undefined
          : financingType === "kfw"
            ? kfwInterestRate
            : customInterestRate,
        netSystemCost,
      }),
    [inputs, systemSize, annualProduction, netSystemCost],
  );

  // Calculate financials (only for valid inputs)
  const results = useMemo(
    () =>
      validation.isValid
        ? calculateFinancials({
            annualProduction,
            systemSize,
            utilityRates: {
              costPerKwh,
              avgMonthlyBill,
              escalationRate: inputs.escalationRate,
              feedInTariff,
            },
            systemCost,
            stateGrant,
            municipalGrant,
            selfConsumptionRate,
            discountRate,
          })
        : null,
    [inputs, systemSize, annualProduction, validation.isValid],
  );

  // Calculate financing comparison scenarios
  const financingScenarios = useMemo(
    () => ({
      cash: {
        type: "cash" as const,
        monthlyPayment: 0,
        totalInterest: 0,
        totalCost: Math.round(netSystemCost),
      },
      kfw: calculateLoan(
        "kfw",
        netSystemCost,
        downPayment,
        kfwInterestRate,
        loanTerm,
      ),
      standardLoan: calculateLoan(
        "loan",
        netSystemCost,
        downPayment,
        customInterestRate,
        loanTerm,
      ),
    }),
    [netSystemCost, downPayment, loanTerm, kfwInterestRate, customInterestRate],
  );

  // Validate production for German conditions
  const productionValidation = validateGermanProduction(
    systemSize,
    annualProduction,
  );

  return (
    <div className={styles.container}>
      <div className={panel.header}>
        <h3 className={panel.title}>Financial Analysis</h3>
        <button
          className={panel.closeButton}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className={panel.scrollableContent}>
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
            <div className={panel.section}>
              <h4 className={panel.sectionTitle}>Monthly Bill Comparison</h4>
              <div className={styles.billComparison}>
                <div className={styles.billItem}>
                  <span className={styles.billLabel}>Before Solar</span>
                  <span className={styles.billValue}>
                    €{results.avgMonthlyBillBefore}
                  </span>
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
            <div className={panel.section}>
              <h4 className={panel.sectionTitle}>System Costs</h4>
              <div className={styles.costBreakdown}>
                <div className={styles.costItem}>
                  <span className={styles.costLabel}>Gross System Cost</span>
                  <span className={styles.costValue}>
                    €{results.grossSystemCost.toLocaleString()}
                  </span>
                </div>
                {(
                  [
                    ["VAT Savings (19%)", results.vatSavings],
                    ["State Grant", stateGrant],
                    ["Municipal Grant", municipalGrant],
                  ] as const
                ).map(
                  ([label, amount]) =>
                    amount > 0 && (
                      <div key={label} className={styles.costItem}>
                        <span className={styles.costLabel}>{label}</span>
                        <span
                          className={`${styles.costValue} ${styles.incentive}`}
                        >
                          -€{amount.toLocaleString()}
                        </span>
                      </div>
                    ),
                )}
                <div className={`${styles.costItem} ${styles.netCost}`}>
                  <span className={styles.costLabel}>Net System Cost</span>
                  <span className={styles.costValue}>
                    €{results.netSystemCost.toLocaleString()}
                  </span>
                </div>
                <div className={styles.costMeta}>
                  €{results.effectiveCostPerWatt.toFixed(2)}/watt after
                  incentives
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
            <div className={panel.section}>
              <h4 className={panel.sectionTitle}>
                Energy & Environmental Impact
              </h4>
              <div className={styles.impactGrid}>
                {[
                  [`${results.energyOffsetPercentage}%`, "Self-Consumption"],
                  [results.lifetimeCO2Offset, "Tons CO₂ Offset"],
                  [
                    results.selfConsumptionAmount.toLocaleString(),
                    "kWh Self-Used",
                  ],
                ].map(([value, label]) => (
                  <div key={label} className={styles.impactItem}>
                    <div className={styles.impactValue}>{value}</div>
                    <div className={styles.impactLabel}>{label}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feed-in Revenue */}
            <div className={panel.section}>
              <h4 className={panel.sectionTitle}>Feed-in Tariff Revenue</h4>
              <div className={styles.feedInInfo}>
                <div className={styles.feedInRow}>
                  <span className={styles.feedInLabel}>
                    EEG 2025 Tiered Rates for {systemSize.toFixed(1)} kW
                  </span>
                  <span className={styles.feedInValue}>
                    {getFeedInTariffBreakdown(systemSize).map((tier, idx) => (
                      <div key={idx}>
                        {tier.tier}: {tier.capacityKw.toFixed(2)} kW @{" "}
                        {formatFeedInTariff(tier.rateEuroPerKwh)}
                      </div>
                    ))}
                  </span>
                </div>
                {[
                  [
                    "Weighted Average Rate",
                    `${formatFeedInTariff(feedInTariff)} (fixed for 20 years)`,
                  ],
                  [
                    "Grid Feed-in per Year (Year 1)",
                    `${results.gridFeedInAmount.toLocaleString()} kWh`,
                  ],
                  [
                    "Annual Feed-in Revenue (Year 1)",
                    `€${results.firstYearFeedInRevenue}`,
                  ],
                  [
                    "25-Year Feed-in Revenue (with degradation)",
                    `€${results.twentyFiveYearFeedInRevenue.toLocaleString()}`,
                    styles.feedInHighlight,
                  ],
                ].map(([label, value, highlight = ""]) => (
                  <div key={label} className={styles.feedInRow}>
                    <span className={styles.feedInLabel}>{label}</span>
                    <span className={`${styles.feedInValue} ${highlight}`}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className={styles.feedInNote}>
                Note: Includes 0.6 ct/kWh bonus to compensate for exclusion
                during negative-price hours (2025 regulation)
              </div>
            </div>
          </>
        )}

        {/* Input Controls */}
        <FinancialInputForm
          inputs={inputs}
          defaults={defaults}
          netSystemCost={netSystemCost}
          onChange={(patch) => setInputs((prev) => ({ ...prev, ...patch }))}
        />

        {/* Production Validation Warning */}
        {!productionValidation.isRealistic && (
          <div className={panel.warningBox}>
            <div className={panel.warningIcon}>⚠️</div>
            <div className={panel.warningContent}>
              <div className={panel.warningTitle}>
                Production Estimate Notice
              </div>
              <p className={styles.warningText}>
                {productionValidation.message}
              </p>
              <p className={styles.warningText}>
                <strong>
                  Typical German range for {systemSize.toFixed(1)}kW system:
                </strong>{" "}
                {productionValidation.expectedRange.min.toLocaleString()} -{" "}
                {productionValidation.expectedRange.max.toLocaleString()}{" "}
                kWh/year
                <br />
                <small>
                  (Based on 850-1,050 full load hours, ~10% capacity factor)
                </small>
              </p>
            </div>
          </div>
        )}

        {/* Disclaimer */}
        <div className={panel.disclaimer}>
          <p>
            * Estimates based on {systemSize.toFixed(1)}kW system producing{" "}
            {annualProduction.toLocaleString()} kWh/year. Actual savings may
            vary based on usage, utility rates, and system performance.{" "}
            {systemSize <= 30 &&
              "0% VAT applies to systems ≤30kWp (since Jan 2023)."}{" "}
            Typical German solar systems achieve 850-1,050 full load hours
            annually (~10% capacity factor).
          </p>
        </div>
      </div>
    </div>
  );
}
