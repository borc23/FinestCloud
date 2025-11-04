/**
 * Validation Display Component
 * Shows validation errors and warnings to the user
 * Memoized for performance
 */

import { memo } from 'react'
import styles from './FinancialCalculator.module.css'
import type { ValidationResult } from '@/features/financial/utils/validation'

interface ValidationDisplayProps {
  validation: ValidationResult
}

const ValidationDisplay = memo(function ValidationDisplay({ validation }: ValidationDisplayProps) {
  return (
    <>
      {/* Critical Warnings (e.g., excessive shade) */}
      {validation.criticalWarnings && validation.criticalWarnings.length > 0 && (
        <div className={styles.errorBox} style={{ borderColor: '#ef4444', backgroundColor: '#fef2f2' }}>
          <div className={styles.errorIcon}>🚨</div>
          <div className={styles.errorContent}>
            <div className={styles.errorTitle} style={{ color: '#dc2626' }}>Critical Warning</div>
            {validation.criticalWarnings.map((warning, idx) => (
              <p key={idx} className={styles.errorText} style={{ color: '#991b1b' }}>{warning}</p>
            ))}
          </div>
        </div>
      )}

      {/* Validation Errors */}
      {!validation.isValid && validation.errors.length > 0 && (
        <div className={styles.errorBox}>
          <div className={styles.errorIcon}>⛔</div>
          <div className={styles.errorContent}>
            <div className={styles.errorTitle}>Invalid Inputs</div>
            {validation.errors.map((error, idx) => (
              <p key={idx} className={styles.errorText}>{error}</p>
            ))}
          </div>
        </div>
      )}

      {/* Validation Warnings */}
      {validation.warnings.length > 0 && (
        <div className={styles.warningBox}>
          <div className={styles.warningIcon}>⚠️</div>
          <div className={styles.warningContent}>
            <div className={styles.warningTitle}>Please Review</div>
            {validation.warnings.map((warning, idx) => (
              <p key={idx} className={styles.warningText}>{warning}</p>
            ))}
          </div>
        </div>
      )}
    </>
  )
}, (prevProps, nextProps) => {
  // Only re-render if validation state actually changed
  return prevProps.validation.isValid === nextProps.validation.isValid &&
         prevProps.validation.errors.length === nextProps.validation.errors.length &&
         prevProps.validation.warnings.length === nextProps.validation.warnings.length &&
         (prevProps.validation.criticalWarnings?.length ?? 0) === (nextProps.validation.criticalWarnings?.length ?? 0)
})

export default ValidationDisplay
