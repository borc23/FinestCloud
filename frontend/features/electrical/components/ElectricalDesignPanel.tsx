/**
 * Electrical Design Panel Component
 * Displays string configuration, inverter selection, and electrical calculations
 */

import { useState, useMemo } from "react";
import styles from "./ElectricalDesignPanel.module.css";
import panel from "@/shared/styles/panel.module.css";
import {
  calculateElectricalDesign,
  INVERTER_OPTIONS,
  STANDARD_PANEL_SPECS,
} from "../utils/electricalCalculations";
import type { InverterKind } from "../types/electrical";

interface ElectricalDesignPanelProps {
  panelWattage: number;
  totalPanels: number;
  systemSizeKw: number;
  onClose: () => void;
}

export default function ElectricalDesignPanel({
  panelWattage,
  totalPanels,
  systemSizeKw,
  onClose,
}: ElectricalDesignPanelProps) {
  // Get closest standard panel specs or use 400W as default
  const closestWattage = [400, 450, 500].reduce((prev, curr) =>
    Math.abs(curr - panelWattage) < Math.abs(prev - panelWattage) ? curr : prev,
  );
  const panelSpecs = STANDARD_PANEL_SPECS[closestWattage];

  const [inverterType, setInverterType] = useState<InverterKind>("string");
  const [showComparison, setShowComparison] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [dcCableLength, setDcCableLength] = useState(15);
  const [acCableLength, setAcCableLength] = useState(10);
  const [roofTemp, setRoofTemp] = useState(60);

  // Calculate electrical design
  const design = useMemo(
    () =>
      calculateElectricalDesign({
        panelSpecs,
        totalPanels,
        systemSizeKw,
        inverterType,
        dcCableLength,
        acCableLength,
        roofTemp,
      }),
    [
      panelSpecs,
      totalPanels,
      systemSizeKw,
      inverterType,
      dcCableLength,
      acCableLength,
      roofTemp,
    ],
  );
  const { stringConfig, inverter, wiring } = design;

  const configItems = [
    [
      "Configuration",
      `${stringConfig.numberOfStrings} × ${stringConfig.panelsPerString} panels`,
    ],
    ["String Voltage (Vmp)", `${Math.round(stringConfig.stringVoltageVmp)}V`],
    ["String Voltage (Voc)", `${Math.round(stringConfig.stringVoltageVoc)}V`],
    ["String Current", `${stringConfig.stringCurrent.toFixed(1)}A`],
    ["Total System Current", `${stringConfig.totalSystemCurrent.toFixed(1)}A`],
  ];

  const inverterSpecs = [
    ["Model Type", inverter.model],
    ["Efficiency", `${inverter.efficiency}%`],
    [
      "MPPT Range",
      `${inverter.mppVoltageRange[0]}-${inverter.mppVoltageRange[1]}V`,
    ],
    ["Max Input Voltage", `${inverter.maxInputVoltage}V`],
    ["Units Required", inverter.unitCount],
    ...(inverter.numberOfMPPTs
      ? [["MPPT Trackers", inverter.numberOfMPPTs]]
      : []),
  ];

  const wireSections = [
    {
      title: "DC Wiring (Array to Inverter)",
      cableType: wiring.dcCableType,
      length: wiring.dcCableLengthOneWay,
      drop: wiring.dcVoltageDrop,
      maxDrop: 3,
    },
    {
      title: "AC Wiring (Inverter to Grid)",
      cableType: wiring.acCableType,
      length: wiring.acCableLengthOneWay,
      drop: wiring.acVoltageDrop,
      maxDrop: 1,
    },
  ];

  const advancedInputs = [
    ["DC Cable Length (m)", dcCableLength, setDcCableLength, 1, 100],
    ["AC Cable Length (m)", acCableLength, setAcCableLength, 1, 100],
    ["Roof Temperature (°C)", roofTemp, setRoofTemp, 25, 80],
  ] as const;

  return (
    <div className={styles.container}>
      <div className={panel.header}>
        <h3 className={panel.title}>⚡ Electrical System Design</h3>
        <button className={panel.closeButton} onClick={onClose}>
          ×
        </button>
      </div>

      <div className={panel.scrollableContent}>
        {/* Warnings */}
        {design.warnings.length > 0 && (
          <div className={panel.warningBox}>
            <div className={panel.warningIcon}>⚠️</div>
            <div className={panel.warningContent}>
              <div className={panel.warningTitle}>Design Considerations</div>
              {design.warnings.map((warning, idx) => (
                <p key={idx} className={styles.warningText}>
                  {warning}
                </p>
              ))}
            </div>
          </div>
        )}

        {/* Inverter Type Selection */}
        <div className={panel.section}>
          <h4 className={panel.sectionTitle}>Inverter Type</h4>
          <div className={styles.inverterSelector}>
            {INVERTER_OPTIONS.map(({ type, icon, name, estimateCost }) => (
              <button
                key={type}
                className={`${styles.inverterButton} ${
                  inverterType === type ? styles.active : ""
                }`}
                onClick={() => setInverterType(type)}
              >
                <div className={styles.inverterName}>
                  {icon} {name}
                </div>
                <div className={styles.inverterCost}>
                  ~€
                  {Math.round(
                    estimateCost(systemSizeKw, totalPanels),
                  ).toLocaleString()}
                </div>
              </button>
            ))}
          </div>
          <button
            className={styles.compareButton}
            onClick={() => setShowComparison(!showComparison)}
          >
            {showComparison ? "▼" : "▶"} Compare Pros & Cons
          </button>

          {showComparison && (
            <div className={styles.comparisonGrid}>
              {INVERTER_OPTIONS.map(({ type, name, pros, cons }) => (
                <div key={type} className={styles.comparisonCard}>
                  <h5 className={styles.comparisonTitle}>{name}</h5>
                  <div className={styles.comparisonSection}>
                    <strong className={styles.prosTitle}>✓ Pros:</strong>
                    <ul className={styles.comparisonList}>
                      {pros.map((pro) => (
                        <li key={pro}>{pro}</li>
                      ))}
                    </ul>
                  </div>
                  <div className={styles.comparisonSection}>
                    <strong className={styles.consTitle}>✗ Cons:</strong>
                    <ul className={styles.comparisonList}>
                      {cons.map((con) => (
                        <li key={con}>{con}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* String Configuration */}
        <div className={panel.section}>
          <h4 className={panel.sectionTitle}>String Configuration</h4>
          <div className={styles.configGrid}>
            {configItems.map(([label, value]) => (
              <div key={label} className={styles.configItem}>
                <span className={styles.configLabel}>{label}</span>
                <span className={styles.configValue}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Inverter Specifications */}
        <div className={panel.section}>
          <h4 className={panel.sectionTitle}>Inverter Specifications</h4>
          <div className={styles.inverterSpecs}>
            {inverterSpecs.map(([label, value]) => (
              <div key={label} className={styles.specItem}>
                <span className={styles.specLabel}>{label}</span>
                <span className={styles.specValue}>{value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Wire Sizing */}
        <div className={panel.section}>
          <h4 className={panel.sectionTitle}>Wire Sizing & Voltage Drop</h4>
          <div className={styles.wireGrid}>
            {wireSections.map(({ title, cableType, length, drop, maxDrop }) => (
              <div key={title} className={styles.wireSection}>
                <h5 className={styles.wireTitle}>{title}</h5>
                <div className={styles.wireItem}>
                  <span className={styles.wireLabel}>Cable Type</span>
                  <span className={styles.wireValue}>{cableType}</span>
                </div>
                <div className={styles.wireItem}>
                  <span className={styles.wireLabel}>
                    Cable Length (one-way)
                  </span>
                  <span className={styles.wireValue}>{length}m</span>
                </div>
                <div className={styles.wireItem}>
                  <span className={styles.wireLabel}>Voltage Drop</span>
                  <span
                    className={`${styles.wireValue} ${
                      drop > maxDrop ? styles.warning : styles.good
                    }`}
                  >
                    {drop}% {drop <= maxDrop ? "✓" : "⚠️"}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Breaker Sizing */}
        <div className={panel.section}>
          <h4 className={panel.sectionTitle}>Breaker & Protection</h4>
          <div className={styles.breakerGrid}>
            <div className={styles.breakerItem}>
              <span className={styles.breakerLabel}>DC Array Disconnect</span>
              <span className={styles.breakerValue}>
                {design.breakers.dcBreakerType}
              </span>
            </div>
            <div className={styles.breakerItem}>
              <span className={styles.breakerLabel}>AC Grid Connection</span>
              <span className={styles.breakerValue}>
                {design.breakers.acBreakerType}
              </span>
            </div>
          </div>
        </div>

        {/* Advanced Settings */}
        <div className={panel.controls}>
          <button
            className={panel.toggleButton}
            onClick={() => setShowAdvanced(!showAdvanced)}
          >
            ⚙️ Advanced Settings
          </button>
          {showAdvanced && (
            <div className={styles.inputs}>
              {advancedInputs.map(([label, value, setValue, min, max]) => (
                <div key={label} className={panel.inputGroup}>
                  <label className={styles.inputLabel}>{label}</label>
                  <input
                    type="number"
                    className={styles.input}
                    value={value}
                    onChange={(e) => setValue(Number(e.target.value))}
                    min={min}
                    max={max}
                  />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Disclaimer */}
        <div className={panel.disclaimer}>
          <p>
            <strong>Note:</strong> This is a preliminary electrical design.
            Final system design must be performed by a certified electrician
            according to local building codes (DIN VDE 0100, DIN VDE 0126) and
            verified by your utility company before installation.
          </p>
        </div>
      </div>
    </div>
  );
}
