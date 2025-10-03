'use client'

import { useState, useEffect } from 'react'
import Spinner from './Spinner'

interface LoadingSpinnerProps {
  message?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'spinner' | 'skeleton' | 'pulse' | 'dots'
}

export default function LoadingSpinner({
  message = 'Loading...',
  size = 'md',
  variant = 'spinner'
}: LoadingSpinnerProps) {
  const [dots, setDots] = useState('')

  useEffect(() => {
    const interval = setInterval(() => {
      setDots(prev => prev.length >= 3 ? '' : prev + '.')
    }, 500)

    return () => clearInterval(interval)
  }, [])

  const sizeClasses = {
    sm: 'loading-sm',
    md: 'loading-md',
    lg: 'loading-lg'
  }

  if (variant === 'skeleton') {
    return <SkeletonLoader size={size} />
  }

  if (variant === 'pulse') {
    return <PulseLoader message={message} dots={dots} />
  }

  if (variant === 'dots') {
    return <DotsLoader message={message} />
  }

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

function SkeletonLoader({ size }: { size: string }) {
  return (
    <div className="skeleton-container">
      <div className="skeleton-header">
        <div className="skeleton-circle"></div>
        <div className="skeleton-lines">
          <div className="skeleton-line skeleton-line-wide"></div>
          <div className="skeleton-line skeleton-line-medium"></div>
        </div>
      </div>
      <div className="skeleton-content">
        <div className="skeleton-line skeleton-line-full"></div>
        <div className="skeleton-line skeleton-line-full"></div>
        <div className="skeleton-line skeleton-line-narrow"></div>
      </div>
    </div>
  )
}

function PulseLoader({ message, dots }: { message: string, dots: string }) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="pulse-loader">
          <div className="pulse-circle pulse-1"></div>
          <div className="pulse-circle pulse-2"></div>
          <div className="pulse-circle pulse-3"></div>
        </div>
        <p className="loading-text">
          {message}{dots}
        </p>
      </div>
    </div>
  )
}

function DotsLoader({ message }: { message: string }) {
  return (
    <div className="loading-overlay">
      <div className="loading-content">
        <div className="dots-loader">
          <div className="dot dot-1"></div>
          <div className="dot dot-2"></div>
          <div className="dot dot-3"></div>
          <div className="dot dot-4"></div>
          <div className="dot dot-5"></div>
        </div>
        <p className="loading-text">
          {message}
        </p>
      </div>
    </div>
  )
}