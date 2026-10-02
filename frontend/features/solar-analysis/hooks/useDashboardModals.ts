import { useState, useEffect } from "react";

interface UseDashboardModalsProps {
  isEditMode?: boolean;
  onMinimizeChange?: (minimized: boolean) => void;
}

/**
 * Custom hook for managing dashboard minimization and modal visibility states
 */
export function useDashboardModals({
  isEditMode,
  onMinimizeChange,
}: UseDashboardModalsProps = {}) {
  const [showMonthlyChart, setShowMonthlyChart] = useState(false);
  const [showFinancials, setShowFinancials] = useState(false);
  const [showElectrical, setShowElectrical] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Notify parent when minimize state or modal visibility changes
  useEffect(() => {
    // Dashboard is considered "not minimized" if any modal is open
    onMinimizeChange?.(
      isMinimized && !showMonthlyChart && !showFinancials && !showElectrical,
    );
  }, [
    isMinimized,
    showMonthlyChart,
    showFinancials,
    showElectrical,
    onMinimizeChange,
  ]);

  // Auto-minimize when edit/draw/select modes are active
  useEffect(() => {
    if (isEditMode) {
      setIsMinimized(true);
    }
  }, [isEditMode]);

  // Hide dashboard when monthly chart or financials open
  useEffect(() => {
    if (showMonthlyChart || showFinancials) {
      setIsMinimized(true);
    }
  }, [showMonthlyChart, showFinancials]);

  return {
    showMonthlyChart,
    setShowMonthlyChart,
    showFinancials,
    setShowFinancials,
    showElectrical,
    setShowElectrical,
    isMinimized,
    setIsMinimized,
  };
}
