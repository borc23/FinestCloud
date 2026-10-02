/**
 * Energy Offset Display Component
 * Shows energy production, self-consumption, and grid feed-in visualization
 */

import React from "react";
import styles from "./FinancialCalculator.module.css";
import type { FinancialResults } from "@/features/financial/types/financial";

interface EnergyOffsetDisplayProps {
  results: FinancialResults;
  annualProduction: number;
  avgMonthlyBill: number;
  costPerKwh: number;
  selfConsumptionRate: number;
}

export default function EnergyOffsetDisplay({
  results,
  annualProduction,
  avgMonthlyBill,
  costPerKwh,
  selfConsumptionRate,
}: EnergyOffsetDisplayProps) {
  return (
    <div className={styles.section}>
      <h4 className={styles.sectionTitle}>Energy Offset & Usage</h4>
      <div className={styles.energyOffset}>
        <div className={styles.offsetCircle}>
          <svg className={styles.offsetSvg} viewBox="0 0 200 200">
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="rgba(255, 255, 255, 0.1)"
              strokeWidth="20"
            />
            <circle
              cx="100"
              cy="100"
              r="85"
              fill="none"
              stroke="#4caf50"
              strokeWidth="20"
              strokeDasharray={`${
                (results.energyOffsetPercentage / 100) * 534.07
              } 534.07`}
              strokeLinecap="round"
              transform="rotate(-90 100 100)"
            />
            <text
              x="100"
              y="95"
              textAnchor="middle"
              fill="rgba(255, 255, 255, 0.95)"
              fontSize="36"
              fontWeight="bold"
            >
              {results.energyOffsetPercentage}%
            </text>
            <text
              x="100"
              y="115"
              textAnchor="middle"
              fill="rgba(255, 255, 255, 0.6)"
              fontSize="14"
            >
              Energy Offset
            </text>
          </svg>
        </div>
        <div className={styles.offsetDetails}>
          <div className={styles.offsetItem}>
            <span className={styles.offsetLabel}>Annual Household Usage</span>
            <span className={styles.offsetValue}>
              {Math.round((avgMonthlyBill * 12) / costPerKwh).toLocaleString()}{" "}
              kWh
            </span>
          </div>
          <div className={styles.offsetItem}>
            <span className={styles.offsetLabel}>Solar Production</span>
            <span className={styles.offsetValue}>
              {annualProduction.toLocaleString()} kWh
            </span>
          </div>
          <div className={styles.offsetItem}>
            <span className={styles.offsetLabel}>Self-Consumed</span>
            <span className={styles.offsetValue}>
              {results.selfConsumptionAmount.toLocaleString()} kWh (
              {selfConsumptionRate}%)
            </span>
          </div>
          <div className={styles.offsetItem}>
            <span className={styles.offsetLabel}>Grid Feed-in</span>
            <span className={styles.offsetValue}>
              {results.gridFeedInAmount.toLocaleString()} kWh (
              {100 - selfConsumptionRate}%)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
