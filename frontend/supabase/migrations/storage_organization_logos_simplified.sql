-- =====================================================
-- Organization Logo Storage Setup (Simplified)
-- =====================================================
-- Run this in Supabase Dashboard > Storage section first:
-- 1. Create a new bucket called 'organization-logos'
-- 2. Make it public
-- 3. Set file size limit to 5MB
-- 4. Then run this SQL in SQL Editor
-- =====================================================

-- Note: You must create the bucket via Supabase Dashboard first
-- because direct INSERT into storage.buckets requires superuser permissions

-- =====================================================
-- Storage Policies
-- =====================================================

-- Drop existing policies if they exist
DO $$
BEGIN
  DROP POLICY IF EXISTS "Public Access to Organization Logos" ON storage.objects;
  DROP POLICY IF EXISTS "Organization members can upload logos" ON storage.objects;
  DROP POLICY IF EXISTS "Organization members can update logos" ON storage.objects;
  DROP POLICY IF EXISTS "Organization members can delete logos" ON storage.objects;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Policy 1: Allow anyone to view organization logos (public access)
CREATE POLICY "Public Access to Organization Logos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'organization-logos');

-- Policy 2: Allow authenticated users to upload logos for their organization
CREATE POLICY "Organization members can upload logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT o.id::text
    FROM organizations o
    INNER JOIN profiles p ON p.organization_id = o.id
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'admin')
  )
);

-- Policy 3: Allow organization members to update their logos
CREATE POLICY "Organization members can update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT o.id::text
    FROM organizations o
    INNER JOIN profiles p ON p.organization_id = o.id
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'admin')
  )
)
WITH CHECK (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT o.id::text
    FROM organizations o
    INNER JOIN profiles p ON p.organization_id = o.id
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'admin')
  )
);

-- Policy 4: Allow organization members to delete their logos
CREATE POLICY "Organization members can delete logos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'organization-logos'
  AND (storage.foldername(name))[1] IN (
    SELECT o.id::text
    FROM organizations o
    INNER JOIN profiles p ON p.organization_id = o.id
    WHERE p.id = auth.uid()
    AND p.role IN ('owner', 'admin')
  )
);
