'use client'

import { useState } from 'react'
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

export default function SolarResultsDashboard(props: SolarResultsDashboardProps) {
  const [showMonthlyChart, setShowMonthlyChart] = useState(false)
  const panelData = isComplexData(props)
    ? usePanelData(props.panelGenerationData)
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
      {/* Results Dashboard - Hidden when monthly chart is open */}
      {!showMonthlyChart && (
        <div className={styles.dashboard}>
          {/* Summary Bar */}
          <DashboardSummary
            panelCount={panelData.totalPanels}
            systemSize={panelData.systemSize}
            annualProduction={annualProduction}
          />

          {/* Detailed Metrics */}
          <div className={styles.details}>
            <MetricItem label="Panel Count" value={panelData.totalPanels} />

            <MetricItem
              label="System Size"
              value={`${panelData.systemSize.toFixed(1)} kW`}
            />

            {annualProduction && (
              <MetricItem
                label="Annual Production"
                value={`${annualProduction.toLocaleString()} kWh/year`}
                isLoading={isLoading}
              />
            )}

            {pvwattsData && (
              <MetricItem
                label="Capacity Factor"
                value={`${pvwattsData.capacity_factor.toFixed(1)}%`}
              />
            )}

            {costEstimate && (
              <MetricItem
                label="Estimated Cost"
                value={`$${costEstimate.toLocaleString()}`}
              />
            )}
          </div>

          {pvwattsData && (
            <div className={styles.monthlyButtonContainer}>
              <button
                className={styles.monthlyButton}
                onClick={() => setShowMonthlyChart(!showMonthlyChart)}
              >
                {showMonthlyChart ? 'Hide' : 'View'} Monthly Breakdown
              </button>
            </div>
          )}

          {/* Grid Toggle Button */}
          {isComplexData(props) && props.onToggleGrid && (
            <div className={styles.monthlyButtonContainer}>
              <button
                className={styles.monthlyButton}
                onClick={props.onToggleGrid}
              >
                {props.showGrid ? 'Hide' : 'Show'} Grid
              </button>
            </div>
          )}

          {/* Half Step Grid Toggle Button */}
          {isComplexData(props) && props.onToggleHalfStepGrid && (
            <div className={styles.monthlyButtonContainer}>
              <button
                className={styles.monthlyButton}
                onClick={props.onToggleHalfStepGrid}
              >
                {props.showHalfStepGrid ? 'Hide' : 'Show'} Half Step Grid
              </button>
            </div>
          )}
        </div>
      )}

      {/* Monthly Chart Modal */}
      {showMonthlyChart && pvwattsData && (
        <MonthlyProductionChart
          data={pvwattsData}
          onClose={() => setShowMonthlyChart(false)}
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
