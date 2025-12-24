-- Step 1: Check current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename IN ('organizations', 'profiles', 'invitations')
ORDER BY tablename, policyname;

-- Step 2: Disable RLS temporarily to see if that's the issue
ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;

-- Step 3: Re-enable and create fresh policies
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

-- Step 4: Drop ALL policies (use CASCADE to be sure)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'organizations') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON organizations CASCADE';
    END LOOP;
END $$;

-- Step 5: Create INSERT policy with explicit grant
CREATE POLICY organizations_insert ON organizations
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

-- Step 6: Create SELECT policy
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

-- Step 7: Create UPDATE policy
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

-- Step 8: Fix profiles UPDATE policy
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN (SELECT policyname FROM pg_policies WHERE tablename = 'profiles' AND cmd = 'UPDATE') LOOP
        EXECUTE 'DROP POLICY IF EXISTS ' || quote_ident(r.policyname) || ' ON profiles CASCADE';
    END LOOP;
END $$;

CREATE POLICY profiles_update ON profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- Step 9: Verify the policies were created
SELECT 'Organizations policies:' as info;
SELECT policyname, cmd, permissive, with_check::text
FROM pg_policies
WHERE tablename = 'organizations';

SELECT 'Profiles UPDATE policy:' as info;
SELECT policyname, cmd, permissive, with_check::text
FROM pg_policies
WHERE tablename = 'profiles' AND cmd = 'UPDATE';
