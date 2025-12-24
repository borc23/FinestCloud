-- Final comprehensive RLS fix
-- This ensures policies work for the anon role (used by client)

-- Step 1: Grant necessary permissions to anon role
GRANT USAGE ON SCHEMA public TO anon;
GRANT ALL ON public.organizations TO anon;
GRANT ALL ON public.profiles TO anon;
GRANT ALL ON public.invitations TO anon;

-- Step 2: Completely recreate organizations policies
DROP POLICY IF EXISTS organizations_insert ON organizations;
DROP POLICY IF EXISTS organizations_select ON organizations;
DROP POLICY IF EXISTS organizations_update ON organizations;

-- Insert policy - MUST specify role as anon
CREATE POLICY organizations_insert ON organizations
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

-- Select policy
CREATE POLICY organizations_select ON organizations
    FOR SELECT
    TO anon, authenticated
    USING (
        id IN (
            SELECT organization_id
            FROM profiles
            WHERE id = auth.uid()
        )
    );

-- Update policy
CREATE POLICY organizations_update ON organizations
    FOR UPDATE
    TO anon, authenticated
    USING (
        id IN (
            SELECT organization_id
            FROM profiles
            WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- Step 3: Fix profiles update policy
DROP POLICY IF EXISTS profiles_update ON profiles;

CREATE POLICY profiles_update ON profiles
    FOR UPDATE
    TO anon, authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Step 4: Fix invitations policies
DROP POLICY IF EXISTS invitations_select ON invitations;
DROP POLICY IF EXISTS invitations_insert ON invitations;
DROP POLICY IF EXISTS invitations_update ON invitations;

CREATE POLICY invitations_select ON invitations
    FOR SELECT
    TO anon, authenticated
    USING (
        organization_id IN (
            SELECT organization_id
            FROM profiles
            WHERE id = auth.uid()
        )
        OR
        email IN (
            SELECT email
            FROM profiles
            WHERE id = auth.uid()
        )
    );

CREATE POLICY invitations_insert ON invitations
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
            AND organization_id = invitations.organization_id
            AND role IN ('owner', 'admin')
        )
    );

CREATE POLICY invitations_update ON invitations
    FOR UPDATE
    TO anon, authenticated
    USING (
        organization_id IN (
            SELECT organization_id
            FROM profiles
            WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
        )
        OR
        email IN (
            SELECT email
            FROM profiles
            WHERE id = auth.uid()
        )
    );

-- Verify
SELECT 'Policies created for organizations:';
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'organizations';
