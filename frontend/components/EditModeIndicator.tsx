'use client'

import styles from './EditModeIndicator.module.css'

interface EditModeIndicatorProps {
  isActive: boolean
  selectedCount: number
}

export default function EditModeIndicator({ isActive, selectedCount }: EditModeIndicatorProps) {
  if (!isActive) return null

  return (
    <div className={styles.indicator}>
      <div className={styles.content}>
        <i className="fas fa-pen-to-square"></i>
        <span className={styles.text}>Edit Mode</span>
        {selectedCount > 0 && (
          <span className={styles.badge}>{selectedCount} selected</span>
        )}
      </div>
      <div className={styles.hint}>
        <span>Press ESC to deselect • Del to delete • Ctrl+Click for multi-select</span>
      </div>
    </div>
  )
}