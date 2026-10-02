"use client";

import { useEffect } from "react";
import { useOrganization } from "./useOrganization";

/**
 * Hook to dynamically inject organization branding colors into CSS variables
 * This allows the entire app to use the organization's color scheme
 */
export function useOrganizationTheme() {
  const { organization, isWhiteLabelEnabled } = useOrganization();

  useEffect(() => {
    // Only apply white-label theming if the feature is enabled
    if (!isWhiteLabelEnabled()) {
      return;
    }

    const root = document.documentElement;

    // Apply primary color
    if (organization?.primary_color) {
      root.style.setProperty("--accent-primary", organization.primary_color);
      root.style.setProperty(
        "--accent-focus",
        `${organization.primary_color}40`,
      ); // 40 = 25% opacity
      root.style.setProperty(
        "--accent-light",
        `${organization.primary_color}20`,
      ); // 20 = 12.5% opacity
    }

    // Apply secondary color (for hover states)
    if (organization?.secondary_color) {
      root.style.setProperty("--accent-hover", organization.secondary_color);
    }

    // Cleanup function to reset to default colors when component unmounts
    return () => {
      if (!organization?.primary_color) {
        root.style.removeProperty("--accent-primary");
        root.style.removeProperty("--accent-focus");
        root.style.removeProperty("--accent-light");
      }
      if (!organization?.secondary_color) {
        root.style.removeProperty("--accent-hover");
      }
    };
  }, [
    organization?.primary_color,
    organization?.secondary_color,
    isWhiteLabelEnabled,
  ]);

  return {
    primaryColor: organization?.primary_color,
    secondaryColor: organization?.secondary_color,
    isWhiteLabelEnabled: isWhiteLabelEnabled(),
  };
}
