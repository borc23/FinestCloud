'use client'

import { memo, useCallback } from 'react'
import styles from './DrawingToolbar.module.css'
import type { DrawingMode } from '../types/drawing'

export const DRAWING_MODES = {
  ROOF: 'roof' as const,
  OBJECT: 'object' as const,
}

interface DrawingToolbarProps {
  isVisible: boolean
  onStartDrawing: (type: DrawingMode) => void
  activeMode?: DrawingMode | null
  'aria-label'?: string
}

function DrawingToolbar({
  isVisible,
  onStartDrawing,
  activeMode = null,
  'aria-label': ariaLabel = 'Drawing mode selection'
}: DrawingToolbarProps) {
  if (!isVisible) return null

  const handleDrawingStart = useCallback(
    (mode: DrawingMode) => {
      try {
        onStartDrawing(mode)
      } catch (error) {
        console.error(`Failed to start drawing mode: ${mode}`, error)
      }
    },
    [onStartDrawing]
  )

  return (
    <div className={styles.toolbar} data-testid="drawing-toolbar">
      <div 
        className={styles.segmentedControl}
        role="group"
        aria-label={ariaLabel}
      >
        <button
          className={`${styles.segment} ${styles.roofSegment} ${
            activeMode === DRAWING_MODES.ROOF ? styles.selected : ''
          }`}
          onClick={() => handleDrawingStart(DRAWING_MODES.ROOF)}
          type="button"
          aria-pressed={activeMode === DRAWING_MODES.ROOF}
          data-testid="roof-button"
        >
          Roof
        </button>
        <button
          className={`${styles.segment} ${styles.objectSegment} ${
            activeMode === DRAWING_MODES.OBJECT ? styles.selected : ''
          }`}
          onClick={() => handleDrawingStart(DRAWING_MODES.OBJECT)}
          type="button"
          aria-pressed={activeMode === DRAWING_MODES.OBJECT}
          data-testid="object-button"
        >
          Object
        </button>
      </div>
    </div>
  )
}

export default memo(DrawingToolbar)
