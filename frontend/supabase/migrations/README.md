# Supabase Database Migrations

This directory contains SQL migration files for the FinestCloud Solar Panel application database schema.

## Migration Files

### 001_initial_schema.sql
Initial database schema including:
- Core tables (profiles, projects, roof_analysis, object_polygons, panel_configurations)
- Row Level Security (RLS) policies
- Indexes for performance
- Triggers and functions for automation

### 002_schema_enhancements.sql
Optional enhancements for improved functionality:
- Additional indexes for performance
- Data quality constraints
- Soft delete support for projects
- Project statistics view
- Helper functions for soft deletes
- Documentation comments

## How to Apply Migrations

### Option 1: Using Supabase CLI (Recommended)

```bash
# Navigate to frontend directory
cd frontend

# Link to your Supabase project (first time only)
npx supabase link --project-ref your-project-ref

# Apply all pending migrations
npx supabase db push

# Or apply a specific migration
npx supabase db push --file supabase/migrations/002_schema_enhancements.sql
```

### Option 2: Using Supabase Dashboard

1. Go to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Copy the contents of the migration file
4. Paste and execute the SQL

### Option 3: Using SQL Directly

If you have direct database access:

```bash
# Connect to your database
psql "your-connection-string"

# Run the migration file
\i supabase/migrations/002_schema_enhancements.sql
```

## New Features in 002_schema_enhancements.sql

### 1. Soft Delete Support

Projects can now be soft-deleted (archived) instead of permanently removed:

```typescript
import { softDeleteProject, restoreProject, getDeletedProjects } from '@/lib/supabase/projects'

// Soft delete a project
await softDeleteProject(projectId)

// Restore a deleted project
await restoreProject(projectId)

// Get list of deleted projects
const deletedProjects = await getDeletedProjects(userId)
```

### 2. Project Statistics View

Get aggregated project statistics efficiently:

```typescript
import { getProjectStats } from '@/lib/supabase/projects'

const stats = await getProjectStats(userId)
// Returns: roof_count, total_panels, total_estimated_output, etc.
```

### 3. Automatic Cleanup

Permanently remove old soft-deleted projects:

```typescript
import { cleanupDeletedProjects } from '@/lib/supabase/projects'

// Delete projects that were soft-deleted more than 30 days ago
const deletedCount = await cleanupDeletedProjects(30)
```

### 4. Data Quality Constraints

The following constraints are now enforced:
- ✅ Project names cannot be empty
- ✅ Map zoom levels must be between 1-22
- ✅ Latitude must be between -90 and 90
- ✅ Longitude must be between -180 and 180
- ✅ Azimuth must be between 0 and 360 degrees
- ✅ Pitch must be between 0 and 90 degrees
- ✅ Panel counts and wattages must be positive

## Migration Safety

All migrations in this directory:
- ✅ Use `IF NOT EXISTS` / `IF EXISTS` to be idempotent (can be run multiple times safely)
- ✅ Preserve existing data
- ✅ Maintain backward compatibility
- ✅ Include proper error handling

## Rollback

If you need to rollback the 002_schema_enhancements.sql migration:

```sql
-- Remove soft delete column
ALTER TABLE projects DROP COLUMN IF EXISTS deleted_at;

-- Remove constraints
ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_project_name_not_empty;
ALTER TABLE projects DROP CONSTRAINT IF EXISTS check_valid_zoom;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_valid_latitude;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_valid_longitude;
ALTER TABLE roof_analysis DROP CONSTRAINT IF EXISTS check_valid_azimuth;
ALTER TABLE roof_analysis DROP CONSTRAINT IF EXISTS check_valid_pitch;
ALTER TABLE roof_analysis DROP CONSTRAINT IF EXISTS check_positive_panel_count;
ALTER TABLE roof_analysis DROP CONSTRAINT IF EXISTS check_positive_panel_wattage;

-- Remove functions
DROP FUNCTION IF EXISTS soft_delete_project(UUID);
DROP FUNCTION IF EXISTS restore_project(UUID);
DROP FUNCTION IF EXISTS cleanup_deleted_projects(INTEGER);

-- Remove view
DROP VIEW IF EXISTS project_stats;

-- Remove indexes
DROP INDEX IF EXISTS idx_profiles_email;
DROP INDEX IF EXISTS idx_projects_deleted_at;
DROP INDEX IF EXISTS idx_projects_status_created;
DROP INDEX IF EXISTS idx_roof_analysis_project_count;

-- Restore original RLS policies
DROP POLICY IF EXISTS "Users can view their own projects" ON projects;
CREATE POLICY "Users can view their own projects"
    ON projects FOR SELECT
    USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own projects" ON projects;
CREATE POLICY "Users can update their own projects"
    ON projects FOR UPDATE
    USING (auth.uid() = user_id);
```

## Testing Migrations Locally

Before applying to production, test migrations locally:

```bash
# Start local Supabase instance
npx supabase start

# Apply migrations
npx supabase db reset

# Run your application tests
npm test

# Stop local instance when done
npx supabase stop
```

## Support

If you encounter any issues with migrations:
1. Check the Supabase logs in the dashboard
2. Verify your database version compatibility
3. Ensure all prerequisites are met (extensions, permissions)
4. Review the migration SQL for any errors

## Migration Checklist

Before applying migrations to production:
- [ ] Tested locally
- [ ] Reviewed SQL for security issues
- [ ] Backed up production database
- [ ] Scheduled maintenance window if needed
- [ ] Prepared rollback plan
- [ ] Updated application code to use new features (if applicable)
- [ ] Verified RLS policies work correctly
- [ ] Tested with production-like data volume
