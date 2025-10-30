/**
 * Sunshine Layer Controls Component
 * Toggle controls that appear when sunshine layer is active
 */

'use client'

import styles from './SunshineLayerControls.module.css'

interface SunshineLayerControlsProps {
  visible: boolean
  hidePanels: boolean
  onToggleHidePanels: (hide: boolean) => void
}

export default function SunshineLayerControls({
  visible,
  hidePanels,
  onToggleHidePanels
}: SunshineLayerControlsProps) {
  if (!visible) return null

  return (
    <div className={styles.sunshineControls}>
      <div className={styles.toggleRow}>
        <span className={styles.toggleIcon}>☀️</span>
        <span className={styles.toggleText}>Hide Panels</span>
        <label className={styles.toggleLabel}>
          <div className={styles.toggleSwitch}>
            <input
              type="checkbox"
              checked={hidePanels}
              onChange={(e) => onToggleHidePanels(e.target.checked)}
              className={styles.toggleInput}
            />
            <span className={styles.toggleSlider}></span>
          </div>
        </label>
      </div>
    </div>
  )
}
