'use client'

export type SpinnerSize = 'sm' | 'md' | 'lg'
export type SpinnerVariant = 'primary' | 'white' | 'dark'

interface SpinnerProps {
  size?: SpinnerSize
  variant?: SpinnerVariant
  className?: string
}

const sizeMap = {
  sm: '16px',
  md: '24px',
  lg: '32px'
}

const borderWidthMap = {
  sm: '2px',
  md: '2px',
  lg: '3px'
}

const colorMap = {
  primary: {
    border: 'rgba(0, 122, 255, 0.2)',
    borderTop: 'rgba(0, 122, 255, 0.8)',
    borderRight: 'rgba(0, 122, 255, 0.6)'
  },
  white: {
    border: 'rgba(255, 255, 255, 0.3)',
    borderTop: 'rgba(255, 255, 255, 0.9)',
    borderRight: 'rgba(255, 255, 255, 0.7)'
  },
  dark: {
    border: 'rgba(0, 0, 0, 0.2)',
    borderTop: 'rgba(0, 0, 0, 0.8)',
    borderRight: 'rgba(0, 0, 0, 0.6)'
  }
}

export default function Spinner({
  size = 'md',
  variant = 'primary',
  className = ''
}: SpinnerProps) {
  const colors = colorMap[variant]

  const style = {
    width: sizeMap[size],
    height: sizeMap[size],
    border: `${borderWidthMap[size]} solid ${colors.border}`,
    borderTop: `${borderWidthMap[size]} solid ${colors.borderTop}`,
    borderRight: `${borderWidthMap[size]} solid ${colors.borderRight}`,
    borderRadius: '50%',
    animation: 'liquidSpin 1.5s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite',
    filter: `drop-shadow(0 2px 8px ${colors.borderTop})`
  }

  return (
    <div
      className={`spinner ${className}`}
      style={style}
      role="status"
      aria-label="Loading"
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}
