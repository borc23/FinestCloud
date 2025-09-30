'use client'

import { useEffect } from 'react'
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
      <div className={styles.container}>
        {!isDrawing ? (
          <>
            <div className={styles.header}>
              <i className="fas fa-draw-polygon"></i>
              <h3>Create Polygon</h3>
            </div>
            <div className={styles.buttons}>
              <button
                className={`${styles.button} ${styles.roofButton}`}
                onClick={() => onStartDrawing('roof')}
              >
                <i className="fas fa-home"></i>
                <span>Draw Roof</span>
              </button>
              <button
                className={`${styles.button} ${styles.objectButton}`}
                onClick={() => onStartDrawing('object')}
              >
                <i className="fas fa-cube"></i>
                <span>Draw Object</span>
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.header}>
              <div className={styles.statusIndicator}>
                <div className={styles.pulse}></div>
                <span>Drawing {drawingType === 'roof' ? 'Roof' : 'Object'}</span>
              </div>
              <div className={styles.pointCount}>{pointCount} points</div>
            </div>
            <div className={styles.hint}>
              <p>Click to add points • Click first point or press Complete to finish • ESC to cancel</p>
            </div>
            <div className={styles.actions}>
              <button
                className={`${styles.actionButton} ${styles.cancelButton}`}
                onClick={onCancelDrawing}
              >
                <i className="fas fa-times"></i>
                Cancel
              </button>
              <button
                className={`${styles.actionButton} ${styles.completeButton}`}
                onClick={onCompleteDrawing}
                disabled={pointCount < 3}
              >
                <i className="fas fa-check"></i>
                Complete
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}