-- ============================================================================
-- Multi-Tenancy & Organization Management
-- Version: 1.2.0
-- Description: Add organization support for multi-user/enterprise features
-- ============================================================================

-- ============================================================================
-- ORGANIZATIONS TABLE
-- ============================================================================

-- Organizations: Company/tenant management
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL CHECK (length(trim(name)) > 0),
    subdomain TEXT UNIQUE NOT NULL CHECK (subdomain ~ '^[a-z0-9-]+$'),
    custom_domain TEXT,

    -- Contact information
    company_email TEXT,
    company_phone TEXT,
    company_website TEXT,
    company_address TEXT,

    -- Branding
    logo_url TEXT,
    primary_color TEXT DEFAULT '#3B82F6',
    secondary_color TEXT DEFAULT '#1E40AF',

    -- Tier & limits
    tier TEXT NOT NULL DEFAULT 'small' CHECK (tier IN ('small', 'medium', 'large', 'enterprise')),
    max_users INTEGER NOT NULL DEFAULT 20 CHECK (max_users > 0),
    max_projects_per_month INTEGER NOT NULL DEFAULT 100 CHECK (max_projects_per_month > 0),

    -- Feature flags (JSONB for flexibility)
    features JSONB NOT NULL DEFAULT '{
        "white_label": true,
        "api_access": false,
        "custom_reports": false,
        "advanced_analytics": false
    }'::jsonb,

    -- Financial defaults (company-wide)
    financial_defaults JSONB NOT NULL DEFAULT '{
        "cost_per_watt": 1.80,
        "installation_markup": 0.25,
        "utility_rate": 0.35,
        "self_consumption_rate": 0.30
    }'::jsonb,

    -- Contract & status
    contract_start_date DATE,
    contract_end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- EXTEND EXISTING TABLES FOR MULTI-TENANCY
-- ============================================================================

-- Add organization_id to profiles
ALTER TABLE profiles ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
ALTER TABLE profiles ADD COLUMN role TEXT NOT NULL DEFAULT 'designer'
    CHECK (role IN ('owner', 'admin', 'designer', 'viewer'));

-- Add organization_id to projects (for org-level visibility)
ALTER TABLE projects ADD COLUMN organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;

-- Add comments
COMMENT ON COLUMN profiles.organization_id IS 'Organization this user belongs to (null for individual users)';
COMMENT ON COLUMN profiles.role IS 'User role within organization: owner, admin, designer, viewer';
COMMENT ON COLUMN projects.organization_id IS 'Organization this project belongs to (for team visibility)';


-- ============================================================================
-- INVITATIONS TABLE
-- ============================================================================

-- Invitations: Team member invitations
CREATE TABLE invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    email TEXT NOT NULL CHECK (length(trim(email)) > 0),
    role TEXT NOT NULL CHECK (role IN ('admin', 'designer', 'viewer')),
    invited_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'cancelled')),
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- ACTIVITY LOG TABLE
-- ============================================================================

-- Activity log: Audit trail for enterprise customers
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    action TEXT NOT NULL CHECK (length(trim(action)) > 0),
    resource_type TEXT CHECK (resource_type IN ('project', 'user', 'report', 'organization', 'invitation')),
    resource_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- INDEXES - Performance Optimization
-- ============================================================================

-- Organization indexes
CREATE INDEX idx_organizations_subdomain ON organizations(subdomain);
CREATE INDEX idx_organizations_active ON organizations(is_active, tier);

-- Profile organization indexes
CREATE INDEX idx_profiles_organization ON profiles(organization_id);
CREATE INDEX idx_profiles_organization_role ON profiles(organization_id, role);

-- Project organization indexes
CREATE INDEX idx_projects_organization ON projects(organization_id);
CREATE INDEX idx_projects_organization_created ON projects(organization_id, created_at DESC);

-- Invitation indexes
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_organization_status ON invitations(organization_id, status);
CREATE INDEX idx_invitations_token ON invitations(token);

