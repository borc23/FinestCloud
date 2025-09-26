'use client'

import { useState } from 'react'
import styles from './StatsPanel.module.css'

interface StatsPanelProps {
  isVisible: boolean
  stats: {
    panelCount: number
    maxPanels: number
    capacity: number
    annualEnergy: number
    annualSavings: number
    co2Reduction: number
  }
}

export default function StatsPanel({ isVisible, stats }: StatsPanelProps) {
  const [isMinimized, setIsMinimized] = useState(false)

  if (!isVisible) return null

  const progress = stats.maxPanels > 0 ? (stats.panelCount / stats.maxPanels) * 100 : 0

  return (
    <div className={`${styles.statsPanel} ${isMinimized ? styles.minimized : ''}`}>
      <div className={styles.panelHeader}>
        <div className={styles.headerContent}>
          <div className={styles.headerIcon}>
            <i className="fas fa-chart-line"></i>
          </div>
          <div className={styles.headerText}>
            <h3 className={styles.panelTitle}>Live Stats</h3>
            <p className={styles.panelSubtitle}>Real-time analysis</p>
          </div>
        </div>
        <button
          className={styles.minimizeButton}
          onClick={() => setIsMinimized(!isMinimized)}
          aria-label={isMinimized ? 'Expand panel' : 'Minimize panel'}
        >
          <i className={`fas ${isMinimized ? 'fa-expand' : 'fa-compress'}`}></i>
        </button>
      </div>

      <div className={styles.panelContent}>
        {/* Main Metrics */}
        <div className={styles.mainMetrics}>
          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <i className="fas fa-solar-panel"></i>
              </div>
              <div className={styles.metricInfo}>
                <div className={styles.metricValue}>
                  {stats.panelCount}
                  <span className={styles.metricUnit}>/{stats.maxPanels}</span>
                </div>
                <div className={styles.metricLabel}>Solar Panels</div>
              </div>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className={styles.progressText}>
              {progress.toFixed(0)}% of maximum capacity
            </div>
          </div>

          <div className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <div className={styles.metricIcon}>
                <i className="fas fa-bolt"></i>
              </div>
              <div className={styles.metricInfo}>
                <div className={styles.metricValue}>
                  {stats.capacity.toFixed(1)}
                  <span className={styles.metricUnit}>kW</span>
                </div>
                <div className={styles.metricLabel}>System Capacity</div>
              </div>
            </div>
          </div>
        </div>

        {/* Secondary Metrics */}
        <div className={styles.secondaryMetrics}>
          <div className={styles.metricRow}>
            <div className={styles.metricSmall}>
              <div className={styles.metricSmallIcon}>
                <i className="fas fa-leaf"></i>
              </div>
              <div>
                <div className={styles.metricSmallValue}>
                  {(stats.annualEnergy / 1000).toFixed(1)}k
                </div>
                <div className={styles.metricSmallLabel}>kWh/year</div>
              </div>
            </div>

            <div className={styles.metricSmall}>
              <div className={styles.metricSmallIcon}>
                <div className={styles.metricSmallIconDollar}>$</div>
              </div>
              <div>
                <div className={styles.metricSmallValue}>
                  {(stats.annualSavings / 1000).toFixed(1)}k
                </div>
                <div className={styles.metricSmallLabel}>savings/year</div>
              </div>
            </div>
          </div>

          <div className={styles.metricRow}>
            <div className={styles.metricSmall}>
              <div className={styles.metricSmallIcon}>
                <i className="fas fa-cloud"></i>
              </div>
              <div>
                <div className={styles.metricSmallValue}>
                  {(stats.co2Reduction / 1000).toFixed(1)}
                </div>
                <div className={styles.metricSmallLabel}>tons CO₂/year</div>
              </div>
            </div>

            <div className={styles.metricSmall}>
              <div className={styles.metricSmallIcon}>
                <i className="fas fa-home"></i>
              </div>
              <div>
                <div className={styles.metricSmallValue}>
                  {Math.round(stats.annualEnergy / 10000)}
                </div>
                <div className={styles.metricSmallLabel}>homes powered</div>
              </div>
            </div>
          </div>
        </div>

        {/* Action Button */}
        <button className={`btn btn-primary ${styles.actionButton}`}>
          <i className="fas fa-file-download"></i>
          Generate Report
        </button>
      </div>
    </div>
  )
}