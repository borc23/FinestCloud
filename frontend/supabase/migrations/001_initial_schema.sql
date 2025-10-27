-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create profiles table (extends auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    display_name TEXT,
    default_latitude DECIMAL(10, 8),
    default_longitude DECIMAL(11, 8),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_name TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'completed')),
    map_center_lat DECIMAL(10, 8) NOT NULL,
    map_center_lng DECIMAL(11, 8) NOT NULL,
    map_zoom INTEGER NOT NULL DEFAULT 18,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create roof_analysis table
CREATE TABLE roof_analysis (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    roof_index INTEGER NOT NULL,
    roof_polygon JSONB NOT NULL,
    azimuth DECIMAL(6, 2) NOT NULL,
    pitch DECIMAL(6, 2) NOT NULL,
    panel_count INTEGER NOT NULL DEFAULT 0,
    panel_wattage INTEGER NOT NULL DEFAULT 400,
    estimated_output DECIMAL(12, 2),
    shade_stats JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create object_polygons table (obstacles/exclusions)
CREATE TABLE object_polygons (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    polygon_coords JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create panel_configurations table
CREATE TABLE panel_configurations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    roof_analysis_id UUID NOT NULL REFERENCES roof_analysis(id) ON DELETE CASCADE,
    panel_positions JSONB NOT NULL,
    module_type TEXT NOT NULL,
    module_specs JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_projects_user_id ON projects(user_id);
CREATE INDEX idx_projects_created_at ON projects(created_at DESC);
CREATE INDEX idx_projects_user_created ON projects(user_id, created_at DESC);
CREATE INDEX idx_roof_analysis_project ON roof_analysis(project_id);
CREATE INDEX idx_object_polygons_project ON object_polygons(project_id);
CREATE INDEX idx_panel_configurations_roof ON panel_configurations(roof_analysis_id);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE roof_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE object_polygons ENABLE ROW LEVEL SECURITY;
ALTER TABLE panel_configurations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
    ON profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- RLS Policies for projects
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
    ON projects FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON projects FOR DELETE
    USING (auth.uid() = user_id);

-- RLS Policies for roof_analysis
CREATE POLICY "Users can view roof analysis for their projects"
    ON roof_analysis FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = roof_analysis.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert roof analysis for their projects"
    ON roof_analysis FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = roof_analysis.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update roof analysis for their projects"
    ON roof_analysis FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = roof_analysis.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete roof analysis for their projects"
    ON roof_analysis FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = roof_analysis.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- RLS Policies for object_polygons
CREATE POLICY "Users can view object polygons for their projects"
    ON object_polygons FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = object_polygons.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert object polygons for their projects"
    ON object_polygons FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = object_polygons.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update object polygons for their projects"
    ON object_polygons FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = object_polygons.project_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete object polygons for their projects"
    ON object_polygons FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM projects
            WHERE projects.id = object_polygons.project_id
            AND projects.user_id = auth.uid()
        )
    );

-- RLS Policies for panel_configurations
CREATE POLICY "Users can view panel configs for their projects"
    ON panel_configurations FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM roof_analysis
            JOIN projects ON projects.id = roof_analysis.project_id
            WHERE roof_analysis.id = panel_configurations.roof_analysis_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can insert panel configs for their projects"
    ON panel_configurations FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM roof_analysis
            JOIN projects ON projects.id = roof_analysis.project_id
            WHERE roof_analysis.id = panel_configurations.roof_analysis_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can update panel configs for their projects"
    ON panel_configurations FOR UPDATE
    USING (
        EXISTS (
            SELECT 1 FROM roof_analysis
            JOIN projects ON projects.id = roof_analysis.project_id
            WHERE roof_analysis.id = panel_configurations.roof_analysis_id
            AND projects.user_id = auth.uid()
        )
    );

CREATE POLICY "Users can delete panel configs for their projects"
    ON panel_configurations FOR DELETE
    USING (
        EXISTS (
            SELECT 1 FROM roof_analysis
            JOIN projects ON projects.id = roof_analysis.project_id
            WHERE roof_analysis.id = panel_configurations.roof_analysis_id
            AND projects.user_id = auth.uid()
        )
    );

-- Function to automatically create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, email)
    VALUES (NEW.id, NEW.email);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on user signup
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
