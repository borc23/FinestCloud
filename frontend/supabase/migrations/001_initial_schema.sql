-- ============================================================================
-- Solar Panel Design Platform - Database Schema
-- Version: 1.0.0
-- Description: Production-ready schema with optimized RLS and indexing
-- ============================================================================

-- ============================================================================
-- EXTENSIONS
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Profiles: Extended user information
-- Note: Email duplicated from auth.users for query performance and denormalization
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    default_latitude DECIMAL(10, 8) CHECK (default_latitude BETWEEN -90 AND 90),
    default_longitude DECIMAL(11, 8) CHECK (default_longitude BETWEEN -180 AND 180),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Projects: Solar panel design projects
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL CHECK (length(trim(project_name)) > 0),
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
    map_center_lat DECIMAL(10, 8) NOT NULL CHECK (map_center_lat BETWEEN -90 AND 90),
    map_center_lng DECIMAL(11, 8) NOT NULL CHECK (map_center_lng BETWEEN -180 AND 180),
    map_zoom INTEGER NOT NULL DEFAULT 18 CHECK (map_zoom BETWEEN 1 AND 22),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Roof Analysis: Individual roof segment analysis
CREATE TABLE roof_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    roof_index INTEGER NOT NULL CHECK (roof_index >= 0),
    roof_polygon JSONB NOT NULL,
    azimuth DECIMAL(6, 2) NOT NULL CHECK (azimuth BETWEEN 0 AND 360),
    pitch DECIMAL(6, 2) NOT NULL CHECK (pitch BETWEEN 0 AND 90),
    panel_count INTEGER NOT NULL DEFAULT 0 CHECK (panel_count >= 0),
    panel_wattage INTEGER NOT NULL DEFAULT 400 CHECK (panel_wattage > 0),
    estimated_output DECIMAL(12, 2) CHECK (estimated_output IS NULL OR estimated_output >= 0),
    shade_stats JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(project_id, roof_index)
);

-- Object Polygons: Obstacles and exclusion zones
CREATE TABLE object_polygons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    polygon_coords JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Panel Configurations: Panel placement configurations
CREATE TABLE panel_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roof_analysis_id UUID NOT NULL REFERENCES roof_analysis(id) ON DELETE CASCADE,
    panel_positions JSONB NOT NULL,
    module_type TEXT NOT NULL,
    module_specs JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- ============================================================================
-- INDEXES - Performance Optimization
-- ============================================================================

-- Profiles indexes
CREATE INDEX idx_profiles_email ON profiles(email);

-- Projects indexes (RLS-optimized)
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_user_status_created ON projects(user_id, status, created_at DESC);

-- Roof analysis indexes
CREATE INDEX idx_roof_analysis_project ON roof_analysis(project_id);

-- Object polygons indexes
CREATE INDEX idx_object_polygons_project ON object_polygons(project_id);

-- Panel configurations indexes
CREATE INDEX idx_panel_configurations_roof ON panel_configurations(roof_analysis_id);

-- JSONB indexes (add only if you query JSONB fields with @>, ?, ?| operators)
-- Uncomment if needed:
-- CREATE INDEX idx_roof_polygon_gin ON roof_analysis USING gin (roof_polygon);
-- CREATE INDEX idx_shade_stats_gin ON roof_analysis USING gin (shade_stats);
-- CREATE INDEX idx_panel_positions_gin ON panel_configurations USING gin (panel_positions);


-- ============================================================================
-- ROW LEVEL SECURITY (RLS) - Optimized for Performance
-- ============================================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE roof_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE object_polygons ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_configurations ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY profiles_select ON profiles 
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = id);

CREATE POLICY profiles_insert ON profiles 
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY profiles_update ON profiles 
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = id);

-- Projects policies
CREATE POLICY projects_select ON projects 
    FOR SELECT TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY projects_insert ON projects 
    FOR INSERT TO authenticated
    WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY projects_update ON projects 
    FOR UPDATE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

CREATE POLICY projects_delete ON projects 
    FOR DELETE TO authenticated
    USING ((SELECT auth.uid()) = user_id);

