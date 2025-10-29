'use client'

import { useState, useEffect } from 'react'
import styles from './EditModeIndicator.module.css'
import TrashZone from './TrashZone'
import { isMobileDevice } from '@/shared/utils/deviceDetection'

interface EditModeIndicatorProps {
  isActive: boolean
  selectedCount: number
  onDeleteSelected?: () => void
}

export default function EditModeIndicator({ isActive, selectedCount, onDeleteSelected }: EditModeIndicatorProps) {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    setIsMobile(isMobileDevice())
  }, [])

  if (!isActive) return null

  const handleDelete = () => {
    if (selectedCount > 0 && onDeleteSelected) {
      onDeleteSelected()
    }
  }

  const showTrashZone = isMobile && selectedCount > 0

  return (
    <>
      <div className={styles.indicator}>
        {selectedCount > 0 && (
          <span className={styles.count}>{selectedCount}</span>
        )}
      </div>
      <TrashZone
        isActive={showTrashZone}
        onDelete={handleDelete}
      />
    </>
  )
}