'use client'

import { useState, useEffect } from 'react'
import styles from './SolarResultsDashboard.module.css'
import MonthlyProductionChart from './MonthlyProductionChart'
import FinancialCalculator from './FinancialCalculator'
import ElectricalDesignPanel from './ElectricalDesignPanel'
import { usePVWatts } from '@/hooks/usePVWatts'
import { usePanelData } from '@/hooks/usePanelData'
import { useSolarShade } from '@/hooks/useSolarShade'
import { generateSolarReport, downloadPDF } from '@/utils/pdfGenerator'
import { calculateFinancials, estimateSystemCost } from '@/utils/financialCalculations'
import type { ReportData } from '@/types/report'
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

  // Generate monthly estimate for German solar pattern
  const generateMonthlyEstimate = (annualProduction: number): number[] => {
    const monthlyDistribution = [
      0.04, 0.06, 0.08, 0.10, 0.11, 0.12,  // Jan-Jun
      0.13, 0.12, 0.10, 0.07, 0.04, 0.03   // Jul-Dec
    ]
    return monthlyDistribution.map(ratio => Math.round(annualProduction * ratio))
  }

  // Generate 25-year production projection
  const generate25YearProjection = (annualProduction: number, degradationRate: number): number[] => {
    const projection: number[] = []
    for (let year = 0; year < 25; year++) {
      const degradationFactor = Math.pow(1 - degradationRate / 100, year)
      projection.push(Math.round(annualProduction * degradationFactor))
    }
    return projection
  }

  // Handle PDF generation
  const handleGeneratePDF = () => {
    if (!annualProduction) {
      alert('Please wait for production data to load')
      return
    }

    const systemCost = costEstimate || estimateSystemCost(panelData.systemSize, panelData.totalPanels)
    const financials = calculateFinancials(
      annualProduction,
      0.37, // electricity rate
      systemCost,
      0.082, // feed-in tariff
      0.30  // self-consumption rate
    )

    const reportData: ReportData = {
      customer: {
        name: 'Customer Name',
        address: 'Customer Address',
        propertyType: 'residential'
      },
      site: {
        address: location ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}` : 'Installation Address',
        location: location,
        roofType: 'Pitched',
        roofCondition: 'good',
        shadeAnalysis: shadeImpact || undefined
      },
      systemSpecs: {
        panelCount: panelData.totalPanels,
        systemSize: panelData.systemSize,
        panelWattage: panelData.panelWattage,
        annualProduction: annualProduction,
        avgPitch: panelData.avgPitch,
        avgAzimuth: panelData.avgAzimuth,
        location: location
      },
      energyProduction: {
        monthlyYield: generateMonthlyEstimate(annualProduction),
        annualYield: annualProduction,
        performanceRatio: pvwattsData?.capacity_factor || 85,
        solarIrradiance: 1100,
        degradationRate: 0.5,
        estimatedOutput25Years: generate25YearProjection(annualProduction, 0.5)
      },
      financials: financials,
      electricityRate: 0.37,
      monthlyBill: financials.monthlySavings,
      feedInTariff: 0.082,
      selfConsumptionRate: 0.30,
      systemCost: systemCost,
      monitoring: {
        monitoringSystem: 'Web Portal & Mobile App',
        appAccess: true,
        maintenanceSchedule: {
          frequency: 'Annual',
          tasks: [
            'Visual inspection of panels and mounting system',
            'Clean panels if necessary (rain usually sufficient)',
            'Check inverter display for error messages',
            'Verify monitoring system is reporting correctly',
            'Inspect electrical connections and wiring',
            'Check for shading from new tree growth',
            'Review energy production vs. expectations'
          ]
        },
        warranty: {
          panels: 25,
          inverter: 10,
          installation: 5
        }
      },
      companyName: 'Solar Solutions',
      projectDate: new Date(),
      proposalValidUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }

    const doc = generateSolarReport(reportData)
    downloadPDF(doc, `solar-proposal-${panelData.systemSize.toFixed(1)}kW.pdf`)
  }

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
                <button
                  className={styles.pdfButton}
                  onClick={handleGeneratePDF}
                >
                  📄 Download PDF Report
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
