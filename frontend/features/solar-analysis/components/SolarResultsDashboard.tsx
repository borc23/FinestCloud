'use client'

import { useEffect } from 'react'
import styles from './SolarResultsDashboard.module.css'
import MonthlyProductionChart from './MonthlyProductionChart'
import FinancialCalculator from '@/features/financial/components/FinancialCalculator'
import ElectricalDesignPanel from '@/features/electrical/components//ElectricalDesignPanel'
import DashboardActions from './DashboardActions'
import { useSolarDashboardData } from '@/features/solar-analysis/hooks/useSolarDashboardData'
import { useDashboardModals } from '@/features/solar-analysis/hooks/useDashboardModals'
import { useSolarReportGenerator } from '@/features/solar-analysis/hooks/useSolarReportGenerator'
import {
  SolarResultsDashboardProps,
  DashboardSummaryProps,
  MetricItemProps
} from '@/features/solar-analysis/types/result_dashboard'

export default function SolarResultsDashboard(props: SolarResultsDashboardProps & {
  onMinimizeChange?: (minimized: boolean) => void
  onSaveProject?: () => void
  isAuthenticated?: boolean
  minimizeRef?: React.MutableRefObject<(() => void) | null>
}) {
  // Extract and prepare all dashboard data
  const {
    panelData,
    location,
    pvwattsData,
    isLoading,
    annualProduction,
    shadeImpact,
    costEstimate
  } = useSolarDashboardData(props)

  // Manage modal states
  const {
    showMonthlyChart,
    setShowMonthlyChart,
    showFinancials,
    setShowFinancials,
    showElectrical,
    setShowElectrical,
    isMinimized,
    setIsMinimized
  } = useDashboardModals({
    isEditMode: props.isEditMode,
    onMinimizeChange: props.onMinimizeChange
  })

  // PDF report generation
  const { handleGeneratePDF } = useSolarReportGenerator({
    panelData: panelData!,
    annualProduction,
    location,
    costEstimate,
    shadeImpact,
    capacityFactor: pvwattsData?.capacity_factor
  })

  // Expose minimize function to parent via ref
  useEffect(() => {
    if (props.minimizeRef) {
      props.minimizeRef.current = () => setIsMinimized(true)
    }
  }, [props.minimizeRef, setIsMinimized])

  if (!panelData) {
    return null
  }

  return (
    <>
      <div className={`${styles.dashboard} ${isMinimized ? styles.minimized : ''}`}>
        {isMinimized ? (
          <button
            className={styles.minimizedButton}
            onClick={() => setIsMinimized(false)}
            aria-label="Expand analytics"
          >
            📊
          </button>
        ) : (
          <>
            <div className={styles.header}>
              <span className={styles.title}>Analytics</span>
              <button
                className={styles.closeButton}
                onClick={() => setIsMinimized(true)}
                aria-label="Minimize analytics"
              >
                ×
              </button>
            </div>

            <div className={styles.details}>
              <MetricItem label="Panel Count" value={panelData.totalPanels} />
              <MetricItem label="System Size" value={`${panelData.systemSize.toFixed(1)} kW`} />
              {annualProduction && (
                <MetricItem
                  label="Annual Production"
                  value={`${annualProduction.toLocaleString()} kWh/year`}
                  isLoading={isLoading}
                />
              )}
              {pvwattsData && (
                <MetricItem label="Capacity Factor" value={`${pvwattsData.capacity_factor.toFixed(1)}%`} />
              )}
              {shadeImpact && shadeImpact.averageShadePercentage > 0 && (
                <MetricItem
                  label="Shade Impact"
                  value={`${shadeImpact.averageShadePercentage.toFixed(1)}% (-${shadeImpact.estimatedAnnualLoss.toLocaleString()} kWh)`}
                />
              )}
              {costEstimate && (
                <MetricItem label="Estimated Cost" value={`$${costEstimate.toLocaleString()}`} />
              )}
            </div>

            {pvwattsData && annualProduction && (
              <DashboardActions
                isAuthenticated={props.isAuthenticated}
                onSaveProject={props.onSaveProject}
                onViewMonthly={() => setShowMonthlyChart(true)}
                onViewFinancials={() => setShowFinancials(true)}
                onViewElectrical={() => setShowElectrical(true)}
                onGeneratePDF={handleGeneratePDF}
              />
            )}
          </>
        )}
      </div>

      {showMonthlyChart && pvwattsData && (
        <MonthlyProductionChart
          data={pvwattsData}
          onClose={() => {
            setShowMonthlyChart(false)
            setIsMinimized(false)
          }}
        />
      )}

      {showFinancials && annualProduction && (
        <FinancialCalculator
          annualProduction={annualProduction}
          systemSize={panelData.systemSize}
          panelCount={panelData.totalPanels}
          panelWattage={panelData.panelWattage}
          shadeImpact={shadeImpact}
          onClose={() => {
            setShowFinancials(false)
            setIsMinimized(false)
          }}
        />
      )}

      {showElectrical && (
        <ElectricalDesignPanel
          panelWattage={panelData.panelWattage}
          totalPanels={panelData.totalPanels}
          systemSizeKw={panelData.systemSize}
          onClose={() => {
            setShowElectrical(false)
            setIsMinimized(false)
          }}
        />
      )}
    </>
  )
}

function DashboardSummary({ panelCount, systemSize, annualProduction }: DashboardSummaryProps) {
  return (
    <div className={styles.summary}>
      <span className={styles.metric}>{panelCount} panels</span>
      <span className={styles.separator}>|</span>
      <span className={styles.metric}>{systemSize.toFixed(1)} kW</span>
      {annualProduction && (
        <>
          <span className={styles.separator}>|</span>
          <span className={styles.metric}>
            {annualProduction.toLocaleString()} kWh/year
          </span>
        </>
      )}
    </div>
  )
}

function MetricItem({ label, value, isLoading = false }: MetricItemProps) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>
        {isLoading ? <span className={styles.loadingIndicator}>...</span> : value}
      </span>
    </div>
  )
}
