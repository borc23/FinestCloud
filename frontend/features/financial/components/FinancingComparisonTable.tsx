/**
 * Financing Comparison Table Component
 * Displays comparison of cash, KfW loan, and standard loan options
 */

import React from "react";
import styles from "./FinancialCalculator.module.css";
import type { FinancialResults } from "@/features/financial/types/financial";

interface FinancingScenario {
  type: "cash" | "kfw" | "loan";
  monthlyPayment: number;
  totalInterest: number;
  totalCost: number;
}

interface FinancingComparisonTableProps {
  financingScenarios: {
    cash: FinancingScenario;
    kfw: FinancingScenario;
    standardLoan: FinancingScenario;
  };
  financingType: "cash" | "kfw" | "loan";
  kfwInterestRate: number;
  customInterestRate: number;
  loanTerm: number;
  results: FinancialResults;
}

export default function FinancingComparisonTable({
  financingScenarios,
  financingType,
  kfwInterestRate,
  customInterestRate,
  loanTerm,
  results,
}: FinancingComparisonTableProps) {
  return (
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
            <tr className={financingType === "cash" ? styles.selectedRow : ""}>
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
            <tr className={financingType === "kfw" ? styles.selectedRow : ""}>
              <td>
                <strong>KfW 270 Loan</strong>
                <br />
                <small>
                  {kfwInterestRate}% interest, {loanTerm} years
                </small>
              </td>
              <td>€{financingScenarios.kfw.monthlyPayment}</td>
              <td className={styles.positive}>+€{results.avgMonthlySavings}</td>
              <td
                className={
                  results.avgMonthlySavings >
                  financingScenarios.kfw.monthlyPayment
                    ? styles.positive
                    : styles.negative
                }
              >
                <strong>
                  {results.avgMonthlySavings >
                  financingScenarios.kfw.monthlyPayment
                    ? "+"
                    : ""}
                  €
                  {results.avgMonthlySavings -
                    financingScenarios.kfw.monthlyPayment}
                </strong>
              </td>
              <td>€{financingScenarios.kfw.totalInterest.toLocaleString()}</td>
              <td>€{financingScenarios.kfw.totalCost.toLocaleString()}</td>
            </tr>

            {/* Standard Loan */}
            <tr className={financingType === "loan" ? styles.selectedRow : ""}>
              <td>
                <strong>Standard Loan</strong>
                <br />
                <small>
                  {customInterestRate}% interest, {loanTerm} years
                </small>
              </td>
              <td>€{financingScenarios.standardLoan.monthlyPayment}</td>
              <td className={styles.positive}>+€{results.avgMonthlySavings}</td>
              <td
                className={
                  results.avgMonthlySavings >
                  financingScenarios.standardLoan.monthlyPayment
                    ? styles.positive
                    : styles.negative
                }
              >
                <strong>
                  {results.avgMonthlySavings >
                  financingScenarios.standardLoan.monthlyPayment
                    ? "+"
                    : ""}
                  €
                  {results.avgMonthlySavings -
                    financingScenarios.standardLoan.monthlyPayment}
                </strong>
              </td>
              <td>
                €
                {financingScenarios.standardLoan.totalInterest.toLocaleString()}
              </td>
              <td>
                €{financingScenarios.standardLoan.totalCost.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Key Insight */}
        <div className={styles.financingInsight}>
          {financingType === "cash" ? (
            <p>
              💡 <strong>Cash purchase maximizes savings:</strong> No interest
              payments means you keep all €
              {results.twentyFiveYearSavings.toLocaleString()} in 25-year
              savings.
            </p>
          ) : financingType === "kfw" ? (
            <p>
              💡 <strong>KfW financing advantage:</strong> Government-subsidized{" "}
              {kfwInterestRate}% interest rate means you save €
              {(
                financingScenarios.standardLoan.totalInterest -
                financingScenarios.kfw.totalInterest
              ).toLocaleString()}{" "}
              vs standard loans!
            </p>
          ) : (
            <p>
              💡 <strong>Standard loan option:</strong> While interest is
              higher, solar savings of €{results.avgMonthlySavings}/month help
              offset your €{financingScenarios.standardLoan.monthlyPayment}
              /month payment.
            </p>
          )}
        </div>

        {/* Monthly Cash Flow Visualization */}
        {financingType !== "cash" &&
          (() => {
            const monthlyPayment =
              financingType === "kfw"
                ? financingScenarios.kfw.monthlyPayment
                : financingScenarios.standardLoan.monthlyPayment;
            const netImpact = results.avgMonthlySavings - monthlyPayment;

            // Calculate max value for scaling (use the maximum of payment and savings)
            const maxValue = Math.max(
              monthlyPayment,
              results.avgMonthlySavings,
              Math.abs(netImpact),
            );

            // Calculate widths as percentages of max value (with minimum 15% for visibility)
            const paymentWidth = Math.max(
              (monthlyPayment / maxValue) * 100,
              15,
            );
            const savingsWidth = Math.max(
              (results.avgMonthlySavings / maxValue) * 100,
              15,
            );
            const netWidth = Math.max(
              (Math.abs(netImpact) / maxValue) * 100,
              15,
            );

            return (
              <div className={styles.monthlyCashFlow}>
                <h5>Monthly Cash Flow Impact</h5>
                <div className={styles.cashFlowBars}>
                  {/* Loan Payment */}
                  <div className={styles.cashFlowItem}>
                    <div className={styles.cashFlowLabel}>Loan Payment</div>
                    <div className={styles.cashFlowBarContainer}>
                      <div
                        className={styles.cashFlowBar}
                        style={{
                          width: `${paymentWidth}%`,
                          background:
                            "linear-gradient(90deg, #ff6b6b 0%, #ff5252 100%)",
                        }}
                      />
                      <span className={styles.cashFlowValue}>
                        €{monthlyPayment}
                      </span>
                    </div>
                  </div>

                  {/* Solar Savings */}
                  <div className={styles.cashFlowItem}>
                    <div className={styles.cashFlowLabel}>Solar Savings</div>
                    <div className={styles.cashFlowBarContainer}>
                      <div
                        className={styles.cashFlowBar}
                        style={{
                          width: `${savingsWidth}%`,
                          background:
                            "linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)",
                        }}
                      />
                      <span className={styles.cashFlowValue}>
                        +€{results.avgMonthlySavings}
                      </span>
                    </div>
                  </div>

                  {/* Net Monthly Impact */}
                  <div className={styles.cashFlowItem}>
                    <div className={styles.cashFlowLabel}>
                      Net Monthly Impact
                    </div>
                    <div className={styles.cashFlowBarContainer}>
                      <div
                        className={styles.cashFlowBar}
                        style={{
                          width: `${netWidth}%`,
                          background:
                            netImpact >= 0
                              ? "linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)"
                              : "linear-gradient(90deg, #ff6b6b 0%, #ff5252 100%)",
                        }}
                      />
                      <span
                        className={styles.cashFlowValue}
                        style={{
                          color: netImpact >= 0 ? "#4caf50" : "#ff6b6b",
                        }}
                      >
                        {netImpact >= 0 ? "+" : ""}€
                        {Math.abs(netImpact).toFixed(0)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
