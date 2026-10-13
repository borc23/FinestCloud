-- Restored from eb27596 (deleted by mistake in 7628b61): the column exists in
-- production, the app reads it, and 20261002000000_lock_down_org_rls grants on it.

-- Add show_tutorial column to profiles table
-- This column controls whether the user wants to see tutorial tooltips
-- Default is TRUE for new users

ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS show_tutorial BOOLEAN DEFAULT TRUE NOT NULL;

-- Update existing users to have show_tutorial enabled by default
UPDATE profiles
SET show_tutorial = TRUE
WHERE show_tutorial IS NULL;

-- Add comment to explain the column
COMMENT ON COLUMN profiles.show_tutorial IS 'Flag to control tutorial tooltips visibility. TRUE = show tutorials, FALSE = hide tutorials';
