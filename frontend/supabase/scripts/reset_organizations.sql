-- ============================================================================
-- DESTRUCTIVE - LOCAL / STAGING DATABASES ONLY. Not a migration.
--
-- Deletes every organization, invitation and activity log entry and detaches
-- all users from their organization. Useful for resetting test data while
-- working on the multi-tenancy features; never run it against production.
--
-- Run manually: psql "$DATABASE_URL" -f supabase/scripts/reset_organizations.sql
-- ============================================================================

BEGIN;

DELETE FROM invitations;
DELETE FROM activity_log;

UPDATE profiles
SET organization_id = NULL,
    role = 'designer';

DELETE FROM organizations;

-- Verify cleanup
SELECT 'Organizations count:' AS info, COUNT(*) AS count FROM organizations
UNION ALL
SELECT 'Invitations count:', COUNT(*) FROM invitations
UNION ALL
SELECT 'Activity logs count:', COUNT(*) FROM activity_log
UNION ALL
SELECT 'Users with organization:', COUNT(*) FROM profiles WHERE organization_id IS NOT NULL;

COMMIT;
