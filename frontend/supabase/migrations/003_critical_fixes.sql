-- Migration: Critical Security and Performance Fixes
-- Description: P0 and P1 priority fixes for production readiness
-- Date: 2025

-- ========================================
-- P0: CRITICAL SECURITY FIXES
-- ========================================

-- Fix auth.uid() calls in RLS policies (wrap in SELECT for stability)
-- and add TO authenticated for proper role targeting

-- Profiles policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON profiles;
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);

-- Projects policies
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    TO authenticated
    USING ((SELECT auth.uid()) = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can insert their own projects" ON projects;
CREATE POLICY "Users can insert their own projects"
    ON projects FOR INSERT
    TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id AND deleted_at IS NULL);

DROP POLICY IF EXISTS "Users can delete their own projects" ON projects;
CREATE POLICY "Users can delete their own projects"
    ON projects FOR DELETE
    TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Roof analysis policies
DROP POLICY IF EXISTS "Users can view roof analysis for their projects" ON roof_analysis;
CREATE POLICY "Users can view roof analysis for their projects"
    ON roof_analysis FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = roof_analysis.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert roof analysis for their projects" ON roof_analysis;
CREATE POLICY "Users can insert roof analysis for their projects"
    ON roof_analysis FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = roof_analysis.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update roof analysis for their projects" ON roof_analysis;
CREATE POLICY "Users can update roof analysis for their projects"
    ON roof_analysis FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = roof_analysis.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can delete roof analysis for their projects" ON roof_analysis;
CREATE POLICY "Users can delete roof analysis for their projects"
    ON roof_analysis FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = roof_analysis.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

-- Object polygons policies
DROP POLICY IF EXISTS "Users can view object polygons for their projects" ON object_polygons;
CREATE POLICY "Users can view object polygons for their projects"
    ON object_polygons FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = object_polygons.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert object polygons for their projects" ON object_polygons;
CREATE POLICY "Users can insert object polygons for their projects"
    ON object_polygons FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = object_polygons.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update object polygons for their projects" ON object_polygons;
CREATE POLICY "Users can update object polygons for their projects"
    ON object_polygons FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = object_polygons.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can delete object polygons for their projects" ON object_polygons;
CREATE POLICY "Users can delete object polygons for their projects"
    ON object_polygons FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = object_polygons.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

-- Panel configurations policies
DROP POLICY IF EXISTS "Users can view panel configs for their projects" ON panel_configurations;
CREATE POLICY "Users can view panel configs for their projects"
    ON panel_configurations FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM roof_analysis
            JOIN projects ON projects.id = roof_analysis.project_id
            WHERE roof_analysis.id = panel_configurations.roof_analysis_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can insert panel configs for their projects" ON panel_configurations;
CREATE POLICY "Users can insert panel configs for their projects"
    ON panel_configurations FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM roof_analysis
            JOIN projects ON projects.id = roof_analysis.project_id
            WHERE roof_analysis.id = panel_configurations.roof_analysis_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can update panel configs for their projects" ON panel_configurations;
CREATE POLICY "Users can update panel configs for their projects"
    ON panel_configurations FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM roof_analysis
            JOIN projects ON projects.id = roof_analysis.project_id
            WHERE roof_analysis.id = panel_configurations.roof_analysis_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

DROP POLICY IF EXISTS "Users can delete panel configs for their projects" ON panel_configurations;
CREATE POLICY "Users can delete panel configs for their projects"
    ON panel_configurations FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM roof_analysis
            JOIN projects ON projects.id = roof_analysis.project_id
            WHERE roof_analysis.id = panel_configurations.roof_analysis_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

-- ========================================
-- P0: PERFORMANCE - JSONB Indexes
-- ========================================

-- GIN indexes for JSONB columns (enables efficient querying)
CREATE INDEX IF NOT EXISTS idx_roof_polygon_gin ON roof_analysis USING GIN (roof_polygon);
CREATE INDEX IF NOT EXISTS idx_shade_stats_gin ON roof_analysis USING GIN (shade_stats);
CREATE INDEX IF NOT EXISTS idx_polygon_coords_gin ON object_polygons USING GIN (polygon_coords);
CREATE INDEX IF NOT EXISTS idx_panel_positions_gin ON panel_configurations USING GIN (panel_positions);
CREATE INDEX IF NOT EXISTS idx_module_specs_gin ON panel_configurations USING GIN (module_specs);

-- ========================================
-- P1: DATA INTEGRITY
-- ========================================

