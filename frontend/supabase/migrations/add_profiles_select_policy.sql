-- Add SELECT policy for profiles table
-- This allows users to see other members in their organization

DROP POLICY IF EXISTS profiles_select ON profiles;

CREATE POLICY profiles_select ON profiles
    FOR SELECT
    TO anon, authenticated
    USING (
        -- Users can see their own profile
        id = auth.uid()
        OR
        -- Users can see profiles in their organization
        organization_id IN (
            SELECT organization_id
            FROM profiles
            WHERE id = auth.uid()
            AND organization_id IS NOT NULL
        )
    );

-- Verify the policy was created
SELECT 'Profiles SELECT policy created:';
SELECT policyname, cmd, roles
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'SELECT';
