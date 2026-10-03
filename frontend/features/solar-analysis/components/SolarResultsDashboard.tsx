"use client";

import { useEffect } from "react";
import styles from "./SolarResultsDashboard.module.css";
import MonthlyProductionChart from "./MonthlyProductionChart";
import FinancialCalculator from "@/features/financial/components/FinancialCalculator";
import ElectricalDesignPanel from "@/features/electrical/components/ElectricalDesignPanel";
import DashboardActions from "./DashboardActions";
import { useSolarDashboardData } from "@/features/solar-analysis/hooks/useSolarDashboardData";
import { useDashboardModals } from "@/features/solar-analysis/hooks/useDashboardModals";
import { useSolarReportGenerator } from "@/features/solar-analysis/hooks/useSolarReportGenerator";
import type { SolarResultsDashboardProps } from "@/features/solar-analysis/types/dashboard";

export default function SolarResultsDashboard(
  props: SolarResultsDashboardProps,
) {
  // Extract and prepare all dashboard data
  const { panelData, location, pvwattsData, isLoading, annualProduction } =
    useSolarDashboardData(props);

  // Manage modal states
  const { openModal, open, close, isMinimized, setIsMinimized } =
    useDashboardModals({
      isEditMode: props.isEditMode,
      onMinimizeChange: props.onMinimizeChange,
    });

  // PDF report generation
  const { handleGeneratePDF } = useSolarReportGenerator({
    panelData: panelData!,
    annualProduction,
    location,
    pvwatts: pvwattsData,
  });

  // Expose minimize function to parent via ref
  useEffect(() => {
    if (props.minimizeRef) {
      props.minimizeRef.current = () => setIsMinimized(true);
    }
  }, [props.minimizeRef, setIsMinimized]);

  if (!panelData) {
    return null;
  }

  return (
    <>
      <div
        className={`${styles.dashboard} ${isMinimized ? styles.minimized : ""}`}
      >
        {isMinimized ? (
          <button
            className={styles.minimizedButton}
            onClick={() => setIsMinimized(false)}
            aria-label="Expand analytics"
          >
            📊
          </button>
        ) : (
          <>
            <div className={styles.header}>
              <span className={styles.title}>Analytics</span>
              <button
                className={styles.closeButton}
                onClick={() => setIsMinimized(true)}
                aria-label="Minimize analytics"
              >
                ×
              </button>
            </div>

            <div className={styles.details}>
              <MetricItem label="Panel Count" value={panelData.totalPanels} />
              <MetricItem
                label="System Size"
                value={`${panelData.systemSize.toFixed(3)} kW`}
              />
              {annualProduction && (
                <MetricItem
                  label="Annual Production"
                  value={`${annualProduction.toLocaleString()} kWh/year`}
                  isLoading={isLoading}
                />
              )}
              {pvwattsData && (
                <MetricItem
                  label="Capacity Factor"
                  value={`${pvwattsData.capacity_factor.toFixed(1)}%`}
                />
              )}
            </div>

            {pvwattsData && annualProduction && (
              <DashboardActions
                isAuthenticated={props.isAuthenticated}
                onSaveProject={props.onSaveProject}
                onViewMonthly={() => open("monthly")}
                onViewFinancials={() => open("financials")}
                onViewElectrical={() => open("electrical")}
                onGeneratePDF={handleGeneratePDF}
              />
            )}
          </>
        )}
      </div>

      {openModal === "monthly" && pvwattsData && (
        <MonthlyProductionChart data={pvwattsData} onClose={close} />
      )}

      {openModal === "financials" && annualProduction && (
        <FinancialCalculator
          annualProduction={annualProduction}
          systemSize={panelData.systemSize}
          onClose={close}
        />
      )}

      {openModal === "electrical" && (
        <ElectricalDesignPanel
          panelWattage={panelData.panelWattage}
          totalPanels={panelData.totalPanels}
          systemSizeKw={panelData.systemSize}
          onClose={close}
        />
      )}
    </>
  );
}

function MetricItem({
  label,
  value,
  isLoading = false,
}: {
  label: string;
  value: string | number;
  isLoading?: boolean;
}) {
  return (
    <div className={styles.detailItem}>
      <span className={styles.label}>{label}</span>
      <span className={styles.value}>
        {isLoading ? (
          <span className={styles.loadingIndicator}>...</span>
        ) : (
          value
        )}
      </span>
    </div>
  );
}
