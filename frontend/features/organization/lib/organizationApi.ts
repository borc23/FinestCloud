/**
 * Organization API - Simple and straightforward
 */

import { createClient } from "@/shared/lib/supabase/client";
import type { ProfileRow } from "@/features/auth/types/database";
import type {
  OrganizationRow,
  InvitationRow,
  UserRole,
} from "../types/organization";

// One shared fetch per user; membership changes reload the page, which resets it
let orgCache: {
  userId: string;
  promise: Promise<OrganizationRow | null>;
} | null = null;

async function fetchUserOrganization(
  userId: string,
): Promise<OrganizationRow | null> {
  const { data, error } = await createClient()
    .from("profiles")
    .select("organizations(*)")
    .eq("id", userId)
    .single();

  if (error) throw error;
  return data.organizations;
}

// Get user's organization
export function getUserOrganization(
  userId: string,
): Promise<OrganizationRow | null> {
  if (orgCache?.userId !== userId) {
    const entry = { userId, promise: fetchUserOrganization(userId) };
    entry.promise.catch(() => {
      if (orgCache === entry) orgCache = null;
    });
    orgCache = entry;
  }
  return orgCache.promise;
}

// Create organization (caller becomes owner, enforced server-side)
export async function createOrganization(name: string) {
  const supabase = createClient();

  // Generate subdomain from organization name (lowercase, no spaces, alphanumeric only)
  const subdomain = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 63); // Max subdomain length

  const { data, error } = await supabase.rpc("create_organization", {
    p_name: name,
    p_subdomain: subdomain,
  });

  if (error) throw error;
  return data;
}

// Update organization
export async function updateOrganization(
  orgId: string,
  updates: Partial<OrganizationRow>,
) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("organizations")
    .update(updates)
    .eq("id", orgId)
    .select()
    .single();

  if (error) throw error;
  orgCache = null;
  return data;
}

// Get organization members
export async function getOrganizationMembers(
  orgId: string,
): Promise<ProfileRow[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", orgId)
    .order("created_at");

  return data || [];
}

// Update member role
export async function updateMemberRole(userId: string, role: UserRole) {
  const supabase = createClient();
  const { error } = await supabase.rpc("set_member_role", {
    p_member_id: userId,
    p_role: role,
  });

  if (error) throw error;
}

// Remove member, or leave when userId is the current user
export async function removeMember(userId: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("remove_member", {
    p_member_id: userId,
  });

  if (error) throw error;
}

// Get invitations for organization (sent by this org)
export async function getInvitations(orgId: string): Promise<InvitationRow[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("*")
    .eq("organization_id", orgId)
    .eq("status", "pending") // Only show pending invitations
    .gt("expires_at", new Date().toISOString()) // Only show non-expired invitations
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching invitations:", error);
    throw error;
  }

  return data || [];
}

// Get pending invitations addressed to the current user's email
export async function getMyInvitations(email: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("invitations")
    .select("*, organizations(name)")
    .eq("email", email)
    .eq("status", "pending")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching my invitations:", error);
    return []; // Incoming invitations are optional; don't block the team view
  }

  return data;
}

// Create invitation (invitedBy must be the current user, enforced by RLS)
export async function createInvitation(
  orgId: string,
  email: string,
  role: UserRole,
  invitedBy: string,
) {
  const supabase = createClient();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

  const { data, error } = await supabase
    .from("invitations")
    .insert({
      organization_id: orgId,
      email,
      role,
      invited_by: invitedBy,
      token: crypto.randomUUID(),
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single();

  if (error) {
    console.error("Error creating invitation:", error);
    throw error;
  }
  return data;
}

// Cancel invitation
export async function cancelInvitation(invitationId: string) {
  const supabase = createClient();
  const { error } = await supabase
    .from("invitations")
    .update({ status: "cancelled" })
    .eq("id", invitationId);

  if (error) throw error;
}

// Get invitation by token (works before sign-in; token is the secret)
export async function getInvitationByToken(token: string) {
  const supabase = createClient();
  const { data } = await supabase.rpc("get_invitation", { p_token: token });
  return data as {
    email: string;
    role: UserRole;
    status: InvitationRow["status"];
    expires_at: string;
    organizations: { name: string };
  } | null;
}

// Accept invitation (email match, expiry and member limit checked server-side)
export async function acceptInvitation(token: string) {
  const supabase = createClient();
  const { error } = await supabase.rpc("accept_invitation", { p_token: token });
  if (error) throw error;
}
