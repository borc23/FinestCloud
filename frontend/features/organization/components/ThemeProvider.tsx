"use client";

import { useOrganizationTheme } from "../hooks/useOrganizationTheme";

/**
 * Client component that applies organization theme to the app
 * Must be used within AuthProvider since it needs user context
 */
export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // This hook will dynamically inject CSS variables based on organization settings
  useOrganizationTheme();

  return <>{children}</>;
}
