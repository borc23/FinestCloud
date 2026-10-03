import { useState, useEffect } from "react";

type DashboardModal = "monthly" | "financials" | "electrical";

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
  const [openModal, setOpenModal] = useState<DashboardModal | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // Notify parent when minimize state or modal visibility changes
  useEffect(() => {
    // Dashboard is considered "not minimized" if any modal is open
    onMinimizeChange?.(isMinimized && !openModal);
  }, [isMinimized, openModal, onMinimizeChange]);

  // Auto-minimize when edit/draw/select modes are active
  useEffect(() => {
    if (isEditMode) {
      setIsMinimized(true);
    }
  }, [isEditMode]);

  const open = (modal: DashboardModal) => {
    setOpenModal(modal);
    // Hide dashboard behind the monthly chart and financials
    if (modal !== "electrical") setIsMinimized(true);
  };

  const close = () => {
    setOpenModal(null);
    setIsMinimized(false);
  };

  return { openModal, open, close, isMinimized, setIsMinimized };
}
