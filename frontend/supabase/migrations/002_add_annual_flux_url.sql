-- ============================================================================
-- Add annual_flux_url to projects table
-- Version: 1.1.0
-- Description: Add column to store Google Solar API annual flux GeoTIFF URL
-- ============================================================================

-- Add annual_flux_url column to projects table
ALTER TABLE projects
ADD COLUMN annual_flux_url TEXT;

-- Add comment to document the column
COMMENT ON COLUMN projects.annual_flux_url IS 'URL to the Google Solar API annual flux GeoTIFF for this project location';
