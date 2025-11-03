/**
 * Key Metrics Component
 * Displays the main financial metrics in a card grid
 */

import React from 'react'
import styles from './FinancialCalculator.module.css'
import type { FinancialResults } from '@/features/financial/types/financial'

interface KeyMetricsProps {
  results: FinancialResults
  discountRate: number
}

export default function KeyMetrics({ results, discountRate }: KeyMetricsProps) {
  return (
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
  )
}
