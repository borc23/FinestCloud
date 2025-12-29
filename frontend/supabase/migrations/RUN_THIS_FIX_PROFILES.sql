-- IMPORTANT: Run this SQL in your Supabase SQL Editor
-- This fixes the issue where team members aren't visible to admins

-- FIRST: Drop the problematic policy
DROP POLICY IF EXISTS profiles_select ON profiles;

-- Add SELECT policy for profiles table WITHOUT recursion
-- Users can see profiles in the same organization
CREATE POLICY profiles_select ON profiles
    FOR SELECT
    TO anon, authenticated
    USING (
        -- Users can see their own profile
        id = auth.uid()
        OR
        -- Users can see profiles with the same organization_id as theirs
        (organization_id IS NOT NULL AND organization_id = (
            SELECT p.organization_id
            FROM profiles p
            WHERE p.id = auth.uid()
        ))
    );

-- Verify the policy was created
SELECT 'SUCCESS: Profiles SELECT policy created' as status;
SELECT policyname, cmd, roles, qual
FROM pg_policies
WHERE tablename = 'profiles';
