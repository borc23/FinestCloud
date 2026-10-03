import { createClient } from "@/shared/lib/supabase/client";
import type {
  Database,
  CreateProjectData,
  PanelConfiguration,
  Project,
  ProjectWithData,
  ShadeStats,
} from "@/features/auth/types/database";
import type { Coordinate } from "@/features/solar-panels/types/panel";

type Tables = Database["public"]["Tables"];
type Json = Tables["roof_analysis"]["Row"]["roof_polygon"];

const toProject = (p: Tables["projects"]["Row"]): Project => ({
  id: p.id,
  userId: p.user_id,
  projectName: p.project_name,
  status: p.status,
  mapCenterLat: p.map_center_lat,
  mapCenterLng: p.map_center_lng,
  mapZoom: p.map_zoom,
  annualFluxUrl: p.annual_flux_url,
  organizationId: p.organization_id,
  createdAt: p.created_at,
  updatedAt: p.updated_at,
});

export async function createProject(
  userId: string,
  projectData: CreateProjectData,
): Promise<string> {
  const supabase = createClient();

  // Get user's organization_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("organization_id")
    .eq("id", userId)
    .single();

  // 1. Create the project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      user_id: userId,
      project_name: projectData.projectName,
      status: projectData.status || "draft",
      map_center_lat: projectData.mapCenter.lat,
      map_center_lng: projectData.mapCenter.lng,
      map_zoom: projectData.mapZoom,
      annual_flux_url: projectData.annualFluxUrl || null,
      organization_id: profile?.organization_id || null,
    })
    .select("id")
    .single();

  if (projectError) throw projectError;

  const projectId = project.id;

  try {
    // 2. Create roof analyses in one batch; ids are generated here so panel
    // configurations can reference them without relying on insert order
    const roofs = projectData.roofs.map((roof) => ({
      roof,
      row: {
        id: crypto.randomUUID(),
        project_id: projectId,
        roof_index: roof.roofIndex,
        roof_polygon: roof.polygon as unknown as Json,
        azimuth: roof.azimuth,
        pitch: roof.pitch,
        panel_count: roof.panelCount,
        panel_wattage: roof.panelWattage,
        estimated_output: roof.estimatedOutput,
        shade_stats: roof.shadeStats as unknown as Json,
      },
    }));

    if (roofs.length > 0) {
      const { error } = await supabase
        .from("roof_analysis")
        .insert(roofs.map(({ row }) => row));
      if (error) throw error;
    }

    // 3. Panel configurations and object polygons (obstacles), in parallel
    const panelConfigs = roofs.flatMap(({ roof, row }) =>
      roof.panelPositions && roof.moduleType && roof.moduleSpecs
        ? [
            {
              roof_analysis_id: row.id,
              panel_positions: roof.panelPositions as unknown as Json,
              module_type: roof.moduleType,
              module_specs: roof.moduleSpecs,
            },
          ]
        : [],
    );
    const objects = (projectData.objects ?? []).map((obj) => ({
      project_id: projectId,
      polygon_coords: obj.coords as unknown as Json,
    }));

    const results = await Promise.all([
      panelConfigs.length > 0 &&
        supabase.from("panel_configurations").insert(panelConfigs),
      objects.length > 0 && supabase.from("object_polygons").insert(objects),
    ]);
    for (const result of results) {
      if (result && result.error) throw result.error;
    }

    return projectId;
  } catch (error) {
    // Rollback: delete the project (cascades to related rows)
    await supabase.from("projects").delete().eq("id", projectId);
    throw error;
  }
}

export async function getProjects(userId: string): Promise<Project[]> {
  const { data, error } = await createClient()
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data.map(toProject);
}

export async function getProject(
  projectId: string,
): Promise<ProjectWithData | null> {
  const { data: project, error } = await createClient()
    .from("projects")
    .select("*, roof_analysis(*, panel_configurations(*)), object_polygons(*)")
    .eq("id", projectId)
    .order("roof_index", { referencedTable: "roof_analysis" })
    .single();

  if (error) throw error;

  // Transform data to application format
  return {
    project: toProject(project),
    roofAnalyses: project.roof_analysis.map((roof) => ({
      id: roof.id,
      projectId: roof.project_id,
      roofIndex: roof.roof_index,
      roofPolygon: roof.roof_polygon as unknown as Coordinate[],
      azimuth: roof.azimuth,
      pitch: roof.pitch,
      panelCount: roof.panel_count,
      panelWattage: roof.panel_wattage,
      estimatedOutput: roof.estimated_output,
      shadeStats: roof.shade_stats as unknown as ShadeStats | null,
      createdAt: roof.created_at,
    })),
    objectPolygons: project.object_polygons.map((obj) => ({
      id: obj.id,
      projectId: obj.project_id,
      polygonCoords: obj.polygon_coords as unknown as Coordinate[],
      createdAt: obj.created_at,
    })),
    panelConfigurations: project.roof_analysis.flatMap((roof) =>
      roof.panel_configurations.map((config) => ({
        id: config.id,
        roofAnalysisId: config.roof_analysis_id,
        panelPositions:
          config.panel_positions as unknown as PanelConfiguration["panelPositions"],
        moduleType: config.module_type,
        moduleSpecs:
          config.module_specs as unknown as PanelConfiguration["moduleSpecs"],
        createdAt: config.created_at,
      })),
    ),
  };
}

export async function deleteProject(projectId: string): Promise<void> {
  // Cascade delete is handled by the database
  const { error } = await createClient()
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) throw error;
}
