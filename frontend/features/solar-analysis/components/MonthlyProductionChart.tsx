"use client";

import styles from "./MonthlyProductionChart.module.css";
import type { PVWattsResponse } from "@/features/solar-analysis/types/pvwatts";

interface MonthlyProductionChartProps {
  data: PVWattsResponse;
  onClose?: () => void;
}

export default function MonthlyProductionChart({
  data,
  onClose,
}: MonthlyProductionChartProps) {
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const monthlyData = data.monthly_production.map((production, index) => ({
    month: months[index],
    production: Math.round(production),
  }));

  const maxProduction = Math.max(...data.monthly_production);

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h3 className={styles.title}>Monthly Solar Production</h3>
        <button
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <div className={styles.summary}>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Annual Total</span>
          <span className={styles.summaryValue}>
            {Math.round(data.annual_production).toLocaleString()} kWh
          </span>
        </div>
        <div className={styles.summaryItem}>
          <span className={styles.summaryLabel}>Capacity Factor</span>
          <span className={styles.summaryValue}>
            {data.capacity_factor.toFixed(1)}%
          </span>
        </div>
        {data.station_info?.city && (
          <div className={styles.weatherInfo}>
            Weather data: {data.station_info.city}, {data.station_info.state}
            {data.station_info.distance &&
              ` (${Math.round(data.station_info.distance)}km)`}
          </div>
        )}
      </div>

      <div className={styles.chart}>
        {monthlyData.map((item, index) => (
          <div key={index} className={styles.monthItem}>
            <div className={styles.barContainer}>
              <div
                className={styles.bar}
                style={{
                  height: `${(item.production / maxProduction) * 100}%`,
                }}
                title={`${item.month}: ${item.production.toLocaleString()} kWh`}
              />
            </div>
            <span className={styles.monthLabel}>{item.month}</span>
            <span className={styles.productionValue}>
              {item.production.toLocaleString()}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
