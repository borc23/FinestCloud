import { createClient } from "../../../shared/lib/supabase/client";
import type {
  Database,
  CreateProjectData,
  ProjectWithData,
} from "@/features/auth/types/database";
import type { Coordinate } from "@/features/solar-panels/types/panel";

type Project = Database["public"]["Tables"]["projects"]["Row"];
type ObjectPolygonInsert =
  Database["public"]["Tables"]["object_polygons"]["Insert"];

export async function createProject(
  userId: string,
  projectData: CreateProjectData,
): Promise<string> {
  const supabase = createClient() as any as any;

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
    .select()
    .single();

  if (projectError) throw projectError;
  if (!project) throw new Error("Failed to create project");

  const projectId = project.id;

  try {
    // 2. Create roof analyses and panel configurations
    for (const roof of projectData.roofs) {
      const { data: roofAnalysis, error: roofError } = await supabase
        .from("roof_analysis")
        .insert({
          project_id: projectId,
          roof_index: roof.roofIndex,
          roof_polygon: roof.polygon as any,
          azimuth: roof.azimuth,
          pitch: roof.pitch,
          panel_count: roof.panelCount,
          panel_wattage: roof.panelWattage,
          estimated_output: roof.estimatedOutput,
          shade_stats: roof.shadeStats as any,
        })
        .select()
        .single();

      if (roofError) throw roofError;

      // Create panel configuration if provided
      if (roof.panelPositions && roof.moduleType && roof.moduleSpecs) {
        const { error: panelConfigError } = await supabase
          .from("panel_configurations")
          .insert({
            roof_analysis_id: roofAnalysis.id,
            panel_positions: roof.panelPositions as any,
            module_type: roof.moduleType,
            module_specs: roof.moduleSpecs as any,
          });

        if (panelConfigError) throw panelConfigError;
      }
    }

    // 3. Create object polygons (obstacles)
    if (projectData.objects && projectData.objects.length > 0) {
      const objectInserts: ObjectPolygonInsert[] = projectData.objects.map(
        (obj) => ({
          project_id: projectId,
          polygon_coords: obj.coords as any,
        }),
      );

      const { error: objectsError } = await supabase
        .from("object_polygons")
        .insert(objectInserts);

      if (objectsError) throw objectsError;
    }

    return projectId;
  } catch (error) {
    // Rollback: delete the project if any related data fails
    await supabase.from("projects").delete().eq("id", projectId);
    throw error;
  }
}

export async function getProjects(userId: string): Promise<Project[]> {
  const supabase = createClient() as any;

  const { data, error } = await supabase
    .from("projects")
    .select("*")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getProject(
  projectId: string,
): Promise<ProjectWithData | null> {
  const supabase = createClient() as any;

  // Fetch project
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (projectError) throw projectError;
  if (!project) return null;

  // Fetch roof analyses
  const { data: roofAnalyses, error: roofError } = await supabase
    .from("roof_analysis")
    .select("*")
    .eq("project_id", projectId)
    .order("roof_index");

  if (roofError) throw roofError;

  // Fetch panel configurations for all roofs
  const roofIds = (roofAnalyses || []).map((r: any) => r.id);
  const { data: panelConfigs, error: panelConfigError } = await supabase
    .from("panel_configurations")
    .select("*")
    .in("roof_analysis_id", roofIds);

  if (panelConfigError) throw panelConfigError;

  // Fetch object polygons
  const { data: objectPolygons, error: objectError } = await supabase
    .from("object_polygons")
    .select("*")
    .eq("project_id", projectId);

  if (objectError) throw objectError;

  // Transform data to application format
  return {
    project: {
      id: project.id,
      userId: project.user_id,
      projectName: project.project_name,
      status: project.status,
      mapCenterLat: project.map_center_lat,
      mapCenterLng: project.map_center_lng,
      mapZoom: project.map_zoom,
      annualFluxUrl: project.annual_flux_url,
      organizationId: project.organization_id,
      createdAt: project.created_at,
      updatedAt: project.updated_at,
    },
    roofAnalyses: (roofAnalyses || []).map((roof: any) => ({
      id: roof.id,
      projectId: roof.project_id,
      roofIndex: roof.roof_index,
      roofPolygon: roof.roof_polygon as Coordinate[],
      azimuth: roof.azimuth,
      pitch: roof.pitch,
      panelCount: roof.panel_count,
      panelWattage: roof.panel_wattage,
      estimatedOutput: roof.estimated_output,
      shadeStats: roof.shade_stats as any,
      createdAt: roof.created_at,
    })),
    objectPolygons: (objectPolygons || []).map((obj: any) => ({
      id: obj.id,
      projectId: obj.project_id,
      polygonCoords: obj.polygon_coords as Coordinate[],
      createdAt: obj.created_at,
    })),
    panelConfigurations: (panelConfigs || []).map((config: any) => ({
      id: config.id,
      roofAnalysisId: config.roof_analysis_id,
      panelPositions: config.panel_positions as Coordinate[][],
      moduleType: config.module_type,
      moduleSpecs: config.module_specs as any,
      createdAt: config.created_at,
    })),
  };
}

export async function deleteProject(projectId: string): Promise<void> {
  const supabase = createClient() as any;

  // Cascade delete is handled by the database
  const { error } = await supabase
    .from("projects")
    .delete()
    .eq("id", projectId);

  if (error) throw error;
}
