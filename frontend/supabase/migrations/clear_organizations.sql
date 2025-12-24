-- Clear all organizations and reset user profiles
-- This will remove all organizations, invitations, and activity logs
-- and reset all users to have no organization

-- Delete all invitations
DELETE FROM invitations;

-- Delete all activity logs
DELETE FROM activity_log;

-- Reset all user profiles to have no organization
UPDATE profiles
SET organization_id = NULL,
    role = 'designer';

-- Delete all organizations
DELETE FROM organizations;

-- Verify cleanup
SELECT 'Organizations count:' as info, COUNT(*) as count FROM organizations
UNION ALL
SELECT 'Invitations count:', COUNT(*) FROM invitations
UNION ALL
SELECT 'Activity logs count:', COUNT(*) FROM activity_log
UNION ALL
SELECT 'Users with organization:', COUNT(*) FROM profiles WHERE organization_id IS NOT NULL;
