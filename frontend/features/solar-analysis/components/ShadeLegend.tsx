'use client'

import { useState } from 'react'
import styles from './ShadeLegend.module.css'

interface ShadeLegendProps {
  visible: boolean
  panelStats?: {
    excellent: number  // > 1400 kWh/m²/year
    good: number       // 1200-1400 kWh/m²/year
    moderate: number   // 1000-1200 kWh/m²/year
    significant: number // 800-1000 kWh/m²/year
    high: number       // < 800 kWh/m²/year
    total: number
    averageShade: number // Average annual flux
  }
}

/**
 * Legend showing annual solar flux color coding with panel statistics
 */
export default function ShadeLegend({ visible, panelStats }: ShadeLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (!visible) return null

  return (
    <div className={`${styles.legend} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.header} onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className={styles.headerLeft}>
          <i className="fas fa-sun"></i>
          <span>Solar Flux Analysis</span>
        </div>
        <button
          className={styles.collapseButton}
          onClick={(e) => {
            e.stopPropagation()
            setIsCollapsed(!isCollapsed)
          }}
          aria-label={isCollapsed ? "Expand legend" : "Collapse legend"}
        >
          <i className={`fas fa-chevron-${isCollapsed ? 'down' : 'up'}`}></i>
        </button>
      </div>

      {!isCollapsed && (
        <>
          {panelStats && (
            <div className={styles.summary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Total Panels:</span>
                <span className={styles.summaryValue}>{panelStats.total}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Avg Solar Flux:</span>
                <span className={styles.summaryValue}>{panelStats.averageShade.toFixed(0)} kWh/m²</span>
              </div>
            </div>
          )}

          <div className={styles.items}>
            <div className={styles.item}>
              <div className={styles.colorBox} style={{ background: '#00C853' }}></div>
              <span className={styles.label}>&gt;1400</span>
              <span className={styles.description}>Excellent</span>
              {panelStats && panelStats.excellent > 0 && (
                <span className={styles.count}>({panelStats.excellent})</span>
              )}
            </div>
            <div className={styles.item}>
              <div className={styles.colorBox} style={{ background: '#64DD17' }}></div>
              <span className={styles.label}>1200-1400</span>
              <span className={styles.description}>Good</span>
              {panelStats && panelStats.good > 0 && (
                <span className={styles.count}>({panelStats.good})</span>
              )}
            </div>
            <div className={styles.item}>
              <div className={styles.colorBox} style={{ background: '#FFD600' }}></div>
              <span className={styles.label}>1000-1200</span>
              <span className={styles.description}>Moderate</span>
              {panelStats && panelStats.moderate > 0 && (
                <span className={styles.count}>({panelStats.moderate})</span>
              )}
            </div>
            <div className={styles.item}>
              <div className={styles.colorBox} style={{ background: '#FF6D00' }}></div>
              <span className={styles.label}>800-1000</span>
              <span className={styles.description}>Low</span>
              {panelStats && panelStats.significant > 0 && (
                <span className={styles.count}>({panelStats.significant})</span>
              )}
            </div>
            <div className={styles.item}>
              <div className={styles.colorBox} style={{ background: '#DD2C00' }}></div>
              <span className={styles.label}>&lt;800</span>
              <span className={styles.description}>Very Low</span>
              {panelStats && panelStats.high > 0 && (
                <span className={styles.count}>({panelStats.high})</span>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
