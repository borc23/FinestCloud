-- Fix RLS policies to allow organization creation and invitations

-- Drop existing policies
DROP POLICY IF EXISTS organizations_select ON organizations;
DROP POLICY IF EXISTS organizations_update ON organizations;
DROP POLICY IF EXISTS organizations_insert ON organizations;

-- Organizations: Allow authenticated users to create organizations
CREATE POLICY organizations_insert ON organizations
    FOR INSERT TO authenticated
    WITH CHECK (true); -- Any authenticated user can create an organization

-- Organizations: Users can view their own organization
CREATE POLICY organizations_select ON organizations
    FOR SELECT TO authenticated
    USING (
        id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
        )
    );

-- Organizations: Only owners/admins can update their organization
CREATE POLICY organizations_update ON organizations
    FOR UPDATE TO authenticated
    USING (
        id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Profiles: Allow users to update their own profile (needed for joining organizations)
DROP POLICY IF EXISTS profiles_update ON profiles;
CREATE POLICY profiles_update ON profiles
    FOR UPDATE TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
