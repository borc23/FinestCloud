"use client";

import { useEffect } from "react";
import { useOrganization } from "../hooks/useOrganization";

/**
 * Applies the organization's branding colors (white-label orgs only) as CSS
 * variables. Must be used within AuthProvider since it needs user context.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { organization } = useOrganization();
  const whiteLabel = organization?.features?.white_label;
  const primary = whiteLabel ? organization?.primary_color : undefined;
  const secondary = whiteLabel ? organization?.secondary_color : undefined;

  useEffect(() => {
    const style = document.documentElement.style;
    const vars = {
      "--accent-primary": primary,
      "--accent-focus": primary && `${primary}40`, // 40 = 25% opacity
      "--accent-light": primary && `${primary}20`, // 20 = 12.5% opacity
      "--accent-hover": secondary, // hover states
    };
    for (const [name, value] of Object.entries(vars)) {
      if (value) style.setProperty(name, value);
    }
    // Reset to the default colors when the org (or its colors) change
    return () =>
      Object.keys(vars).forEach((name) => style.removeProperty(name));
  }, [primary, secondary]);

  return <>{children}</>;
}
