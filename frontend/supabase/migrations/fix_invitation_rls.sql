-- Fix RLS policy for invitations to allow users to see invitations sent to their email
-- This allows users without an organization to see pending invitations

DROP POLICY IF EXISTS invitations_select ON invitations;

CREATE POLICY invitations_select ON invitations
    FOR SELECT TO authenticated
    USING (
        -- Users can see invitations for their organization
        organization_id IN (
            SELECT organization_id FROM profiles
            WHERE id = auth.uid()
        )
        -- OR users can see invitations sent to their email
        OR email = (
            SELECT email FROM auth.users WHERE id = auth.uid()
        )
    );
