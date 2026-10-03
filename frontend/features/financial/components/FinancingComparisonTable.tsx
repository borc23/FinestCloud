/**
 * Financing Comparison Table Component
 * Displays comparison of cash, KfW loan, and standard loan options
 */

import styles from "./FinancialCalculator.module.css";
import panel from "@/shared/styles/panel.module.css";
import type { FinancialResults } from "@/features/financial/types/financial";

const GREEN = "linear-gradient(90deg, #4caf50 0%, #66bb6a 100%)";
const RED = "linear-gradient(90deg, #ff6b6b 0%, #ff5252 100%)";

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
  const rows = [
    {
      scenario: financingScenarios.cash,
      label: "Cash Purchase",
      note: "Pay upfront",
    },
    {
      scenario: financingScenarios.kfw,
      label: "KfW 270 Loan",
      note: `${kfwInterestRate}% interest, ${loanTerm} years`,
    },
    {
      scenario: financingScenarios.standardLoan,
      label: "Standard Loan",
      note: `${customInterestRate}% interest, ${loanTerm} years`,
    },
  ];

  return (
    <div className={panel.section}>
      <h4 className={panel.sectionTitle}>💰 Financing Options Comparison</h4>
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
            {rows.map(({ scenario, label, note }) => {
              const net = results.avgMonthlySavings - scenario.monthlyPayment;
              const gain = net > 0 || scenario.type === "cash";
              return (
                <tr
                  key={scenario.type}
                  className={
                    financingType === scenario.type ? styles.selectedRow : ""
                  }
                >
                  <td>
                    <strong>{label}</strong>
                    <br />
                    <small>{note}</small>
                  </td>
                  <td>€{scenario.monthlyPayment}</td>
                  <td className={styles.positive}>
                    +€{results.avgMonthlySavings}
                  </td>
                  <td className={gain ? styles.positive : styles.negative}>
                    <strong>
                      {gain ? "+" : ""}€{net}
                    </strong>
                  </td>
                  <td>€{scenario.totalInterest.toLocaleString()}</td>
                  <td>€{scenario.totalCost.toLocaleString()}</td>
                </tr>
              );
            })}
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
            const bars = [
              {
                label: "Loan Payment",
                amount: monthlyPayment,
                background: RED,
                text: `€${monthlyPayment}`,
              },
              {
                label: "Solar Savings",
                amount: results.avgMonthlySavings,
                background: GREEN,
                text: `+€${results.avgMonthlySavings}`,
              },
              {
                label: "Net Monthly Impact",
                amount: Math.abs(netImpact),
                background: netImpact >= 0 ? GREEN : RED,
                text: `${netImpact >= 0 ? "+" : ""}€${Math.abs(
                  netImpact,
                ).toFixed(0)}`,
                color: netImpact >= 0 ? "#4caf50" : "#ff6b6b",
              },
            ];
            // Scale to the largest value (with minimum 15% width for visibility)
            const maxValue = Math.max(...bars.map((bar) => bar.amount));

            return (
              <div className={styles.monthlyCashFlow}>
                <h5>Monthly Cash Flow Impact</h5>
                <div className={styles.cashFlowBars}>
                  {bars.map((bar) => (
                    <div key={bar.label} className={styles.cashFlowItem}>
                      <div className={styles.cashFlowLabel}>{bar.label}</div>
                      <div className={styles.cashFlowBarContainer}>
                        <div
                          className={styles.cashFlowBar}
                          style={{
                            width: `${Math.max(
                              (bar.amount / maxValue) * 100,
                              15,
                            )}%`,
                            background: bar.background,
                          }}
                        />
                        <span
                          className={styles.cashFlowValue}
                          style={{ color: bar.color }}
                        >
                          {bar.text}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
