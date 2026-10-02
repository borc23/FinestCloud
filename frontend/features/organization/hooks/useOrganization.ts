"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getUserOrganization } from "../lib/organizationApi";
import type { OrganizationRow } from "../types/organization";

/**
 * Hook to get the current user's organization with caching
 * Returns organization data, loading state, and error state
 */
export function useOrganization() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<OrganizationRow | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function loadOrganization() {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const org = await getUserOrganization(user.id);
        setOrganization(org);
      } catch (err) {
        console.error("Failed to load organization:", err);
        setError(
          err instanceof Error ? err : new Error("Failed to load organization"),
        );
      } finally {
        setLoading(false);
      }
    }

    loadOrganization();
  }, [user?.id]);

  return {
    organization,
    loading,
    error,
    // Helper methods for common use cases
    hasFeature: (feature: keyof OrganizationRow["features"]) =>
      organization?.features?.[feature] ?? false,
    isWhiteLabelEnabled: () => organization?.features?.white_label ?? false,
  };
}
