import styles from "./SolarResultsDashboard.module.css";

interface DashboardActionsProps {
  isAuthenticated?: boolean;
  onSaveProject?: () => void;
  onViewMonthly: () => void;
  onViewFinancials: () => void;
  onViewElectrical: () => void;
  onGeneratePDF: () => void;
}

/**
 * Action buttons for the solar dashboard
 */
export default function DashboardActions({
  isAuthenticated,
  onSaveProject,
  onViewMonthly,
  onViewFinancials,
  onViewElectrical,
  onGeneratePDF,
}: DashboardActionsProps) {
  return (
    <div className={styles.monthlyButtonContainer}>
      {isAuthenticated && onSaveProject && (
        <button className={styles.saveButton} onClick={onSaveProject}>
          Save Project
        </button>
      )}
      <button className={styles.monthlyButton} onClick={onViewMonthly}>
        View Monthly Breakdown
      </button>
      <button className={styles.financialButton} onClick={onViewFinancials}>
        Financial Analysis
      </button>
      <button className={styles.electricalButton} onClick={onViewElectrical}>
        Electrical Design
      </button>
      <button className={styles.pdfButton} onClick={onGeneratePDF}>
        Download PDF Report
      </button>
    </div>
  );
}
