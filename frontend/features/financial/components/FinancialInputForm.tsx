/**
 * Financial Input Form Component
 * Collapsible form for adjusting financial assumptions
 */

import React from "react";
import styles from "./FinancialCalculator.module.css";
import { sanitizeNumericInput } from "@/features/financial/utils/validation";
import { estimateSystemCost } from "@/features/financial/utils/financialCalculations";

interface FinancialInputFormProps {
  // State values
  financingType: "cash" | "kfw" | "loan";
  downPayment: number;
  loanTerm: number;
  kfwInterestRate: number;
  customInterestRate: number;
  costPerKwh: number;
  avgMonthlyBill: number;
  escalationRate: number;
  systemCostInput: number;
  feedInTariff: number;
  selfConsumptionRate: number;
  stateGrant: number;
  municipalGrant: number;
  discountRate: number;
  netSystemCost: number;
  systemSize: number;
  showAdvanced: boolean;

  // Setters
  setFinancingType: (value: "cash" | "kfw" | "loan") => void;
  setDownPayment: (value: number) => void;
  setLoanTerm: (value: number) => void;
  setKfwInterestRate: (value: number) => void;
  setCustomInterestRate: (value: number) => void;
  setCostPerKwh: (value: number) => void;
  setAvgMonthlyBill: (value: number) => void;
  setEscalationRate: (value: number) => void;
  setSystemCostInput: (value: number) => void;
  setFeedInTariff: (value: number) => void;
  setSelfConsumptionRate: (value: number) => void;
  setStateGrant: (value: number) => void;
  setMunicipalGrant: (value: number) => void;
  setDiscountRate: (value: number) => void;
  setShowAdvanced: (value: boolean) => void;
}

export default function FinancialInputForm(props: FinancialInputFormProps) {
  const {
    financingType,
    downPayment,
    loanTerm,
    kfwInterestRate,
    customInterestRate,
    costPerKwh,
    avgMonthlyBill,
    escalationRate,
    systemCostInput,
    feedInTariff,
    selfConsumptionRate,
    stateGrant,
    municipalGrant,
    discountRate,
    netSystemCost,
    systemSize,
    showAdvanced,
    setFinancingType,
    setDownPayment,
    setLoanTerm,
    setKfwInterestRate,
    setCustomInterestRate,
    setCostPerKwh,
    setAvgMonthlyBill,
    setEscalationRate,
    setSystemCostInput,
    setFeedInTariff,
    setSelfConsumptionRate,
    setStateGrant,
    setMunicipalGrant,
    setDiscountRate,
    setShowAdvanced,
  } = props;

  return (
    <div className={styles.controls}>
      <button
        className={styles.toggleButton}
        onClick={() => setShowAdvanced(!showAdvanced)}
      >
        {showAdvanced ? "▼" : "▶"} Adjust Assumptions
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
                onChange={(e) =>
                  setFinancingType(e.target.value as "cash" | "kfw" | "loan")
                }
              >
                <option value="cash">Cash Purchase</option>
                <option value="kfw">
                  KfW 270 Loan (Government-Subsidized)
                </option>
                <option value="loan">Standard Bank Loan</option>
              </select>
            </label>
            {financingType === "kfw" && (
              <small className={styles.inputHint}>
                ℹ️ KfW 270 "Renewable Energy - Standard" offers low-interest
                government-backed loans for solar installations
              </small>
            )}
          </div>

          {financingType !== "cash" && (
            <>
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Down Payment (€)
                  <input
                    type="number"
                    className={styles.input}
                    value={downPayment}
                    onChange={(e) =>
                      setDownPayment(sanitizeNumericInput(e.target.value, 0))
                    }
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
                    onChange={(e) =>
                      setLoanTerm(
                        Math.round(sanitizeNumericInput(e.target.value, 15)),
                      )
                    }
                    step="1"
                    min="5"
                    max="25"
                  />
                </label>
              </div>

              {financingType === "kfw" ? (
                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>
                    KfW Interest Rate (%)
                    <input
                      type="number"
                      className={styles.input}
                      value={kfwInterestRate}
                      onChange={(e) =>
                        setKfwInterestRate(
                          sanitizeNumericInput(e.target.value, 2.5),
                        )
                      }
                      step="0.1"
                      min="2.0"
                      max="3.5"
                    />
                  </label>
                  <small className={styles.inputHint}>
                    Typical KfW 270 range: 2.0-3.5% (varies by credit rating)
                  </small>
                </div>
              ) : (
                financingType === "loan" && (
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>
                      Interest Rate (%)
                      <input
                        type="number"
                        className={styles.input}
                        value={customInterestRate}
                        onChange={(e) =>
                          setCustomInterestRate(
                            sanitizeNumericInput(e.target.value, 4.5),
                          )
                        }
                        step="0.1"
                        min="0"
                        max="15"
                      />
                    </label>
                    <small className={styles.inputHint}>
                      Typical German range: 3.5-6.5% (secured loans: 2-4%)
                    </small>
                  </div>
                )
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
                onChange={(e) =>
                  setCostPerKwh(sanitizeNumericInput(e.target.value, 0.37))
                }
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
                onChange={(e) =>
                  setAvgMonthlyBill(sanitizeNumericInput(e.target.value, 130))
                }
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
                onChange={(e) =>
                  setEscalationRate(sanitizeNumericInput(e.target.value, 4))
                }
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
                onChange={(e) =>
                  setSystemCostInput(
                    sanitizeNumericInput(
                      e.target.value,
                      estimateSystemCost(systemSize),
                    ),
                  )
                }
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
                onChange={(e) =>
                  setFeedInTariff(sanitizeNumericInput(e.target.value, 0.1623))
                }
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
                onChange={(e) =>
                  setSelfConsumptionRate(
                    sanitizeNumericInput(e.target.value, 30),
                  )
                }
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
                onChange={(e) =>
                  setStateGrant(sanitizeNumericInput(e.target.value, 0))
                }
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
                onChange={(e) =>
                  setMunicipalGrant(sanitizeNumericInput(e.target.value, 0))
                }
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
                onChange={(e) =>
                  setDiscountRate(sanitizeNumericInput(e.target.value, 4))
                }
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
  );
}
