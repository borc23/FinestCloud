'use client'

import styles from './ShadeTooltip.module.css'

interface ShadeTooltipProps {
  visible: boolean
  x: number
  y: number
  data: {
    panelIndex: number
    annualFlux?: number  // Annual solar flux in kWh/m²/year
  } | null
}

/**
 * Tooltip showing detailed solar flux information for a panel
 */
export default function ShadeTooltip({ visible, x, y, data }: ShadeTooltipProps) {
  if (!visible || !data) return null

  const getFluxCategory = (flux: number): string => {
    if (flux > 1400) return 'Excellent'
    if (flux > 1200) return 'Good'
    if (flux > 1000) return 'Moderate'
    if (flux > 800) return 'Low'
    return 'Very Low'
  }

  const getCategoryColor = (flux: number): string => {
    if (flux > 1400) return '#00C853'
    if (flux > 1200) return '#64DD17'
    if (flux > 1000) return '#FFD600'
    if (flux > 800) return '#FF6D00'
    return '#DD2C00'
  }

  const annualFlux = data.annualFlux ?? 0

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
          style={{ backgroundColor: getCategoryColor(annualFlux) }}
        >
          {getFluxCategory(annualFlux)}
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.row}>
          <span className={styles.label}>Annual Solar Flux:</span>
          <span className={styles.value}>{annualFlux.toFixed(0)} kWh/m²</span>
        </div>
      </div>
    </div>
  )
}
