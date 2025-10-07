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
      {selectedCount > 0 && (
        <span className={styles.count}>{selectedCount}</span>
      )}
    </div>
  )
}