/**
 * Organization Types
 * TypeScript definitions for organization, invitations, and activity log
 */

export type OrganizationTier = "small" | "medium" | "large" | "enterprise";
export type UserRole = "owner" | "admin" | "designer" | "viewer";
export type InvitationStatus = "pending" | "accepted" | "expired" | "cancelled";
export type ResourceType =
  | "project"
  | "user"
  | "report"
  | "organization"
  | "invitation";

export interface OrganizationFeatures {
  white_label: boolean;
  api_access: boolean;
  custom_reports: boolean;
  advanced_analytics: boolean;
}

export interface FinancialDefaults {
  cost_per_watt: number;
  installation_markup: number;
  utility_rate: number;
  self_consumption_rate: number;
}

export type OrganizationRow = {
  id: string;
  name: string;
  subdomain: string;
  custom_domain: string | null;
  company_email: string | null;
  company_phone: string | null;
  company_website: string | null;
  company_address: string | null;
  logo_url: string | null;
  primary_color: string;
  secondary_color: string;
  tier: OrganizationTier;
  max_users: number;
  max_projects_per_month: number;
  features: OrganizationFeatures;
  financial_defaults: FinancialDefaults;
  contract_start_date: string | null;
  contract_end_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type InvitationRow = {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
};

export type ActivityLogRow = {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  resource_type: ResourceType | null;
  resource_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
};