-- Activity log indexes
CREATE INDEX idx_activity_log_org_created ON activity_log(organization_id, created_at DESC);
CREATE INDEX idx_activity_log_user ON activity_log(user_id, created_at DESC);
CREATE INDEX idx_activity_log_resource ON activity_log(resource_type, resource_id);


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Organization-aware
-- ============================================================================

ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY organizations_select ON organizations
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT organization_id FROM profiles
            WHERE id = (SELECT auth.uid())
        )
    );

CREATE POLICY organizations_update ON organizations
    FOR UPDATE TO authenticated
    USING (
        id IN (
            SELECT organization_id FROM profiles
            WHERE id = (SELECT auth.uid())
            AND role IN ('owner', 'admin')
        )
    );

-- Invitations policies
CREATE POLICY invitations_select ON invitations
    FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = (SELECT auth.uid())
        )
        OR email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
    );

CREATE POLICY invitations_insert ON invitations
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = (SELECT auth.uid())
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY invitations_update ON invitations
    FOR UPDATE TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = (SELECT auth.uid())
            AND role IN ('owner', 'admin')
        )
        OR email = (SELECT email FROM auth.users WHERE id = (SELECT auth.uid()))
    );

CREATE POLICY invitations_delete ON invitations
    FOR DELETE TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = (SELECT auth.uid())
            AND role IN ('owner', 'admin')
        )
    );

-- Activity log policies (read-only for org members)
CREATE POLICY activity_log_select ON activity_log
    FOR SELECT TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = (SELECT auth.uid())
        )
    );

CREATE POLICY activity_log_insert ON activity_log
    FOR INSERT TO authenticated
    WITH CHECK (
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = (SELECT auth.uid())
        )
    );


-- ============================================================================
-- UPDATE EXISTING RLS POLICIES FOR MULTI-TENANCY
-- ============================================================================

-- Drop old project policies
DROP POLICY IF EXISTS projects_select ON projects;
DROP POLICY IF EXISTS projects_insert ON projects;
DROP POLICY IF EXISTS projects_update ON projects;
DROP POLICY IF EXISTS projects_delete ON projects;

-- New organization-aware project policies
-- Users can see projects they own OR projects in their organization
CREATE POLICY projects_select ON projects
    FOR SELECT TO authenticated
    USING (
        (SELECT auth.uid()) = user_id
        OR organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = (SELECT auth.uid())
            AND organization_id IS NOT NULL
        )
    );

CREATE POLICY projects_insert ON projects
    FOR INSERT TO authenticated
    WITH CHECK (
        (SELECT auth.uid()) = user_id
        AND (
            organization_id IS NULL
            OR organization_id IN (
                SELECT organization_id FROM profiles
                WHERE id = (SELECT auth.uid())
            )
        )
    );

CREATE POLICY projects_update ON projects
    FOR UPDATE TO authenticated
    USING (
        (SELECT auth.uid()) = user_id
        OR (
            organization_id IN (
                SELECT organization_id FROM profiles
                WHERE id = (SELECT auth.uid())
                AND role IN ('owner', 'admin')
            )
        )
    );

CREATE POLICY projects_delete ON projects
    FOR DELETE TO authenticated
    USING (
        (SELECT auth.uid()) = user_id
        OR (
            organization_id IN (
                SELECT organization_id FROM profiles
                WHERE id = (SELECT auth.uid())
                AND role IN ('owner', 'admin')
            )
        )
    );


-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-update updated_at for organizations
CREATE TRIGGER organizations_updated_at BEFORE UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
    p_organization_id UUID,
    p_action TEXT,
    p_resource_type TEXT DEFAULT NULL,
    p_resource_id UUID DEFAULT NULL,
    p_metadata JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_log_id UUID;
