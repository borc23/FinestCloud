'use client'

import { useState, useEffect } from 'react'
import styles from './SolarResultsDashboard.module.css'
import MonthlyProductionChart from './MonthlyProductionChart'
import { usePVWatts } from '@/hooks/usePVWatts'
import { usePanelData } from '@/hooks/usePanelData'
import {
  SolarResultsDashboardProps,
  DashboardSummaryProps,
  MetricItemProps,
  isComplexData
} from '@/types/result_dashboard'

export default function SolarResultsDashboard(props: SolarResultsDashboardProps & { onMinimizeChange?: (minimized: boolean) => void }) {
  const [showMonthlyChart, setShowMonthlyChart] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)

  // Notify parent when minimize state or monthly chart visibility changes
  useEffect(() => {
    // Dashboard is considered "not minimized" if monthly chart is open
    props.onMinimizeChange?.(isMinimized && !showMonthlyChart)
  }, [isMinimized, showMonthlyChart, props.onMinimizeChange])

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

  // Hide dashboard when monthly chart opens
  useEffect(() => {
    if (showMonthlyChart) {
      setIsMinimized(true)
    }
  }, [showMonthlyChart])

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

  const annualProduction = pvwattsData?.annual_production ||
    (!isComplexData(props) ? props.annualProduction : undefined)

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
              {costEstimate && (
                <MetricItem label="Estimated Cost" value={`$${costEstimate.toLocaleString()}`} />
              )}
            </div>

            {pvwattsData && (
              <div className={styles.monthlyButtonContainer}>
                <button
                  className={styles.monthlyButton}
                  onClick={() => setShowMonthlyChart(true)}
                >
                  View Monthly Breakdown
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
        {value}
        {isLoading && <span className={styles.loadingIndicator}>...</span>}
      </span>
    </div>
  )
}
