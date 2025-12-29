-- TEMPORARY FIX: Disable RLS on profiles to avoid recursion
-- Run this in your Supabase SQL Editor

-- Drop all policies on profiles
DROP POLICY IF EXISTS profiles_select ON profiles;
DROP POLICY IF EXISTS profiles_update ON profiles;
DROP POLICY IF EXISTS profiles_insert ON profiles;
DROP POLICY IF EXISTS profiles_delete ON profiles;

-- Disable RLS on profiles table
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Keep RLS disabled on organizations (should already be disabled)
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Keep invitations RLS enabled but verify policies
DROP POLICY IF EXISTS invitations_select ON invitations;
DROP POLICY IF EXISTS invitations_insert ON invitations;
DROP POLICY IF EXISTS invitations_update ON invitations;

CREATE POLICY invitations_select ON invitations
    FOR SELECT
    TO anon, authenticated
    USING (true);

CREATE POLICY invitations_insert ON invitations
    FOR INSERT
    TO anon, authenticated
    WITH CHECK (true);

CREATE POLICY invitations_update ON invitations
    FOR UPDATE
    TO anon, authenticated
    USING (true);

-- Verify what's enabled
SELECT 'RLS Status:' as info;
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('profiles', 'organizations', 'invitations')
ORDER BY tablename;

SELECT 'Remaining Policies:' as info;
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('profiles', 'organizations', 'invitations')
ORDER BY tablename, cmd;
