'use client'

import styles from './EditDrawTabBar.module.css'
import type { DrawingMode } from '../types/drawing'

export type EditTab = 'edit' | 'draw'
export type DrawingSubMode = DrawingMode | 'panel'

interface EditDrawTabBarProps {
  activeTab: EditTab
  drawingType: DrawingSubMode
  onTabChange: (tab: EditTab) => void
  onDrawingTypeChange: (type: DrawingSubMode) => void
  hasPanels?: boolean
}

export default function EditDrawTabBar({
  activeTab,
  drawingType,
  onTabChange,
  onDrawingTypeChange,
  hasPanels = false
}: EditDrawTabBarProps) {
  return (
    <div className={styles.container}>
      {/* Drawing Type Toggle - only shown when Draw tab is active */}
      {activeTab === 'draw' && (
        <div className={styles.drawingTypeToggle}>
          <button
            className={`${styles.typeOption} ${drawingType === 'roof' ? styles.active : ''}`}
            onClick={() => onDrawingTypeChange('roof')}
          >
            Roof
          </button>
          <button
            className={`${styles.typeOption} ${drawingType === 'object' ? styles.active : ''}`}
            onClick={() => onDrawingTypeChange('object')}
          >
            Object
          </button>
          {hasPanels && (
            <button
              className={`${styles.typeOption} ${styles.panelOption} ${drawingType === 'panel' ? styles.active : ''}`}
              onClick={() => onDrawingTypeChange('panel')}
            >
              Panel
            </button>
          )}
        </div>
      )}

      {/* Main Tab Bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'edit' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('edit')}
          aria-label="Edit mode"
          aria-pressed={activeTab === 'edit'}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m6 6V3"/>
          </svg>
          <span className={styles.label}>Edit</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'draw' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('draw')}
          aria-label="Draw mode"
          aria-pressed={activeTab === 'draw'}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>
          </svg>
          <span className={styles.label}>Draw</span>
        </button>
      </div>
    </div>
  )
}