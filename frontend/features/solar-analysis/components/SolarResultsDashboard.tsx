"use client";

import { useEffect } from "react";
import styles from "./SolarResultsDashboard.module.css";
import MonthlyProductionChart from "./MonthlyProductionChart";
import FinancialCalculator from "@/features/financial/components/FinancialCalculator";
import ElectricalDesignPanel from "@/features/electrical/components/ElectricalDesignPanel";
import { Icon } from "@/shared/components/ui/Icon";
import { useSolarDashboardData } from "@/features/solar-analysis/hooks/useSolarDashboardData";
import { useDashboardModals } from "@/features/solar-analysis/hooks/useDashboardModals";
import { useSolarReportGenerator } from "@/features/solar-analysis/hooks/useSolarReportGenerator";
import type { SolarResultsDashboardProps } from "@/features/solar-analysis/types/dashboard";

const euro = (value: number) => `€${Math.round(value).toLocaleString()}`;

export default function SolarResultsDashboard(
  props: SolarResultsDashboardProps,
) {
  const {
    panelData,
    location,
    pvwattsData,
    isLoading,
    annualProduction,
    electricityPrice,
    financials,
  } = useSolarDashboardData(props);

  const { openModal, open, close, isMinimized, setIsMinimized } =
    useDashboardModals({
      isEditMode: props.isEditMode,
      onMinimizeChange: props.onMinimizeChange,
    });

  const { handleGeneratePDF } = useSolarReportGenerator({
    panelData: panelData!,
    annualProduction,
    location,
    pvwatts: pvwattsData,
    financials,
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

  const netSavings =
    financials &&
    financials.twentyFiveYearSavings +
      financials.twentyFiveYearFeedInRevenue -
      financials.netSystemCost;

  const stats = financials && [
    { label: "Build cost", value: euro(financials.netSystemCost) },
    {
      label: "Return / year",
      value: euro(
        financials.firstYearSavings + financials.firstYearFeedInRevenue,
      ),
      positive: true,
    },
    { label: "Payback", value: `${financials.paybackPeriod} yrs` },
    {
      label: "25-year net",
      value: euro(netSavings!),
      positive: netSavings! > 0,
    },
  ];

  const actions = [
    pvwattsData && {
      label: "Monthly",
      icon: "chart",
      onClick: () => open("monthly"),
    },
    annualProduction && {
      label: "Finance",
      icon: "euro",
      onClick: () => open("financials"),
    },
    { label: "Electrical", icon: "bolt", onClick: () => open("electrical") },
    financials && {
      label: "PDF",
      icon: "file-pdf",
      onClick: handleGeneratePDF,
    },
  ].filter(Boolean) as { label: string; icon: string; onClick: () => void }[];

  return (
    <>
      {isMinimized ? (
        <button
          className={styles.fab}
          onClick={() => setIsMinimized(false)}
          aria-label="Expand analytics"
        >
          <Icon name="chart" />
        </button>
      ) : (
        <section className={styles.card} aria-label="Analytics">
          <header className={styles.header}>
            <span className={styles.title}>Analytics</span>
            <button
              className={styles.iconButton}
              onClick={() => setIsMinimized(true)}
              aria-label="Minimize analytics"
            >
              <Icon name="minus" />
            </button>
          </header>

          <div className={styles.body}>
            <div>
              <div className={styles.hero}>
                {annualProduction?.toLocaleString() ?? (isLoading ? "…" : "—")}
                <span className={styles.unit}>kWh / year</span>
              </div>
              <div className={styles.meta}>
                {panelData.totalPanels} panels ·{" "}
                {panelData.systemSize.toFixed(1)} kW
                {pvwattsData &&
                  ` · ${pvwattsData.capacity_factor.toFixed(
                    0,
                  )}% capacity factor`}
              </div>
            </div>

            {stats && (
              <div className={styles.grid}>
                {stats.map(({ label, value, positive }) => (
                  <div key={label} className={styles.stat}>
                    <span className={styles.label}>{label}</span>
                    <span
                      className={`${styles.value} ${
                        positive ? styles.positive : ""
                      }`}
                    >
                      {value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {electricityPrice?.costPerKwh && (
              <p className={styles.meta}>
                Electricity €{electricityPrice.costPerKwh.toFixed(3)}/kWh ·{" "}
                {electricityPrice.country} · Eurostat {electricityPrice.period}
              </p>
            )}
          </div>

          <footer className={styles.actions}>
            {props.isAuthenticated && props.onSaveProject && (
              <button
                className={`${styles.action} ${styles.primary}`}
                onClick={props.onSaveProject}
              >
                <Icon name="save" /> Save project
              </button>
            )}
            {actions.map(({ label, icon, onClick }) => (
              <button key={label} className={styles.action} onClick={onClick}>
                <Icon name={icon} />
                {label}
              </button>
            ))}
          </footer>
        </section>
      )}

      {openModal === "monthly" && pvwattsData && (
        <MonthlyProductionChart data={pvwattsData} onClose={close} />
      )}

      {openModal === "financials" && annualProduction && (
        <FinancialCalculator
          annualProduction={annualProduction}
          systemSize={panelData.systemSize}
          electricityPrice={electricityPrice}
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