-- Add UNIQUE constraint to prevent duplicate roof indices per project
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'unique_project_roof_index'
    ) THEN
        ALTER TABLE roof_analysis
            ADD CONSTRAINT unique_project_roof_index
            UNIQUE (project_id, roof_index);
    END IF;
END $$;

-- ========================================
-- P1: SOFT DELETE CASCADE FIX
-- ========================================

-- Update helper functions to properly handle related data

-- Enhanced soft delete function that marks all related data
CREATE OR REPLACE FUNCTION soft_delete_project(project_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Verify ownership and soft delete the project
    UPDATE projects
    SET deleted_at = NOW()
    WHERE id = project_id
    AND user_id = (SELECT auth.uid())
    AND deleted_at IS NULL;

    -- Note: Related data (roof_analysis, object_polygons, panel_configurations)
    -- will be hidden by the project_stats view filtering on deleted_at
    -- They are NOT deleted because CASCADE only applies to hard deletes
    -- If you want to hard delete related data, use the regular deleteProject() instead
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced restore function
CREATE OR REPLACE FUNCTION restore_project(project_id UUID)
RETURNS VOID AS $$
BEGIN
    -- Verify ownership and restore the project
    UPDATE projects
    SET deleted_at = NULL
    WHERE id = project_id
    AND user_id = (SELECT auth.uid())
    AND deleted_at IS NOT NULL;

    -- Related data automatically becomes visible again
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enhanced cleanup function that actually deletes everything
CREATE OR REPLACE FUNCTION cleanup_deleted_projects(days_old INTEGER DEFAULT 30)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    -- Hard delete projects and let CASCADE handle related data
    DELETE FROM projects
    WHERE deleted_at IS NOT NULL
    AND deleted_at < NOW() - (days_old || ' days')::INTERVAL
    AND user_id = (SELECT auth.uid());

    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- P1: MATERIALIZED VIEW FOR PERFORMANCE
-- ========================================

-- Create materialized view for better performance on large datasets
CREATE MATERIALIZED VIEW IF NOT EXISTS project_stats_mv AS
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

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_project_stats_mv_id ON project_stats_mv(id);
CREATE INDEX IF NOT EXISTS idx_project_stats_mv_user ON project_stats_mv(user_id, updated_at DESC);

-- Function to refresh materialized view
CREATE OR REPLACE FUNCTION refresh_project_stats()
RETURNS VOID AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY project_stats_mv;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-refresh materialized view on project changes
-- Note: This refreshes after any project/roof/object change
-- For high-traffic systems, consider using a scheduled job instead
CREATE OR REPLACE FUNCTION trigger_refresh_project_stats()
RETURNS TRIGGER AS $$
BEGIN
    PERFORM refresh_project_stats();
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers (comment out if you prefer manual/scheduled refresh)
DROP TRIGGER IF EXISTS refresh_stats_on_project_change ON projects;
CREATE TRIGGER refresh_stats_on_project_change
    AFTER INSERT OR UPDATE OR DELETE ON projects
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_project_stats();

DROP TRIGGER IF EXISTS refresh_stats_on_roof_change ON roof_analysis;
CREATE TRIGGER refresh_stats_on_roof_change
    AFTER INSERT OR UPDATE OR DELETE ON roof_analysis
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_project_stats();

DROP TRIGGER IF EXISTS refresh_stats_on_object_change ON object_polygons;
CREATE TRIGGER refresh_stats_on_object_change
    AFTER INSERT OR UPDATE OR DELETE ON object_polygons
    FOR EACH STATEMENT
    EXECUTE FUNCTION trigger_refresh_project_stats();

-- Grant access to materialized view
GRANT SELECT ON project_stats_mv TO authenticated;

-- ========================================
-- COMMENTS AND DOCUMENTATION
-- ========================================

COMMENT ON FUNCTION soft_delete_project IS 'Soft deletes a project by setting deleted_at. Related data remains but is hidden by views.';
COMMENT ON FUNCTION restore_project IS 'Restores a soft-deleted project by clearing deleted_at. Related data becomes visible again.';
COMMENT ON FUNCTION cleanup_deleted_projects IS 'Permanently deletes soft-deleted projects older than specified days. CASCADE handles related data.';
COMMENT ON FUNCTION refresh_project_stats IS 'Manually refresh the materialized project statistics view';
COMMENT ON MATERIALIZED VIEW project_stats_mv IS 'Materialized view of project statistics for better query performance. Auto-refreshes on data changes.';