-- Roof analysis policies (optimized with auth.uid() wrapped)
CREATE POLICY roof_analysis_select ON roof_analysis 
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = roof_analysis.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY roof_analysis_insert ON roof_analysis 
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = roof_analysis.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY roof_analysis_update ON roof_analysis 
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = roof_analysis.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY roof_analysis_delete ON roof_analysis 
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = roof_analysis.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

-- Object polygons policies
CREATE POLICY object_polygons_select ON object_polygons 
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = object_polygons.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY object_polygons_insert ON object_polygons 
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = object_polygons.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY object_polygons_update ON object_polygons 
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = object_polygons.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY object_polygons_delete ON object_polygons 
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = object_polygons.project_id
            AND projects.user_id = (SELECT auth.uid())
        )
    );

-- Panel configurations policies
CREATE POLICY panel_configurations_select ON panel_configurations 
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM roof_analysis ra
            JOIN projects p ON p.id = ra.project_id
            WHERE ra.id = panel_configurations.roof_analysis_id
            AND p.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY panel_configurations_insert ON panel_configurations 
    FOR INSERT TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM roof_analysis ra
            JOIN projects p ON p.id = ra.project_id
            WHERE ra.id = panel_configurations.roof_analysis_id
            AND p.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY panel_configurations_update ON panel_configurations 
    FOR UPDATE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM roof_analysis ra
            JOIN projects p ON p.id = ra.project_id
            WHERE ra.id = panel_configurations.roof_analysis_id
            AND p.user_id = (SELECT auth.uid())
        )
    );

CREATE POLICY panel_configurations_delete ON panel_configurations 
    FOR DELETE TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM roof_analysis ra
            JOIN projects p ON p.id = ra.project_id
            WHERE ra.id = panel_configurations.roof_analysis_id
            AND p.user_id = (SELECT auth.uid())
        )
    );


-- ============================================================================
-- TRIGGERS & FUNCTIONS
-- ============================================================================

-- Auto-create profile on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER roof_analysis_updated_at BEFORE UPDATE ON roof_analysis
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER panel_configurations_updated_at BEFORE UPDATE ON panel_configurations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================================================
-- VIEWS - Analytics & Reporting
-- ============================================================================

-- Project statistics view
CREATE OR REPLACE VIEW project_stats AS
SELECT
    p.id,
    p.user_id,
    p.project_name,
    p.status,
    COUNT(DISTINCT ra.id) as roof_count,
    COALESCE(SUM(ra.panel_count), 0) as total_panels,
    COALESCE(SUM(ra.estimated_output), 0) as total_estimated_output,
    COUNT(DISTINCT op.id) as obstacle_count,
    p.created_at,
    p.updated_at
FROM projects p
LEFT JOIN roof_analysis ra ON ra.project_id = p.id
LEFT JOIN object_polygons op ON op.project_id = p.id
GROUP BY p.id;

-- Security: View inherits RLS from underlying tables
ALTER VIEW project_stats SET (security_invoker = true);
GRANT SELECT ON project_stats TO authenticated;


-- ============================================================================
-- TABLE COMMENTS - Documentation
-- ============================================================================

COMMENT ON TABLE profiles IS 'User profiles with map preferences';
COMMENT ON TABLE projects IS 'Solar panel design projects';
COMMENT ON TABLE roof_analysis IS 'Individual roof segment analysis and panel estimates';
COMMENT ON TABLE object_polygons IS 'Obstacles like chimneys, vents, or skylights';
COMMENT ON TABLE panel_configurations IS 'Panel placement and module specifications';

COMMENT ON COLUMN profiles.email IS 'Denormalized from auth.users for performance';
COMMENT ON COLUMN roof_analysis.azimuth IS 'Roof orientation: 0=North, 90=East, 180=South, 270=West';
COMMENT ON COLUMN roof_analysis.pitch IS 'Roof slope angle in degrees (0=flat, 90=vertical)';
COMMENT ON COLUMN roof_analysis.roof_index IS 'Sequential roof identifier within project';
COMMENT ON COLUMN roof_analysis.shade_stats IS 'Shade coverage statistics from Solar API';

COMMENT ON VIEW project_stats IS 'Aggregated project metrics for dashboards';
