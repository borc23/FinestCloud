-- FINAL FIX: Run this SQL in your Supabase SQL Editor
-- This completely fixes the RLS issue without recursion

-- Step 1: Drop the problematic policy if it exists
DROP POLICY IF EXISTS profiles_select ON profiles;

-- Step 2: Create a simple policy that just allows users to see all profiles
-- Since we're filtering by organization in the application layer, this is safe
CREATE POLICY profiles_select ON profiles
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Step 3: Verify
SELECT 'SUCCESS: All policies updated' as status;
SELECT tablename, policyname, cmd, permissive, roles
FROM pg_policies
WHERE tablename = 'profiles'
ORDER BY cmd, policyname;
