'use client'

import { useState, useEffect } from 'react'
import styles from './ContextualPanel.module.css'

interface ContextualPanelProps {
  isVisible: boolean
  onClose: () => void
  tool: string
  position: 'left' | 'right'
}

export default function ContextualPanel({ isVisible, onClose, tool, position = 'right' }: ContextualPanelProps) {
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setIsAnimating(true)
      const timer = setTimeout(() => setIsAnimating(false), 300)
      return () => clearTimeout(timer)
    }
  }, [isVisible])

  const renderPanelContent = () => {
    switch (tool) {
      case 'upload':
        return (
          <div className={styles.panelContent}>
            <div className={styles.panelHeader}>
              <div className={styles.headerIcon}>
                <i className="fas fa-cloud-upload-alt"></i>
              </div>
              <div>
                <h3 className={styles.panelTitle}>Upload Image</h3>
                <p className={styles.panelSubtitle}>Import satellite or aerial images</p>
              </div>
            </div>

            <div className={styles.uploadZone}>
              <div className={styles.uploadIcon}>
                <i className="fas fa-image"></i>
              </div>
              <p>Drag & drop your image here</p>
              <button className="btn btn-glass">Choose File</button>
            </div>

            <div className={styles.uploadOptions}>
              <h4>Supported formats:</h4>
              <div className={styles.formatTags}>
                <span className={styles.formatTag}>JPG</span>
                <span className={styles.formatTag}>PNG</span>
                <span className={styles.formatTag}>WebP</span>
              </div>
            </div>
          </div>
        )

      case 'select':
        return (
          <div className={styles.panelContent}>
            <div className={styles.panelHeader}>
              <div className={styles.headerIcon}>
                <i className="fas fa-vector-square"></i>
              </div>
              <div>
                <h3 className={styles.panelTitle}>Select Area</h3>
                <p className={styles.panelSubtitle}>Choose roof areas for analysis</p>
              </div>
            </div>

            <div className={styles.toolOptions}>
              <button className="btn btn-glass">
                <i className="fas fa-mouse-pointer"></i>
                Auto Detect
              </button>
              <button className="btn btn-glass">
                <i className="fas fa-draw-polygon"></i>
                Manual Select
              </button>
            </div>

            <div className={styles.instructions}>
              <h4>Instructions:</h4>
              <ol>
                <li>Click "Auto Detect" for AI detection</li>
                <li>Or draw manually around roof areas</li>
                <li>Adjust selections as needed</li>
              </ol>
            </div>
          </div>
        )

      case 'panels':
        return (
          <div className={styles.panelContent}>
            <div className={styles.panelHeader}>
              <div className={styles.headerIcon}>
                <i className="fas fa-solar-panel"></i>
              </div>
              <div>
                <h3 className={styles.panelTitle}>Solar Panels</h3>
                <p className={styles.panelSubtitle}>Generate optimal panel layout</p>
              </div>
            </div>

            <div className={styles.panelSettings}>
              <div className={styles.settingGroup}>
                <label>Panel Type:</label>
                <select className={styles.select}>
                  <option>Standard (320W)</option>
                  <option>Premium (400W)</option>
                  <option>Compact (280W)</option>
                </select>
              </div>

              <div className={styles.settingGroup}>
                <label>Spacing:</label>
                <input type="range" min="0.5" max="2" step="0.1" defaultValue="1" className={styles.slider} />
                <span>1.0m</span>
              </div>
            </div>

            <button className="btn btn-primary" style={{ width: '100%' }}>
              <i className="fas fa-magic"></i>
              Generate Layout
            </button>
          </div>
        )

      case 'edit':
        return (
          <div className={styles.panelContent}>
            <div className={styles.panelHeader}>
              <div className={styles.headerIcon}>
                <i className="fas fa-pen-to-square"></i>
              </div>
              <div>
                <h3 className={styles.panelTitle}>Edit Mode</h3>
                <p className={styles.panelSubtitle}>Modify selections and panels</p>
              </div>
            </div>

            <div className={styles.editTools}>
              <button className="btn btn-glass">
                <i className="fas fa-mouse-pointer"></i>
                Select
              </button>
              <button className="btn btn-glass">
                <i className="fas fa-move"></i>
                Move
              </button>
              <button className="btn btn-glass">
                <i className="fas fa-sync-alt"></i>
                Rotate
              </button>
              <button className="btn btn-glass">
                <i className="fas fa-trash"></i>
                Delete
              </button>
            </div>

            <div className={styles.editOptions}>
              <div className={styles.toggleOption}>
                <span>Snap to Grid</span>
                <label className={styles.toggle}>
                  <input type="checkbox" defaultChecked />
                  <span className={styles.toggleSlider}></span>
                </label>
              </div>
            </div>
          </div>
        )

      case 'analyze':
        return (
          <div className={styles.panelContent}>
            <div className={styles.panelHeader}>
              <div className={styles.headerIcon}>
                <i className="fas fa-chart-line"></i>
              </div>
              <div>
                <h3 className={styles.panelTitle}>Analysis</h3>
                <p className={styles.panelSubtitle}>Performance metrics & insights</p>
              </div>
            </div>

            <div className={styles.metricsGrid}>
              <div className={styles.metric}>
                <div className={styles.metricValue}>0</div>
                <div className={styles.metricLabel}>Panels</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricValue}>0 kW</div>
                <div className={styles.metricLabel}>Capacity</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricValue}>0 kWh</div>
                <div className={styles.metricLabel}>Annual Energy</div>
              </div>
              <div className={styles.metric}>
                <div className={styles.metricValue}>$0</div>
                <div className={styles.metricLabel}>Annual Savings</div>
              </div>
            </div>
          </div>
        )

      default:
        return <div className={styles.panelContent}>Select a tool to get started</div>
    }
  }

  if (!isVisible) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className={styles.backdrop}
        onClick={onClose}
      />

      {/* Panel */}
      <div className={`${styles.panel} ${styles[position]} ${isAnimating ? styles.animating : ''}`}>
        <div className={styles.panelContainer}>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>

          {renderPanelContent()}
        </div>
      </div>
    </>
  )
}