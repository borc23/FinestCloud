/**
 * Financing Comparison Table Component
 * Displays comparison of cash, KfW loan, and standard loan options
 */

import React from 'react'
import styles from './FinancialCalculator.module.css'
import type { FinancialResults } from '@/features/financial/types/financial'

interface FinancingScenario {
  type: 'cash' | 'kfw' | 'loan'
  monthlyPayment: number
  totalInterest: number
  totalCost: number
}

interface FinancingComparisonTableProps {
  financingScenarios: {
    cash: FinancingScenario
    kfw: FinancingScenario
    standardLoan: FinancingScenario
  }
  financingType: 'cash' | 'kfw' | 'loan'
  kfwInterestRate: number
  customInterestRate: number
  loanTerm: number
  results: FinancialResults
}

export default function FinancingComparisonTable({
  financingScenarios,
  financingType,
  kfwInterestRate,
  customInterestRate,
  loanTerm,
  results
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
                <strong>
                  {results.avgMonthlySavings > financingScenarios.kfw.monthlyPayment ? '+' : ''}
                  €{results.avgMonthlySavings - financingScenarios.kfw.monthlyPayment}
                </strong>
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
                <strong>
                  {results.avgMonthlySavings > financingScenarios.standardLoan.monthlyPayment ? '+' : ''}
                  €{results.avgMonthlySavings - financingScenarios.standardLoan.monthlyPayment}
                </strong>
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
                  {results.avgMonthlySavings > (financingType === 'kfw' ? financingScenarios.kfw.monthlyPayment : financingScenarios.standardLoan.monthlyPayment) ? '+' : ''}
                  €{results.avgMonthlySavings - (financingType === 'kfw' ? financingScenarios.kfw.monthlyPayment : financingScenarios.standardLoan.monthlyPayment)}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
