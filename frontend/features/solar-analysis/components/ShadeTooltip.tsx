'use client'

import styles from './ShadeTooltip.module.css'

interface ShadeTooltipProps {
  visible: boolean
  x: number
  y: number
  data: {
    panelIndex: number
    shadePercentage: number
    shadeLossFactor: number
    sunshineHours?: number
    productionLoss?: number
    segmentInfo?: {
      pitch: number
      azimuth: number
    }
  } | null
}

/**
 * Tooltip showing detailed shade information for a panel
 */
export default function ShadeTooltip({ visible, x, y, data }: ShadeTooltipProps) {
  if (!visible || !data) return null

  const getShadeCategory = (shade: number): string => {
    if (shade < 5) return 'Excellent'
    if (shade < 15) return 'Good'
    if (shade < 25) return 'Moderate'
    if (shade < 40) return 'Significant'
    return 'High Shade'
  }

  const getCategoryColor = (shade: number): string => {
    if (shade < 5) return '#00C853'
    if (shade < 15) return '#64DD17'
    if (shade < 25) return '#FFD600'
    if (shade < 40) return '#FF6D00'
    return '#DD2C00'
  }

  return (
    <div
      className={styles.tooltip}
      style={{
        left: `${x}px`,
        top: `${y}px`,
      }}
    >
      <div className={styles.header}>
        <span className={styles.title}>Panel #{data.panelIndex + 1}</span>
        <div
          className={styles.categoryBadge}
          style={{ backgroundColor: getCategoryColor(data.shadePercentage) }}
        >
          {getShadeCategory(data.shadePercentage)}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.row}>
          <span className={styles.label}>Shade Impact:</span>
          <span className={styles.value}>{data.shadePercentage.toFixed(1)}%</span>
        </div>

        <div className={styles.row}>
          <span className={styles.label}>Production Factor:</span>
          <span className={styles.value}>{(data.shadeLossFactor * 100).toFixed(1)}%</span>
        </div>

        {data.sunshineHours && (
          <div className={styles.row}>
            <span className={styles.label}>Sunshine Hours:</span>
            <span className={styles.value}>{data.sunshineHours.toLocaleString()} hrs/year</span>
          </div>
        )}

        {data.productionLoss && (
          <div className={styles.row}>
            <span className={styles.label}>Est. Loss:</span>
            <span className={styles.value}>{data.productionLoss.toFixed(0)} kWh/year</span>
          </div>
        )}

        {data.segmentInfo && (
          <>
            <div className={styles.divider}></div>
            <div className={styles.row}>
              <span className={styles.label}>Roof Pitch:</span>
              <span className={styles.value}>{data.segmentInfo.pitch.toFixed(0)}°</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Azimuth:</span>
              <span className={styles.value}>{data.segmentInfo.azimuth.toFixed(0)}°</span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
