/**
 * Coverage Warning Component
 * Displays when location may not have Google Solar API coverage
 */

import { checkSolarApiCoverage, getSuggestedLocations, formatCoordinates } from '../utils/coverageCheck'

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

  const suggestedLocations = getSuggestedLocations()

  return (
    <div className="coverage-warning" style={{
      position: 'fixed',
      top: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      backgroundColor: '#fff3cd',
      border: '1px solid #ffc107',
      borderRadius: '8px',
      padding: '16px 20px',
      maxWidth: '600px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 1000,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 8px 0', color: '#856404', fontSize: '16px', fontWeight: '600' }}>
            ⚠️ Limited API Coverage
          </h3>
          <p style={{ margin: '0 0 12px 0', color: '#856404', fontSize: '14px', lineHeight: '1.5' }}>
            {coverage.message}
          </p>
          <p style={{ margin: '0 0 12px 0', color: '#666', fontSize: '13px' }}>
            <strong>Current location:</strong> {formatCoordinates(latitude, longitude)}
          </p>

          <details style={{ marginTop: '12px' }}>
            <summary style={{ cursor: 'pointer', color: '#856404', fontSize: '13px', fontWeight: '500' }}>
              Try these locations instead
            </summary>
            <ul style={{ margin: '8px 0 0 0', padding: '0 0 0 20px', fontSize: '13px', color: '#666' }}>
              {suggestedLocations.map((loc) => (
                <li key={loc.name} style={{ marginBottom: '4px' }}>
                  <strong>{loc.name}</strong> - {loc.description}
                  <br />
                  <code style={{ fontSize: '11px', color: '#0066cc' }}>
                    {formatCoordinates(loc.lat, loc.lng)}
                  </code>
                </li>
              ))}
            </ul>
          </details>

          <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fff', borderRadius: '4px', fontSize: '12px', color: '#666' }}>
            <strong>Note:</strong> You can still use manual inputs for pitch, azimuth, and solar calculations.
            Detection and panel generation will work, but solar data from Google's API won't be available.
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            style={{
              marginLeft: '12px',
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              color: '#856404',
              padding: '0',
              width: '24px',
              height: '24px',
              flexShrink: 0,
            }}
            aria-label="Close warning"
          >
            ×
          </button>
        )}
      </div>
    </div>
  )
}
