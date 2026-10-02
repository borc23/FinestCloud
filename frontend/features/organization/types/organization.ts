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

export interface Organization {
  id: string;
  name: string;
  subdomain: string;
  customDomain: string | null;
  companyEmail: string | null;
  companyPhone: string | null;
  companyWebsite: string | null;
  companyAddress: string | null;
  logoUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  tier: OrganizationTier;
  maxUsers: number;
  maxProjectsPerMonth: number;
  features: OrganizationFeatures;
  financialDefaults: FinancialDefaults;
  contractStartDate: string | null;
  contractEndDate: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  id: string;
  email: string;
  displayName: string | null;
  role: UserRole;
  organizationId: string;
  createdAt: string;
}

export interface Invitation {
  id: string;
  organizationId: string;
  email: string;
  role: UserRole;
  invitedBy: string;
  invitedByEmail?: string;
  token: string;
  status: InvitationStatus;
  expiresAt: string;
  createdAt: string;
}

export interface ActivityLogEntry {
  id: string;
  organizationId: string;
  userId: string | null;
  userEmail?: string;
  action: string;
  resourceType: ResourceType | null;
  resourceId: string | null;
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface OrganizationMemberStats {
  organizationId: string;
  organizationName: string;
  memberCount: number;
  ownerCount: number;
  adminCount: number;
  designerCount: number;
  viewerCount: number;
}

export interface OrganizationProjectStats {
  organizationId: string;
  organizationName: string;
  totalProjects: number;
  completedProjects: number;
  draftProjects: number;
  uniqueDesigners: number;
  totalPanelsDesigned: number;
  totalEstimatedOutput: number;
}

// Database types (snake_case for API communication)
export interface OrganizationRow {
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
}

export interface InvitationRow {
  id: string;
  organization_id: string;
  email: string;
  role: UserRole;
  invited_by: string;
  token: string;
  status: InvitationStatus;
  expires_at: string;
  created_at: string;
}

export interface ActivityLogRow {
  id: string;
  organization_id: string;
  user_id: string | null;
  action: string;
  resource_type: ResourceType | null;
  resource_id: string | null;
  metadata: Record<string, any> | null;
  created_at: string;
}

// Forms and create/update types
export interface CreateOrganizationData {
  name: string;
  subdomain: string;
  companyEmail?: string;
  tier?: OrganizationTier;
}

export interface UpdateOrganizationData {
  name?: string;
  companyEmail?: string;
  companyPhone?: string;
  companyWebsite?: string;
  companyAddress?: string;
  logoUrl?: string;
  primaryColor?: string;
  secondaryColor?: string;
  financialDefaults?: Partial<FinancialDefaults>;
}

export interface CreateInvitationData {
  email: string;
  role: UserRole;
}

// Mappers
export function mapOrganizationRowToOrganization(
  row: OrganizationRow,
): Organization {
  return {
    id: row.id,
    name: row.name,
    subdomain: row.subdomain,
    customDomain: row.custom_domain,
    companyEmail: row.company_email,
    companyPhone: row.company_phone,
    companyWebsite: row.company_website,
    companyAddress: row.company_address,
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    tier: row.tier,
    maxUsers: row.max_users,
    maxProjectsPerMonth: row.max_projects_per_month,
    features: row.features,
    financialDefaults: row.financial_defaults,
    contractStartDate: row.contract_start_date,
    contractEndDate: row.contract_end_date,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapInvitationRowToInvitation(row: InvitationRow): Invitation {
  return {
    id: row.id,
    organizationId: row.organization_id,
    email: row.email,
    role: row.role,
    invitedBy: row.invited_by,
    token: row.token,
    status: row.status,
    expiresAt: row.expires_at,
    createdAt: row.created_at,
  };
}

export function mapActivityLogRowToActivityLogEntry(
  row: ActivityLogRow,
): ActivityLogEntry {
  return {
    id: row.id,
    organizationId: row.organization_id,
    userId: row.user_id,
    action: row.action,
    resourceType: row.resource_type,
    resourceId: row.resource_id,
    metadata: row.metadata,
    createdAt: row.created_at,
  };
}
