'use client'

import Sidebar from '@/components/Sidebar'
import Navbar from '@/components/Navbar'
import MapContainer from '@/components/MapContainer'
import LoadingSpinner from '@/components/LoadingSpinner'
import { useState } from 'react'

export default function HomePage() {
  const [isLoading, setIsLoading] = useState(false)

  return (
    <div className="app-container">
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <Navbar />
          <MapContainer />
        </div>
      </div>
      {isLoading && <LoadingSpinner />}
    </div>
  )
}