'use client'

import styles from './EditDrawTabBar.module.css'

interface EditDrawTabBarProps {
  activeTab: 'edit' | 'draw'
  drawingType: 'roof' | 'object'
  onTabChange: (tab: 'edit' | 'draw') => void
  onDrawingTypeChange: (type: 'roof' | 'object') => void
}

export default function EditDrawTabBar({
  activeTab,
  drawingType,
  onTabChange,
  onDrawingTypeChange
}: EditDrawTabBarProps) {
  return (
    <div className={styles.container}>
      {/* Drawing Type Toggle - only shown when Draw tab is active */}
      {activeTab === 'draw' && (
        <div className={styles.drawingTypeToggle}>
          <div
            className={`${styles.toggleSwitch} ${drawingType === 'roof' ? styles.roofActive : styles.objectActive}`}
            onClick={() => onDrawingTypeChange(drawingType === 'roof' ? 'object' : 'roof')}
          >
            <div className={`${styles.typeButton} ${drawingType === 'roof' ? styles.roofActive : styles.objectActive}`}>
              {drawingType === 'roof' ? 'Roof' : 'Object'}
            </div>
            <div className={styles.toggleLabels}>
              <span className={`${styles.toggleText} ${styles.roofLabel} ${drawingType === 'roof' ? styles.hidden : ''}`}>Roof</span>
              <span className={`${styles.toggleText} ${styles.objectLabel} ${drawingType === 'object' ? styles.hidden : ''}`}>Object</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Tab Bar */}
      <div className={styles.tabBar}>
        <button
          className={`${styles.tab} ${activeTab === 'edit' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('edit')}
        >
          <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2v-4M9 21H5a2 2 0 0 1-2-2v-4m6 6V3"/>
          </svg>
          <span className={styles.label}>Edit</span>
        </button>
        <button
          className={`${styles.tab} ${activeTab === 'draw' ? styles.tabActive : ''}`}
          onClick={() => onTabChange('draw')}
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