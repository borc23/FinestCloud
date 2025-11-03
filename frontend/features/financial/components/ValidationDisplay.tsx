/**
 * Validation Display Component
 * Shows validation errors and warnings to the user
 */

import React from 'react'
import styles from './FinancialCalculator.module.css'
import type { ValidationResult } from '@/features/financial/utils/validation'

interface ValidationDisplayProps {
  validation: ValidationResult
}

export default function ValidationDisplay({ validation }: ValidationDisplayProps) {
  return (
    <>
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
}
