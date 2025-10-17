'use client'

import { useState } from 'react'
import styles from './ShadeLegend.module.css'

interface ShadeLegendProps {
  visible: boolean
  panelStats?: {
    excellent: number  // 0-5%
    good: number       // 5-15%
    moderate: number   // 15-25%
    significant: number // 25-40%
    high: number       // 40%+
    total: number
    averageShade: number
  }
}

/**
 * Legend showing shade percentage color coding with panel statistics
 */
export default function ShadeLegend({ visible, panelStats }: ShadeLegendProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  if (!visible) return null

  return (
    <div className={`${styles.legend} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.header} onClick={() => setIsCollapsed(!isCollapsed)}>
        <div className={styles.headerLeft}>
          <i className="fas fa-sun"></i>
          <span>Shade Analysis</span>
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
                <span className={styles.summaryLabel}>Average Shade:</span>
                <span className={styles.summaryValue}>{panelStats.averageShade.toFixed(1)}%</span>
              </div>
            </div>
          )}

          <div className={styles.items}>
            <div className={styles.item}>
              <div className={styles.colorBox} style={{ background: '#00C853' }}></div>
              <span className={styles.label}>0-5%</span>
              <span className={styles.description}>Excellent</span>
              {panelStats && panelStats.excellent > 0 && (
                <span className={styles.count}>({panelStats.excellent})</span>
              )}
            </div>
            <div className={styles.item}>
              <div className={styles.colorBox} style={{ background: '#64DD17' }}></div>
              <span className={styles.label}>5-15%</span>
              <span className={styles.description}>Good</span>
              {panelStats && panelStats.good > 0 && (
                <span className={styles.count}>({panelStats.good})</span>
              )}
            </div>
            <div className={styles.item}>
              <div className={styles.colorBox} style={{ background: '#FFD600' }}></div>
              <span className={styles.label}>15-25%</span>
              <span className={styles.description}>Moderate</span>
              {panelStats && panelStats.moderate > 0 && (
                <span className={styles.count}>({panelStats.moderate})</span>
              )}
            </div>
            <div className={styles.item}>
              <div className={styles.colorBox} style={{ background: '#FF6D00' }}></div>
              <span className={styles.label}>25-40%</span>
              <span className={styles.description}>Significant</span>
              {panelStats && panelStats.significant > 0 && (
                <span className={styles.count}>({panelStats.significant})</span>
              )}
            </div>
            <div className={styles.item}>
              <div className={styles.colorBox} style={{ background: '#DD2C00' }}></div>
              <span className={styles.label}>40%+</span>
              <span className={styles.description}>High Shade</span>
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
