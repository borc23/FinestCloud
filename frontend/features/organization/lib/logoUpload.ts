import { createClient } from '@/shared/lib/supabase/client'

/**
 * Upload organization logo to Supabase Storage
 * @param file - Image file to upload
 * @param organizationId - Organization ID for namespacing
 * @returns Public URL of uploaded logo
 */
export async function uploadOrganizationLogo(
  file: File,
  organizationId: string
): Promise<string> {
  const supabase = createClient()

  // Validate file
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('Logo file size must be less than 5MB')
  }

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/svg+xml']
  if (!allowedTypes.includes(file.type)) {
    throw new Error('Logo must be PNG, JPEG, or SVG format')
  }

  // Generate unique filename with timestamp to prevent caching issues
  const fileExt = file.name.split('.').pop()
  const fileName = `${organizationId}/logo-${Date.now()}.${fileExt}`

  // Upload to Supabase Storage
  const { data, error } = await supabase.storage
    .from('organization-logos')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: true,
    })

  if (error) {
    console.error('Logo upload error:', error)
    throw new Error(`Failed to upload logo: ${error.message}`)
  }

  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('organization-logos')
    .getPublicUrl(data.path)

  return publicUrl
}

/**
 * Delete organization logo from Supabase Storage
 * @param logoUrl - Full URL of the logo to delete
 * @param organizationId - Organization ID for validation
 */
export async function deleteOrganizationLogo(
  logoUrl: string,
  organizationId: string
): Promise<void> {
  const supabase = createClient()

  // Extract file path from URL
  const urlParts = logoUrl.split('/organization-logos/')
  if (urlParts.length !== 2) {
    throw new Error('Invalid logo URL format')
  }

  const filePath = urlParts[1]

  // Verify the file belongs to this organization
  if (!filePath.startsWith(`${organizationId}/`)) {
    throw new Error('Unauthorized: Logo does not belong to this organization')
  }

  // Delete from storage
  const { error } = await supabase.storage
    .from('organization-logos')
    .remove([filePath])

  if (error) {
    console.error('Logo deletion error:', error)
    throw new Error(`Failed to delete logo: ${error.message}`)
  }
}
