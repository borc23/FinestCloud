'use client'

import { useState, useEffect } from 'react'
import Spinner from './Spinner'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
}

export default function LoadingSpinner({
  message = 'Loading...',
  size = 'md'
}: LoadingSpinnerProps) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    return () => clearInterval(interval)
  }, [])

  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <Spinner size={size} variant="primary" />
        <p className="loading-text">
          {message}{dots}
        </p>
      </div>
    </div>
  )
}