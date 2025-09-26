'use client'

import ToolStrip from '@/components/ToolStrip'
import MapContainer from '@/components/MapContainer'
import FloatingSearch from '@/components/FloatingSearch'
import StatsCards from '@/components/StatsCards'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useState } from 'react'

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)
  const [activeTool, setActiveTool] = useState('select')
  const [showStats, setShowStats] = useState(false)

  const [stats] = useState({
    panelCount: 24,
    maxPanels: 32,
    capacity: 9.6,
    annualEnergy: 12800,
    annualSavings: 1840,
    co2Reduction: 4200
  })

  return (
    <div className="app-container">
      <div className="app-layout">
        <ToolStrip
          activeTool={activeTool}
          onToolSelect={setActiveTool}
          onStatsToggle={() => setShowStats(!showStats)}
        />

        <div className="main-content">
          <MapContainer activeTool={activeTool} />

          <FloatingSearch />

          {showStats && (
            <StatsCards
              stats={stats}
              onClose={() => setShowStats(false)}
            />
          )}
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
    </div>
  )
}