/**
 * Financial Input Form Component
 * Collapsible form for adjusting financial assumptions
 */

import { useState } from "react";
import styles from "./FinancialCalculator.module.css";
import panel from "@/shared/styles/panel.module.css";
import { sanitizeNumericInput } from "@/features/financial/utils/validation";
import {
  estimateSystemCost,
  FINANCIAL_DEFAULTS,
} from "@/features/financial/utils/financialCalculations";
import { calculateGermanFeedInTariff } from "@/features/financial/utils/germanFeedInTariff";

type FinancingType = "cash" | "kfw" | "loan";

interface CalculatorInputs {
  financingType: FinancingType;
  costPerKwh: number;
  avgMonthlyBill: number;
  escalationRate: number;
  systemCost: number;
  feedInTariff: number;
  selfConsumptionRate: number;
  stateGrant: number;
  municipalGrant: number;
  discountRate: number;
  downPayment: number;
  loanTerm: number;
  kfwInterestRate: number;
  customInterestRate: number;
}

/** Initial values; also the fallback when a field is cleared or invalid */
export const defaultInputs = (systemSize: number): CalculatorInputs => ({
  financingType: "cash",
  ...FINANCIAL_DEFAULTS,
  avgMonthlyBill: 130,
  systemCost: estimateSystemCost(systemSize),
  feedInTariff: calculateGermanFeedInTariff(systemSize),
  stateGrant: 0,
  municipalGrant: 0,
  discountRate: 4,
  downPayment: 0,
  loanTerm: 15,
  kfwInterestRate: 2.5,
  customInterestRate: 4.5,
});

const LOANS: FinancingType[] = ["kfw", "loan"];

/** Numeric inputs in display order; `financing` limits a field to those financing types */
const FIELDS: {
  key: Exclude<keyof CalculatorInputs, "financingType">;
  label: string;
  step: number;
  min: number;
  max?: number;
  hint?: string;
  integer?: boolean;
  financing?: FinancingType[];
}[] = [
  {
    key: "downPayment",
    label: "Down Payment (€)",
    step: 1000,
    min: 0,
    financing: LOANS,
  },
  {
    key: "loanTerm",
    label: "Loan Term (years)",
    step: 1,
    min: 5,
    max: 25,
    integer: true,
    financing: LOANS,
  },
  {
    key: "kfwInterestRate",
    label: "KfW Interest Rate (%)",
    step: 0.1,
    min: 2,
    max: 3.5,
    hint: "Typical KfW 270 range: 2.0-3.5% (varies by credit rating)",
    financing: ["kfw"],
  },
  {
    key: "customInterestRate",
    label: "Interest Rate (%)",
    step: 0.1,
    min: 0,
    max: 15,
    hint: "Typical German range: 3.5-6.5% (secured loans: 2-4%)",
    financing: ["loan"],
  },
  { key: "costPerKwh", label: "Electricity Rate (€/kWh)", step: 0.01, min: 0 },
  {
    key: "avgMonthlyBill",
    label: "Current Monthly Bill (€)",
    step: 10,
    min: 0,
  },
  {
    key: "escalationRate",
    label: "Rate Escalation (%/year)",
    step: 0.5,
    min: 0,
    max: 10,
  },
  { key: "systemCost", label: "System Cost (€)", step: 100, min: 0 },
  { key: "feedInTariff", label: "Feed-in Tariff (€/kWh)", step: 0.001, min: 0 },
  {
    key: "selfConsumptionRate",
    label: "Self-Consumption Rate (%)",
    step: 5,
    min: 0,
    max: 100,
  },
  { key: "stateGrant", label: "State Grant (€)", step: 100, min: 0 },
  { key: "municipalGrant", label: "Municipal Grant (€)", step: 100, min: 0 },
  {
    key: "discountRate",
    label: "Discount Rate (% for NPV)",
    step: 0.5,
    min: 0,
    max: 15,
    hint: "Typical: 3-6% (conservative to aggressive)",
  },
];

interface FinancialInputFormProps {
  inputs: CalculatorInputs;
  defaults: CalculatorInputs;
  netSystemCost: number;
  onChange: (patch: Partial<CalculatorInputs>) => void;
}

export default function FinancialInputForm({
  inputs,
  defaults,
  netSystemCost,
  onChange,
}: FinancialInputFormProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);

  return (
    <div className={panel.controls}>
      <button
        className={panel.toggleButton}
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? "▼" : "▶"} Adjust Assumptions
      </button>

      {showAdvanced && (
        <div className={styles.inputs}>
          {/* Financing Options */}
          <div className={panel.inputGroup}>
            <label className={styles.inputLabel}>
              Financing Method
              <select
                className={styles.input}
                value={inputs.financingType}
                onChange={(e) =>
                  onChange({ financingType: e.target.value as FinancingType })
                }
              >
                <option value="cash">Cash Purchase</option>
                <option value="kfw">
                  KfW 270 Loan (Government-Subsidized)
                </option>
                <option value="loan">Standard Bank Loan</option>
              </select>
            </label>
            {inputs.financingType === "kfw" && (
              <small className={styles.inputHint}>
                ℹ️ KfW 270 "Renewable Energy - Standard" offers low-interest
                government-backed loans for solar installations
              </small>
            )}
          </div>

          {FIELDS.filter(
            ({ financing }) =>
              !financing || financing.includes(inputs.financingType),
          ).map(({ key, label, step, min, max, hint, integer }) => {
            const isDownPayment = key === "downPayment";
            return (
              <div key={key} className={panel.inputGroup}>
                <label className={styles.inputLabel}>
                  {label}
                  <input
                    type="number"
                    className={styles.input}
                    value={inputs[key]}
                    onChange={(e) => {
                      const value = sanitizeNumericInput(
                        e.target.value,
                        defaults[key],
                      );
                      onChange({ [key]: integer ? Math.round(value) : value });
                    }}
                    step={step}
                    min={min}
                    max={isDownPayment ? netSystemCost : max}
                  />
                </label>
                {(hint || isDownPayment) && (
                  <small className={styles.inputHint}>
                    {isDownPayment
                      ? `Loan amount: €${(
                          netSystemCost - inputs.downPayment
                        ).toLocaleString()}`
                      : hint}
                  </small>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
