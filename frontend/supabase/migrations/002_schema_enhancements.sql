-- Migration: Schema Enhancements
-- Description: Add optional improvements for better data quality, performance, and functionality
-- Date: 2025

-- ========================================
-- Performance Improvements
-- ========================================

-- Add email index for faster profile lookups
CREATE INDEX IF NOT EXISTS idx_profiles_email ON profiles(email);

-- ========================================
-- Data Quality Constraints
-- ========================================

-- Ensure project names aren't empty or just whitespace
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_project_name_not_empty'
    ) THEN
        ALTER TABLE projects
            ADD CONSTRAINT check_project_name_not_empty
            CHECK (length(trim(project_name)) > 0);
    END IF;
END $$;

-- Ensure valid zoom levels (Google Maps supports 1-22)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_valid_zoom'
    ) THEN
        ALTER TABLE projects
            ADD CONSTRAINT check_valid_zoom
            CHECK (map_zoom BETWEEN 1 AND 22);
    END IF;
END $$;

-- Ensure valid latitude coordinates (-90 to 90)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_valid_latitude'
    ) THEN
        ALTER TABLE profiles
            ADD CONSTRAINT check_valid_latitude
            CHECK (default_latitude IS NULL OR (default_latitude BETWEEN -90 AND 90));
    END IF;
END $$;

-- Ensure valid longitude coordinates (-180 to 180)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_valid_longitude'
    ) THEN
        ALTER TABLE profiles
            ADD CONSTRAINT check_valid_longitude
            CHECK (default_longitude IS NULL OR (default_longitude BETWEEN -180 AND 180));
    END IF;
END $$;

-- Ensure valid azimuth values (0 to 360 degrees)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_valid_azimuth'
    ) THEN
        ALTER TABLE roof_analysis
            ADD CONSTRAINT check_valid_azimuth
            CHECK (azimuth BETWEEN 0 AND 360);
    END IF;
END $$;

-- Ensure valid pitch values (0 to 90 degrees)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_valid_pitch'
    ) THEN
        ALTER TABLE roof_analysis
            ADD CONSTRAINT check_valid_pitch
            CHECK (pitch BETWEEN 0 AND 90);
    END IF;
END $$;

-- Ensure positive panel count
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_positive_panel_count'
    ) THEN
        ALTER TABLE roof_analysis
            ADD CONSTRAINT check_positive_panel_count
            CHECK (panel_count >= 0);
    END IF;
END $$;

-- Ensure positive panel wattage
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'check_positive_panel_wattage'
    ) THEN
        ALTER TABLE roof_analysis
            ADD CONSTRAINT check_positive_panel_wattage
            CHECK (panel_wattage > 0);
    END IF;
END $$;

-- ========================================
-- Soft Delete Support (Optional)
-- ========================================

-- Add soft delete column to projects
ALTER TABLE projects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP WITH TIME ZONE;

-- Create index for soft delete queries
CREATE INDEX IF NOT EXISTS idx_projects_deleted_at ON projects(deleted_at) WHERE deleted_at IS NOT NULL;

-- Update RLS policies to exclude soft-deleted projects
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Keep the delete policy but it will set deleted_at instead of actually deleting
-- (You'll need to update your application code to use soft deletes)

-- ========================================
-- Project Statistics View
-- ========================================

-- Create a view for easy project statistics
CREATE OR REPLACE VIEW project_stats AS
SELECT
    p.id,
    p.user_id,
    p.project_name,
    p.status,
    p.map_center_lat,
    p.map_center_lng,
    p.map_zoom,
    COUNT(DISTINCT ra.id) as roof_count,
    COALESCE(SUM(ra.panel_count), 0) as total_panels,
    COALESCE(SUM(ra.estimated_output), 0) as total_estimated_output,
    COUNT(DISTINCT op.id) as object_count,
    p.created_at,
    p.updated_at,
    p.deleted_at
FROM projects p
LEFT JOIN roof_analysis ra ON ra.project_id = p.id
LEFT JOIN object_polygons op ON op.project_id = p.id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.user_id, p.project_name, p.status, p.map_center_lat,
         p.map_center_lng, p.map_zoom, p.created_at, p.updated_at, p.deleted_at;

-- Set security invoker for the view (uses RLS of underlying tables)
ALTER VIEW project_stats SET (security_invoker = true);

-- Grant access to authenticated users
GRANT SELECT ON project_stats TO authenticated;

-- ========================================
-- Helper Functions
-- ========================================

-- Function to soft delete a project
CREATE OR REPLACE FUNCTION soft_delete_project(project_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE projects
    SET deleted_at = NOW()
    WHERE id = project_id
    AND user_id = auth.uid()
    AND deleted_at IS NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to restore a soft-deleted project
CREATE OR REPLACE FUNCTION restore_project(project_id UUID)
RETURNS VOID AS $$
BEGIN
    UPDATE projects
    SET deleted_at = NULL
    WHERE id = project_id
    AND user_id = auth.uid()
    AND deleted_at IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to permanently delete old soft-deleted projects (cleanup)
CREATE OR REPLACE FUNCTION cleanup_deleted_projects(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM projects
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - (days_old || ' days')::INTERVAL
    AND user_id = auth.uid();

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- Additional Indexes for Complex Queries
-- ========================================

-- Index for finding projects by status and date
CREATE INDEX IF NOT EXISTS idx_projects_status_created
    ON projects(user_id, status, created_at DESC)
    WHERE deleted_at IS NULL;

-- Index for roof analysis counts
CREATE INDEX IF NOT EXISTS idx_roof_analysis_project_count
    ON roof_analysis(project_id, panel_count);

-- ========================================
-- Comments for Documentation
-- ========================================

COMMENT ON TABLE profiles IS 'User profiles extending auth.users with application-specific data';
COMMENT ON TABLE projects IS 'Solar panel design projects with soft delete support';
COMMENT ON TABLE roof_analysis IS 'Analysis data for individual roof sections within projects';
COMMENT ON TABLE object_polygons IS 'Obstacle/exclusion polygons (chimneys, vents, etc.)';
COMMENT ON TABLE panel_configurations IS 'Solar panel placement configurations for roof sections';

COMMENT ON COLUMN profiles.default_latitude IS 'Users preferred map starting latitude';
COMMENT ON COLUMN profiles.default_longitude IS 'Users preferred map starting longitude';
COMMENT ON COLUMN projects.deleted_at IS 'Timestamp when project was soft-deleted (NULL = active)';
COMMENT ON COLUMN roof_analysis.azimuth IS 'Roof orientation in degrees (0-360, 0=North)';
COMMENT ON COLUMN roof_analysis.pitch IS 'Roof slope in degrees (0-90)';
COMMENT ON COLUMN roof_analysis.shade_stats IS 'JSON object containing shade coverage statistics';

COMMENT ON VIEW project_stats IS 'Aggregated statistics for projects including roof and panel counts';

COMMENT ON FUNCTION soft_delete_project IS 'Soft deletes a project by setting deleted_at timestamp';
COMMENT ON FUNCTION restore_project IS 'Restores a soft-deleted project by clearing deleted_at';
COMMENT ON FUNCTION cleanup_deleted_projects IS 'Permanently removes soft-deleted projects older than specified days';
