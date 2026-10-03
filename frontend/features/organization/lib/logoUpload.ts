import { createClient } from "@/shared/lib/supabase/client";

const BUCKET = "organization-logos";

/**
 * Upload (or replace) the organization logo in Supabase Storage
 * @returns Public URL of the logo, versioned to bust caches
 */
export async function uploadOrganizationLogo(
  file: File,
  organizationId: string,
): Promise<string> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("Logo file size must be less than 5MB");
  }
  // Raster only: SVG in a public bucket would allow stored XSS
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    throw new Error("Logo must be PNG, JPEG, or WebP format");
  }

  const storage = createClient().storage.from(BUCKET);
  // Fixed path per org, so a new upload replaces the old logo
  const { data, error } = await storage.upload(`${organizationId}/logo`, file, {
    cacheControl: "3600",
    contentType: file.type,
    upsert: true,
  });

  if (error) {
    console.error("Logo upload error:", error);
    throw new Error(`Failed to upload logo: ${error.message}`);
  }

  return `${storage.getPublicUrl(data.path).data.publicUrl}?v=${Date.now()}`;
}

/**
 * Delete organization logo from Supabase Storage
 * @param logoUrl - Full URL of the logo to delete
 * @param organizationId - Organization ID for validation
 */
export async function deleteOrganizationLogo(
  logoUrl: string,
  organizationId: string,
): Promise<void> {
  const filePath = new URL(logoUrl).pathname.split(`/${BUCKET}/`)[1];

  // Verify the file belongs to this organization
  if (!filePath?.startsWith(`${organizationId}/`)) {
    throw new Error("Unauthorized: Logo does not belong to this organization");
  }

  const { error } = await createClient()
    .storage.from(BUCKET)
    .remove([filePath]);

  if (error) {
    console.error("Logo deletion error:", error);
    throw new Error(`Failed to delete logo: ${error.message}`);
  }
}
