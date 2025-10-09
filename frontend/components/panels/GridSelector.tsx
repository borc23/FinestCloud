'use client'

import { useEffect, useRef } from 'react'
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
  const containerRef = useRef<HTMLDivElement>(null)

  // Keyboard shortcut to cycle through grids
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
    <div ref={containerRef} className={styles.gridSelector}>
      <div className={styles.header}>
        <span className={styles.title}>Select Roof Grid</span>
        <span className={styles.hint}>Tab to cycle</span>
      </div>
      <div className={styles.gridButtons}>
        {availableGrids.map((gridId, index) => (
          <button
            key={gridId}
            className={`${styles.gridButton} ${selectedGridId === gridId ? styles.active : ''}`}
            onClick={() => onGridSelect(gridId)}
            title={`Select roof ${index + 1} (Press ${index + 1})`}
          >
            <span className={styles.gridNumber}>{index + 1}</span>
            <span className={styles.gridLabel}>Roof {index + 1}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
