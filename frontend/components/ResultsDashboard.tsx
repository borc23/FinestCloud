'use client'

import { useState, useEffect } from 'react'
import styles from './ResultsDashboard.module.css'
import MonthlyProductionChart from './MonthlyProductionChart'
import { pvwattsApi } from '@/lib/pvwattsApi'
import type { PVWattsResponse } from '@/types/pvwatts'

interface ResultsDashboardProps {
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

export default function ResultsDashboard({
  panelCount,
  systemSize,
  annualProduction: initialAnnualProduction,
  costEstimate,
  latitude,
  longitude,
  panelWattage = 400,
  tilt = 20,
  azimuth = 180
}: ResultsDashboardProps) {
  const [pvwattsData, setPvwattsData] = useState<PVWattsResponse | null>(null)
  const [showMonthlyChart, setShowMonthlyChart] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [annualProduction, setAnnualProduction] = useState(initialAnnualProduction)

  useEffect(() => {
    // Fetch PVWatts data if location is available
    if (latitude && longitude && panelCount > 0) {
      fetchPVWattsData()
    }
  }, [latitude, longitude, panelCount, panelWattage, tilt, azimuth])

  const fetchPVWattsData = async () => {
    if (!latitude || !longitude) return

    setIsLoading(true)
    try {
      const data = await pvwattsApi.calculateProduction({
        latitude,
        longitude,
        panelCount,
        panelWattage,
        tilt,
        azimuth
      })

      setPvwattsData(data)
      setAnnualProduction(Math.round(data.annual_production))
    } catch (error) {
      console.error('Failed to fetch PVWatts data:', error)
      // Fallback to simple calculation if provided
      if (initialAnnualProduction) {
        setAnnualProduction(initialAnnualProduction)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMonthlyChart = () => {
    setShowMonthlyChart(!showMonthlyChart)
  }

  return (
    <>
      <div className={styles.dashboard}>
        <div className={styles.summary}>
          <span className={styles.metric}>{panelCount} panels</span>
          <span className={styles.separator}>|</span>
          <span className={styles.metric}>{systemSize.toFixed(1)} kW</span>
          {annualProduction && (
            <>
              <span className={styles.separator}>|</span>
              <span className={styles.metric}>{annualProduction.toLocaleString()} kWh/year</span>
            </>
          )}
        </div>

        <div className={styles.details}>
          <div className={styles.detailItem}>
            <span className={styles.label}>Panel Count</span>
            <span className={styles.value}>{panelCount}</span>
          </div>

          <div className={styles.detailItem}>
            <span className={styles.label}>System Size</span>
            <span className={styles.value}>{systemSize.toFixed(1)} kW</span>
          </div>

          {annualProduction && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Annual Production</span>
              <span className={styles.value}>
                {annualProduction.toLocaleString()} kWh/year
                {isLoading && <span className={styles.loadingIndicator}>...</span>}
              </span>
            </div>
          )}

          {pvwattsData && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Capacity Factor</span>
              <span className={styles.value}>{pvwattsData.capacity_factor.toFixed(1)}%</span>
            </div>
          )}

          {costEstimate && (
            <div className={styles.detailItem}>
              <span className={styles.label}>Estimated Cost</span>
              <span className={styles.value}>${costEstimate.toLocaleString()}</span>
            </div>
          )}

          {pvwattsData && (
            <button className={styles.monthlyButton} onClick={toggleMonthlyChart}>
              {showMonthlyChart ? 'Hide' : 'View'} Monthly Breakdown
            </button>
          )}
        </div>
      </div>

      {showMonthlyChart && pvwattsData && (
        <MonthlyProductionChart data={pvwattsData} onClose={() => setShowMonthlyChart(false)} />
      )}
    </>
  )
}
