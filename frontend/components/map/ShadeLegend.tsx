'use client'

import styles from './ShadeLegend.module.css'

interface ShadeLegendProps {
  visible: boolean
}

/**
 * Legend showing shade percentage color coding
 */
export default function ShadeLegend({ visible }: ShadeLegendProps) {
  if (!visible) return null

  return (
    <div className={styles.legend}>
      <div className={styles.header}>
        <i className="fas fa-sun"></i>
        <span>Shade Analysis</span>
      </div>
      <div className={styles.items}>
        <div className={styles.item}>
          <div className={styles.colorBox} style={{ background: '#00C853' }}></div>
          <span className={styles.label}>0-5%</span>
          <span className={styles.description}>Excellent</span>
        </div>
        <div className={styles.item}>
          <div className={styles.colorBox} style={{ background: '#64DD17' }}></div>
          <span className={styles.label}>5-15%</span>
          <span className={styles.description}>Good</span>
        </div>
        <div className={styles.item}>
          <div className={styles.colorBox} style={{ background: '#FFD600' }}></div>
          <span className={styles.label}>15-25%</span>
          <span className={styles.description}>Moderate</span>
        </div>
        <div className={styles.item}>
          <div className={styles.colorBox} style={{ background: '#FF6D00' }}></div>
          <span className={styles.label}>25-40%</span>
          <span className={styles.description}>Significant</span>
        </div>
        <div className={styles.item}>
          <div className={styles.colorBox} style={{ background: '#DD2C00' }}></div>
          <span className={styles.label}>40%+</span>
          <span className={styles.description}>High Shade</span>
        </div>
      </div>
    </div>
  )
}
