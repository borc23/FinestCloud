'use client'

import { useEffect } from 'react'
import styles from './GridSelector.module.css'

interface GridSelectorProps {
  selectedGridId: number | null
  availableGrids: number[]
  onGridSelect: (gridId: number) => void
  isVisible: boolean
}

export default function GridSelector({
  selectedGridId,
  availableGrids,
  onGridSelect,
  isVisible
}: GridSelectorProps) {
  // Keyboard shortcuts
  useEffect(() => {
    if (!isVisible || availableGrids.length === 0) return

    const handleKeyDown = (e: KeyboardEvent) => {
      // Tab key to cycle through grids
      if (e.key === 'Tab') {
        e.preventDefault()
        const currentIndex = selectedGridId !== null ? availableGrids.indexOf(selectedGridId) : -1
        const nextIndex = (currentIndex + 1) % availableGrids.length
        onGridSelect(availableGrids[nextIndex])
      }
      // Number keys 1-9 for direct selection
      const num = parseInt(e.key)
      if (num >= 1 && num <= availableGrids.length) {
        e.preventDefault()
        onGridSelect(availableGrids[num - 1])
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isVisible, availableGrids, selectedGridId, onGridSelect])

  if (!isVisible || availableGrids.length === 0) return null

  return (
    <div className={styles.gridSelector}>
      <span className={styles.label}>Roof</span>
      <div className={styles.gridButtons}>
        {availableGrids.map((gridId, index) => (
          <button
            key={gridId}
            className={`${styles.gridButton} ${selectedGridId === gridId ? styles.active : ''}`}
            onClick={() => onGridSelect(gridId)}
            title={`Roof ${index + 1} (Press ${index + 1})`}
          >
            {index + 1}
          </button>
        ))}
      </div>
      <span className={styles.hint}>⇥ Tab</span>
    </div>
  )
}
