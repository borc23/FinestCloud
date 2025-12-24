-- Complete RLS policy fix for organizations feature
-- Run this entire script to ensure all policies are correct

-- ============================================================================
-- ORGANIZATIONS TABLE POLICIES
-- ============================================================================

-- First, drop ALL existing policies on organizations
DROP POLICY IF EXISTS organizations_select ON organizations;
DROP POLICY IF EXISTS organizations_insert ON organizations;
DROP POLICY IF EXISTS organizations_update ON organizations;
DROP POLICY IF EXISTS organizations_delete ON organizations;

-- Allow ANY authenticated user to insert (create) an organization
CREATE POLICY organizations_insert ON organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Users can only view their own organization
CREATE POLICY organizations_select ON organizations
    FOR SELECT
    TO authenticated
    USING (
        id IN (
            SELECT organization_id
            FROM profiles
            WHERE id = auth.uid()
        )
    );

-- Only owners/admins can update their organization
CREATE POLICY organizations_update ON organizations
    FOR UPDATE
    TO authenticated
    USING (
        id IN (
            SELECT organization_id
            FROM profiles
            WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
        )
    );

-- ============================================================================
-- PROFILES TABLE POLICIES
-- ============================================================================

-- Drop existing update policy
DROP POLICY IF EXISTS profiles_update ON profiles;

-- Allow users to update their own profile (needed for joining organizations)
CREATE POLICY profiles_update ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- ============================================================================
-- INVITATIONS TABLE POLICIES
-- ============================================================================

-- Drop existing policies
DROP POLICY IF EXISTS invitations_select ON invitations;
DROP POLICY IF EXISTS invitations_insert ON invitations;
DROP POLICY IF EXISTS invitations_update ON invitations;

-- Users can view:
-- 1. Invitations sent by their organization
-- 2. Invitations sent to their email
CREATE POLICY invitations_select ON invitations
    FOR SELECT
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id
            FROM profiles
            WHERE id = auth.uid()
        )
        OR
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Owners/admins can create invitations for their organization
CREATE POLICY invitations_insert ON invitations
    FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM profiles
            WHERE id = auth.uid()
            AND organization_id = invitations.organization_id
            AND role IN ('owner', 'admin')
        )
    );

-- Owners/admins can update (cancel) invitations
-- Users can also update invitations sent to them (for accepting)
CREATE POLICY invitations_update ON invitations
    FOR UPDATE
    TO authenticated
    USING (
        organization_id IN (
            SELECT organization_id
            FROM profiles
            WHERE id = auth.uid()
            AND role IN ('owner', 'admin')
        )
        OR
        email = (SELECT email FROM auth.users WHERE id = auth.uid())
    );

-- Verify policies are enabled
SELECT 'RLS is enabled on organizations:' as check, pg_catalog.relrowsecurity
FROM pg_catalog.pg_class
WHERE relname = 'organizations';

SELECT 'RLS is enabled on profiles:' as check, pg_catalog.relrowsecurity
FROM pg_catalog.pg_class
WHERE relname = 'profiles';

SELECT 'RLS is enabled on invitations:' as check, pg_catalog.relrowsecurity
FROM pg_catalog.pg_class
WHERE relname = 'invitations';
