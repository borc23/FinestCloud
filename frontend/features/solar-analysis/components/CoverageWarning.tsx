/**
 * Coverage Warning Component
 * Displays when location may not have Google Solar API coverage
 */

import { checkSolarApiCoverage } from '../utils/coverageCheck'

interface CoverageWarningProps {
  latitude: number
  longitude: number
  onClose?: () => void
}

export function CoverageWarning({ latitude, longitude, onClose }: CoverageWarningProps) {
  const coverage = checkSolarApiCoverage(latitude, longitude)

  if (coverage.hasCoverage) {
    return null
  }

  return (
    <div className="coverage-warning" style={{
      position: 'fixed',
      top: '80px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffc107',
      borderRadius: '6px',
      padding: '12px 16px',
      maxWidth: '450px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      zIndex: 1000,
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
    }}>
      <div style={{
        fontSize: '20px',
        lineHeight: '1',
        flexShrink: 0,
      }}>
        ⚠️
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, color: '#856404', fontSize: '14px', lineHeight: '1.4' }}>
          <strong>Unsupported area:</strong> Automatic solar data unavailable. Please use manual inputs.
        </p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            color: '#856404',
            padding: '0',
            width: '20px',
            height: '20px',
            flexShrink: 0,
            lineHeight: '1',
          }}
          aria-label="Close warning"
        >
          ×
        </button>
      )}
    </div>
  )
}
