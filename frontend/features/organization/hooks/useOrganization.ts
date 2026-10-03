"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getUserOrganization } from "../lib/organizationApi";
import type { OrganizationRow } from "../types/organization";

/**
 * Current user's organization; all callers share one fetch per user
 */
export function useOrganization() {
  const { user } = useAuth();
  const [organization, setOrganization] = useState<OrganizationRow | null>(
    null,
  );

  useEffect(() => {
    setOrganization(null);
    if (!user?.id) return;

    let active = true;
    getUserOrganization(user.id).then(
      (org) => active && setOrganization(org),
      (err) => console.error("Failed to load organization:", err),
    );
    return () => {
      active = false;
    };
  }, [user?.id]);

  return { organization };
}
