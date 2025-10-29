/**
 * Electrical Design Panel Component
 * Displays string configuration, inverter selection, and electrical calculations
 */

import React, { useState, useMemo } from 'react'
import styles from './ElectricalDesignPanel.module.css'
import { calculateElectricalDesign, compareInverterTypes, STANDARD_PANEL_SPECS } from '../utils/electricalCalculations'
import type { ElectricalInputs } from '../types/electrical'

interface ElectricalDesignPanelProps {
  panelWattage: number
  totalPanels: number
  systemSizeKw: number
  onClose: () => void
}

export default function ElectricalDesignPanel({
  panelWattage,
  totalPanels,
  systemSizeKw,
  onClose,
}: ElectricalDesignPanelProps) {
  // Get closest standard panel specs or use 400W as default
  const closestWattage = [400, 450, 500].reduce((prev, curr) =>
    Math.abs(curr - panelWattage) < Math.abs(prev - panelWattage) ? curr : prev
  )
  const defaultPanelSpecs = STANDARD_PANEL_SPECS[closestWattage]

  const [inverterType, setInverterType] = useState<'string' | 'microinverter' | 'optimizer'>('string')
  const [showComparison, setShowComparison] = useState(false)
  const [dcCableLength, setDcCableLength] = useState(15)
  const [acCableLength, setAcCableLength] = useState(10)
  const [roofTemp, setRoofTemp] = useState(60)

  // Calculate electrical design
  const design = useMemo(() => {
    const inputs: ElectricalInputs = {
      panelSpecs: defaultPanelSpecs,
      totalPanels,
      systemSizeKw,
      inverterType,
      dcCableLength,
      acCableLength,
      roofTemp,
    }
    return calculateElectricalDesign(inputs)
  }, [defaultPanelSpecs, totalPanels, systemSizeKw, inverterType, dcCableLength, acCableLength, roofTemp])

  // Compare all inverter types
  const comparison = useMemo(() => {
    return compareInverterTypes(defaultPanelSpecs, totalPanels, systemSizeKw)
  }, [defaultPanelSpecs, totalPanels, systemSizeKw])

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>⚡ Electrical System Design</h3>
        <button className={styles.closeButton} onClick={onClose}>×</button>
      </div>

      <div className={styles.scrollableContent}>
        {/* Warnings */}
        {design.warnings.length > 0 && (
          <div className={styles.warningBox}>
            <div className={styles.warningIcon}>⚠️</div>
            <div className={styles.warningContent}>
              <div className={styles.warningTitle}>Design Considerations</div>
              {design.warnings.map((warning, idx) => (
                <p key={idx} className={styles.warningText}>{warning}</p>
              ))}
            </div>
          </div>
        )}

        {/* Inverter Type Selection */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Inverter Type</h4>
          <div className={styles.inverterSelector}>
            {(['string', 'microinverter', 'optimizer'] as const).map((type) => (
              <button
                key={type}
                className={`${styles.inverterButton} ${inverterType === type ? styles.active : ''}`}
                onClick={() => setInverterType(type)}
              >
                <div className={styles.inverterName}>
                  {type === 'string' && '🔌 String Inverter'}
                  {type === 'microinverter' && '🔋 Microinverters'}
                  {type === 'optimizer' && '⚙️ Power Optimizers'}
                </div>
                <div className={styles.inverterCost}>~€{comparison[type].cost.toLocaleString()}</div>
              </button>
            ))}
          </div>
          <button
            className={styles.compareButton}
            onClick={() => setShowComparison(!showComparison)}
          >
            {showComparison ? '▼' : '▶'} Compare Pros & Cons
          </button>

          {showComparison && (
            <div className={styles.comparisonGrid}>
              {(['string', 'microinverter', 'optimizer'] as const).map((type) => (
                <div key={type} className={styles.comparisonCard}>
                  <h5 className={styles.comparisonTitle}>
                    {type === 'string' && 'String Inverter'}
                    {type === 'microinverter' && 'Microinverters'}
                    {type === 'optimizer' && 'Power Optimizers'}
                  </h5>
                  <div className={styles.comparisonSection}>
                    <strong className={styles.prosTitle}>✓ Pros:</strong>
                    <ul className={styles.comparisonList}>
                      {comparison[type].pros.map((pro, idx) => (
                        <li key={idx}>{pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.comparisonSection}>
                    <strong className={styles.consTitle}>✗ Cons:</strong>
                    <ul className={styles.comparisonList}>
                      {comparison[type].cons.map((con, idx) => (
                        <li key={idx}>{con}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* String Configuration */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>String Configuration</h4>
          <div className={styles.configGrid}>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>Configuration</span>
              <span className={styles.configValue}>
                {design.stringConfig.numberOfStrings} × {design.stringConfig.panelsPerString} panels
              </span>
            </div>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>String Voltage (Vmp)</span>
              <span className={styles.configValue}>{Math.round(design.stringConfig.stringVoltageVmp)}V</span>
            </div>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>String Voltage (Voc)</span>
              <span className={styles.configValue}>{Math.round(design.stringConfig.stringVoltageVoc)}V</span>
            </div>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>String Current</span>
              <span className={styles.configValue}>{design.stringConfig.stringCurrent.toFixed(1)}A</span>
            </div>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>Total System Voltage</span>
              <span className={styles.configValue}>{Math.round(design.stringConfig.totalSystemVoltage)}V</span>
            </div>
            <div className={styles.configItem}>
              <span className={styles.configLabel}>Total System Current</span>
              <span className={styles.configValue}>{design.stringConfig.totalSystemCurrent.toFixed(1)}A</span>
            </div>
          </div>
        </div>

        {/* Inverter Specifications */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Inverter Specifications</h4>
          <div className={styles.inverterSpecs}>
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Model Type</span>
              <span className={styles.specValue}>{design.inverter.model}</span>
            </div>
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Efficiency</span>
              <span className={styles.specValue}>{design.inverter.efficiency}%</span>
            </div>
            <div className={styles.specItem}>
              <span className={styles.specLabel}>MPPT Range</span>
              <span className={styles.specValue}>
                {design.inverter.mppVoltageRange[0]}-{design.inverter.mppVoltageRange[1]}V
              </span>
            </div>
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Max Input Voltage</span>
              <span className={styles.specValue}>{design.inverter.maxInputVoltage}V</span>
            </div>
            <div className={styles.specItem}>
              <span className={styles.specLabel}>Units Required</span>
              <span className={styles.specValue}>{design.inverter.unitCount}</span>
            </div>
            {design.inverter.numberOfMPPTs && (
              <div className={styles.specItem}>
                <span className={styles.specLabel}>MPPT Trackers</span>
                <span className={styles.specValue}>{design.inverter.numberOfMPPTs}</span>
              </div>
            )}
          </div>
        </div>

        {/* Wire Sizing */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Wire Sizing & Voltage Drop</h4>
          <div className={styles.wireGrid}>
            <div className={styles.wireSection}>
              <h5 className={styles.wireTitle}>DC Wiring (Array to Inverter)</h5>
              <div className={styles.wireItem}>
                <span className={styles.wireLabel}>Cable Type</span>
                <span className={styles.wireValue}>{design.wiring.dcCableType}</span>
              </div>
              <div className={styles.wireItem}>
                <span className={styles.wireLabel}>Cable Length (one-way)</span>
                <span className={styles.wireValue}>{design.wiring.dcCableLengthOneWay}m</span>
              </div>
              <div className={styles.wireItem}>
                <span className={styles.wireLabel}>Voltage Drop</span>
                <span className={`${styles.wireValue} ${design.wiring.dcVoltageDrop > 3 ? styles.warning : styles.good}`}>
                  {design.wiring.dcVoltageDrop}% {design.wiring.dcVoltageDrop <= 3 ? '✓' : '⚠️'}
                </span>
              </div>
            </div>
            <div className={styles.wireSection}>
              <h5 className={styles.wireTitle}>AC Wiring (Inverter to Grid)</h5>
              <div className={styles.wireItem}>
                <span className={styles.wireLabel}>Cable Type</span>
                <span className={styles.wireValue}>{design.wiring.acCableType}</span>
              </div>
              <div className={styles.wireItem}>
                <span className={styles.wireLabel}>Cable Length (one-way)</span>
                <span className={styles.wireValue}>{design.wiring.acCableLengthOneWay}m</span>
              </div>
              <div className={styles.wireItem}>
                <span className={styles.wireLabel}>Voltage Drop</span>
                <span className={`${styles.wireValue} ${design.wiring.acVoltageDrop > 1 ? styles.warning : styles.good}`}>
                  {design.wiring.acVoltageDrop}% {design.wiring.acVoltageDrop <= 1 ? '✓' : '⚠️'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Breaker Sizing */}
        <div className={styles.section}>
          <h4 className={styles.sectionTitle}>Breaker & Protection</h4>
          <div className={styles.breakerGrid}>
            <div className={styles.breakerItem}>
              <span className={styles.breakerLabel}>DC Array Disconnect</span>
              <span className={styles.breakerValue}>{design.breakers.dcBreakerType}</span>
            </div>
            <div className={styles.breakerItem}>
              <span className={styles.breakerLabel}>AC Grid Connection</span>
              <span className={styles.breakerValue}>{design.breakers.acBreakerType}</span>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className={styles.controls}>
          <button
            className={styles.toggleButton}
            onClick={() => {
              const inputs = document.getElementById('advanced-inputs')
              if (inputs) {
                inputs.style.display = inputs.style.display === 'none' ? 'grid' : 'none'
              }
            }}
          >
            ⚙️ Advanced Settings
          </button>
          <div id="advanced-inputs" className={styles.inputs} style={{ display: 'none' }}>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                DC Cable Length (m)
              </label>
              <input
                type="number"
                className={styles.input}
                value={dcCableLength}
                onChange={(e) => setDcCableLength(Number(e.target.value))}
                min={1}
                max={100}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                AC Cable Length (m)
              </label>
              <input
                type="number"
                className={styles.input}
                value={acCableLength}
                onChange={(e) => setAcCableLength(Number(e.target.value))}
                min={1}
                max={100}
              />
            </div>
            <div className={styles.inputGroup}>
              <label className={styles.inputLabel}>
                Roof Temperature (°C)
              </label>
              <input
                type="number"
                className={styles.input}
                value={roofTemp}
                onChange={(e) => setRoofTemp(Number(e.target.value))}
                min={25}
                max={80}
              />
            </div>
          </div>
        </div>

        {/* Disclaimer */}
        <div className={styles.disclaimer}>
          <p>
            <strong>Note:</strong> This is a preliminary electrical design. Final system design must be performed by a
            certified electrician according to local building codes (DIN VDE 0100, DIN VDE 0126) and verified by your
            utility company before installation.
          </p>
        </div>
      </div>
    </div>
  )
}
