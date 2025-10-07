'use client'

import { useState } from 'react'
import styles from './SolarResultsDashboard.module.css'
import MonthlyProductionChart from './MonthlyProductionChart'
import { usePVWatts } from '@/hooks/usePVWatts'
import { usePanelData } from '@/hooks/usePanelData'

// ========================================
// Type Definitions
// ========================================

interface RoofPanelsData {
  roof_id: number
  panels: any[]
  panel_count: number
  module_type: string
  module_specs: any
  coords: any[]
  pitch: number
  azimuth: number
}

interface PanelGenerationData {
  roofs: RoofPanelsData[]
  max_panels: number
  module: string
}

interface Location {
  lat: number
  lng: number
}

interface SimpleDataProps {
  panelCount: number
  systemSize: number
  annualProduction?: number
  costEstimate?: number
  latitude?: number
  longitude?: number
  panelWattage?: number
  tilt?: number
  azimuth?: number
}

interface ComplexDataProps {
  panelGenerationData: PanelGenerationData
  mapCenter?: Location
  costEstimate?: number
}

type SolarResultsDashboardProps = SimpleDataProps | ComplexDataProps

// ========================================
// Type Guards
// ========================================

function isComplexData(props: SolarResultsDashboardProps): props is ComplexDataProps {
  return 'panelGenerationData' in props
}

// ========================================
// Main Component
// ========================================

/**
 * Unified Solar Results Dashboard
 *
 * Supports two usage patterns:
 * 1. Simple: Direct panel data (panelCount, systemSize, etc.)
 * 2. Complex: Panel generation data from backend (automatically aggregates multi-roof data)
 *
 * Features:
 * - Automatic PVWatts integration for production estimates
 * - Monthly production breakdown chart
 * - Responsive design
 * - Loading states
 */
export default function SolarResultsDashboard(props: SolarResultsDashboardProps) {
  const [showMonthlyChart, setShowMonthlyChart] = useState(false)

  // ========================================
  // Data Processing
  // ========================================

  // Extract or calculate panel data based on input type
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

  // ========================================
  // PVWatts Integration
  // ========================================

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

  // ========================================
  // Computed Values
  // ========================================

  const annualProduction = pvwattsData?.annual_production ||
    (!isComplexData(props) ? props.annualProduction : undefined)

  // ========================================
  // Early Returns
  // ========================================

  if (!panelData) {
    return null
  }

  // ========================================
  // Render
  // ========================================

  return (
    <>
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
      </div>

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

// ========================================
// Sub-Components
// ========================================

interface DashboardSummaryProps {
  panelCount: number
  systemSize: number
  annualProduction?: number
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

interface MetricItemProps {
  label: string
  value: string | number
  isLoading?: boolean
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