BEGIN
    INSERT INTO activity_log (
        organization_id,
        user_id,
        action,
        resource_type,
        resource_id,
        metadata
    ) VALUES (
        p_organization_id,
        auth.uid(),
        p_action,
        p_resource_type,
        p_resource_id,
        p_metadata
    )
    RETURNING id INTO v_log_id;

    RETURN v_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================================
-- VIEWS - Organization Analytics
-- ============================================================================

-- Organization member stats
CREATE OR REPLACE VIEW organization_member_stats AS
SELECT
    o.id as organization_id,
    o.name as organization_name,
    COUNT(DISTINCT p.id) as member_count,
    COUNT(DISTINCT CASE WHEN p.role = 'owner' THEN p.id END) as owner_count,
    COUNT(DISTINCT CASE WHEN p.role = 'admin' THEN p.id END) as admin_count,
    COUNT(DISTINCT CASE WHEN p.role = 'designer' THEN p.id END) as designer_count,
    COUNT(DISTINCT CASE WHEN p.role = 'viewer' THEN p.id END) as viewer_count
FROM organizations o
LEFT JOIN profiles p ON p.organization_id = o.id
GROUP BY o.id, o.name;

-- Security: View inherits RLS from underlying tables
ALTER VIEW organization_member_stats SET (security_invoker = true);
GRANT SELECT ON organization_member_stats TO authenticated;


-- Organization project stats
CREATE OR REPLACE VIEW organization_project_stats AS
SELECT
    o.id as organization_id,
    o.name as organization_name,
    COUNT(DISTINCT pr.id) as total_projects,
    COUNT(DISTINCT CASE WHEN pr.status = 'completed' THEN pr.id END) as completed_projects,
    COUNT(DISTINCT CASE WHEN pr.status = 'draft' THEN pr.id END) as draft_projects,
    COUNT(DISTINCT pr.user_id) as unique_designers,
    COALESCE(SUM(ra.panel_count), 0) as total_panels_designed,
    COALESCE(SUM(ra.estimated_output), 0) as total_estimated_output
FROM organizations o
LEFT JOIN projects pr ON pr.organization_id = o.id
LEFT JOIN roof_analysis ra ON ra.project_id = pr.id
GROUP BY o.id, o.name;

-- Security: View inherits RLS from underlying tables
ALTER VIEW organization_project_stats SET (security_invoker = true);
GRANT SELECT ON organization_project_stats TO authenticated;


-- ============================================================================
-- TABLE COMMENTS - Documentation
-- ============================================================================

COMMENT ON TABLE organizations IS 'Organizations (companies/tenants) for multi-user management';
COMMENT ON TABLE invitations IS 'Team member invitations with expiry and role assignment';
COMMENT ON TABLE activity_log IS 'Audit trail for organization activities';

COMMENT ON COLUMN organizations.subdomain IS 'Unique subdomain for white-label access (e.g., acme.yourapp.com)';
COMMENT ON COLUMN organizations.tier IS 'Pricing tier: small, medium, large, enterprise';
COMMENT ON COLUMN organizations.features IS 'JSON feature flags for tier-based capabilities';
COMMENT ON COLUMN organizations.financial_defaults IS 'Default financial parameters for this organization';

COMMENT ON VIEW organization_member_stats IS 'Member count and role distribution per organization';
COMMENT ON VIEW organization_project_stats IS 'Project metrics aggregated by organization';


-- ============================================================================
-- HELPER FUNCTIONS FOR COMMON OPERATIONS
-- ============================================================================

-- Function to check if user has specific role in organization
CREATE OR REPLACE FUNCTION user_has_org_role(
    p_user_id UUID,
    p_organization_id UUID,
    p_required_roles TEXT[]
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM profiles
        WHERE id = p_user_id
        AND organization_id = p_organization_id
        AND role = ANY(p_required_roles)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get user's organization
CREATE OR REPLACE FUNCTION get_user_organization(p_user_id UUID)
RETURNS UUID AS $$
BEGIN
    RETURN (
        SELECT organization_id FROM profiles
        WHERE id = p_user_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
