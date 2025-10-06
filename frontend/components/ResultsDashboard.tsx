'use client'

import styles from './ResultsDashboard.module.css'

interface ResultsDashboardProps {
  panelCount: number
  systemSize: number
  annualProduction?: number
  costEstimate?: number
}

export default function ResultsDashboard({
  panelCount,
  systemSize,
  annualProduction,
  costEstimate
}: ResultsDashboardProps) {
  return (
    <div className={styles.dashboard}>
      <div className={styles.summary}>
        <span className={styles.metric}>{panelCount} panels</span>
        <span className={styles.separator}>|</span>
        <span className={styles.metric}>{systemSize.toFixed(1)} kW</span>
        {annualProduction && (
          <>
            <span className={styles.separator}>|</span>
            <span className={styles.metric}>{annualProduction.toLocaleString()} kWh/year</span>
          </>
        )}
      </div>

      <div className={styles.details}>
        <div className={styles.detailItem}>
          <span className={styles.label}>Panel Count</span>
          <span className={styles.value}>{panelCount}</span>
        </div>

        <div className={styles.detailItem}>
          <span className={styles.label}>System Size</span>
          <span className={styles.value}>{systemSize.toFixed(1)} kW</span>
        </div>

        {annualProduction && (
          <div className={styles.detailItem}>
            <span className={styles.label}>Annual Production</span>
            <span className={styles.value}>{annualProduction.toLocaleString()} kWh/year</span>
          </div>
        )}

        {costEstimate && (
          <div className={styles.detailItem}>
            <span className={styles.label}>Estimated Cost</span>
            <span className={styles.value}>${costEstimate.toLocaleString()}</span>
          </div>
        )}
      </div>
    </div>
  )
}
