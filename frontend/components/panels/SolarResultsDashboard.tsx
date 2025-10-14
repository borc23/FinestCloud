'use client'

import { useState, useEffect } from 'react'
import styles from './SolarResultsDashboard.module.css'
import MonthlyProductionChart from './MonthlyProductionChart'
import FinancialCalculator from './FinancialCalculator'
import ElectricalDesignPanel from './ElectricalDesignPanel'
import { usePVWatts } from '@/hooks/usePVWatts'
import { usePanelData } from '@/hooks/usePanelData'
import { useSolarShade } from '@/hooks/useSolarShade'
import {
  SolarResultsDashboardProps,
  DashboardSummaryProps,
  MetricItemProps,
  isComplexData
} from '@/types/result_dashboard'

export default function SolarResultsDashboard(props: SolarResultsDashboardProps & {
  onMinimizeChange?: (minimized: boolean) => void
}) {
  const [showMonthlyChart, setShowMonthlyChart] = useState(false)
  const [showFinancials, setShowFinancials] = useState(false)
  const [showElectrical, setShowElectrical] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Notify parent when minimize state or monthly chart/financials/electrical visibility changes
  useEffect(() => {
    // Dashboard is considered "not minimized" if monthly chart, financials, or electrical are open
    props.onMinimizeChange?.(isMinimized && !showMonthlyChart && !showFinancials && !showElectrical)
  }, [isMinimized, showMonthlyChart, showFinancials, showElectrical, props.onMinimizeChange])

  const generatedPanelData = isComplexData(props) ? usePanelData(props.panelGenerationData) : null

  // Use current panel count if provided, otherwise use generated data
  const panelData = isComplexData(props) && generatedPanelData
    ? {
        ...generatedPanelData,
        totalPanels: props.currentPanelCount ?? generatedPanelData.totalPanels,
        systemSize: props.currentPanelCount
          ? (props.currentPanelCount * generatedPanelData.panelWattage) / 1000
          : generatedPanelData.systemSize
      }
    : {
        totalPanels: props.panelCount,
        systemSize: props.systemSize,
        panelWattage: props.panelWattage || 400,
        avgPitch: props.tilt || 20,
        avgAzimuth: props.azimuth || 180
      }

  // Extract location data
  const location = isComplexData(props)
    ? props.mapCenter
    : props.latitude && props.longitude
      ? { lat: props.latitude, lng: props.longitude }
      : undefined

  // Extract cost estimate
  const costEstimate = props.costEstimate

  // Auto-minimize when edit/draw/select modes are active
  useEffect(() => {
    if (props.isEditMode) {
      setIsMinimized(true)
    }
  }, [props.isEditMode])

  // Hide dashboard when monthly chart or financials open
  useEffect(() => {
    if (showMonthlyChart || showFinancials) {
      setIsMinimized(true)
    }
  }, [showMonthlyChart, showFinancials])

  const { data: pvwattsData, isLoading } = usePVWatts({
    latitude: location?.lat,
    longitude: location?.lng,
    panelCount: panelData?.totalPanels || 0,
    panelWattage: panelData?.panelWattage || 400,
    roofData: {
      pitch: panelData?.avgPitch,
      azimuth: panelData?.avgAzimuth
    },
    autoFetch: true
  })

  // Fetch shade analysis
  const { shadeData, getShadeImpact } = useSolarShade({
    latitude: location?.lat,
    longitude: location?.lng,
    autoFetch: true
  })

  // Apply shade loss factor to production
  const rawAnnualProduction = pvwattsData?.annual_production ||
    (!isComplexData(props) ? props.annualProduction : undefined)

  const shadeLossFactor = shadeData?.shadeLossFactor ?? 1.0
  const annualProduction = rawAnnualProduction
    ? Math.round(rawAnnualProduction * shadeLossFactor)
    : undefined

  // Calculate shade impact if we have production data
  const shadeImpact = annualProduction && shadeData
    ? getShadeImpact(panelData.totalPanels, rawAnnualProduction!, 0.37)
    : null

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
              <div className={styles.monthlyButtonContainer}>
                <button
                  className={styles.monthlyButton}
                  onClick={() => setShowMonthlyChart(true)}
                >
                  View Monthly Breakdown
                </button>
                <button
                  className={styles.financialButton}
                  onClick={() => setShowFinancials(true)}
                >
                  💰 Financial Analysis
                </button>
                <button
                  className={styles.electricalButton}
                  onClick={() => setShowElectrical(true)}
                >
                  ⚡ Electrical Design
                </button>
              </div>
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
