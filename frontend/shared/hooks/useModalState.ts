import { useState } from "react";

/**
 * Hook for managing modal and panel visibility state
 */
export function useModalState() {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPanelSelector, setShowPanelSelector] = useState(false);
  const [showProfilePanel, setShowProfilePanel] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadPanel, setShowLoadPanel] = useState(false);
  const [isDashboardMinimized, setIsDashboardMinimized] = useState(true);
  const [isRoofAnglePanelOpen, setIsRoofAnglePanelOpen] = useState(false);

  return {
    showUploadModal,
    setShowUploadModal,
    showPanelSelector,
    setShowPanelSelector,
    showProfilePanel,
    setShowProfilePanel,
    showSaveModal,
    setShowSaveModal,
    showLoadPanel,
    setShowLoadPanel,
    isDashboardMinimized,
    setIsDashboardMinimized,
    isRoofAnglePanelOpen,
    setIsRoofAnglePanelOpen,
  };
}
