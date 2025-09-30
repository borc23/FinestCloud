'use client'

import styles from './DrawingToolbar.module.css'

interface DrawingToolbarProps {
  isVisible: boolean
  isDrawing: boolean
  drawingType: 'roof' | 'object' | null
  pointCount: number
  onStartDrawing: (type: 'roof' | 'object') => void
  onCancelDrawing: () => void
  onCompleteDrawing: () => void
}

export default function DrawingToolbar({
  isVisible,
  isDrawing,
  drawingType,
  pointCount,
  onStartDrawing,
  onCancelDrawing,
  onCompleteDrawing
}: DrawingToolbarProps) {
  if (!isVisible) return null

  return (
    <div className={styles.toolbar}>
      {!isDrawing ? (
        <div className={styles.segmentedControl}>
          <button
            className={`${styles.segment} ${styles.roofSegment}`}
            onClick={() => onStartDrawing('roof')}
          >
            Roof
          </button>
          <button
            className={`${styles.segment} ${styles.objectSegment}`}
            onClick={() => onStartDrawing('object')}
          >
            Object
          </button>
        </div>
      ) : (
        <div className={styles.drawingControls}>
          <div className={styles.counter}>
            {pointCount}
          </div>
          <div className={styles.actions}>
            <button
              className={styles.cancelButton}
              onClick={onCancelDrawing}
            >
              Cancel
            </button>
            <button
              className={styles.doneButton}
              onClick={onCompleteDrawing}
              disabled={pointCount < 3}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  )
}