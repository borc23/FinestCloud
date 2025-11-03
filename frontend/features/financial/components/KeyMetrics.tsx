/**
 * Key Metrics Component
 * Displays the main financial metrics in a card grid
 * Memoized for performance - only re-renders when results change
 */

import { memo } from 'react'
import styles from './FinancialCalculator.module.css'
import type { FinancialResults } from '@/features/financial/types/financial'

interface KeyMetricsProps {
  results: FinancialResults
  discountRate: number
}

const KeyMetrics = memo(function KeyMetrics({ results, discountRate }: KeyMetricsProps) {
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
}, (prevProps, nextProps) => {
  return prevProps.results.npv === nextProps.results.npv &&
         prevProps.results.roi === nextProps.results.roi &&
         prevProps.results.irr === nextProps.results.irr &&
         prevProps.results.paybackPeriod === nextProps.results.paybackPeriod &&
         prevProps.results.twentyFiveYearSavings === nextProps.results.twentyFiveYearSavings &&
         prevProps.discountRate === nextProps.discountRate
})

export default KeyMetrics
