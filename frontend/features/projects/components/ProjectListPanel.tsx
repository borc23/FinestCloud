"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import {
  getProjects,
  deleteProject,
} from "@/features/projects/lib/projectsApi";
import type { Project } from "@/features/auth/types/database";
import { toast } from "sonner";
import ProjectCard from "./ProjectCard";
import styles from "./ProjectListPanel.module.css";

interface ProjectListPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadProject: (projectId: string) => void;
}

export default function ProjectListPanel({
  isOpen,
  onClose,
  onLoadProject,
}: ProjectListPanelProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && user) {
      loadProjects();
    }
  }, [isOpen, user]);

  const loadProjects = async () => {
    if (!user) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getProjects(user.id);
      setProjects(
        data.map((p) => ({
          id: p.id,
          userId: p.user_id,
          projectName: p.project_name,
          status: p.status,
          mapCenterLat: p.map_center_lat,
          mapCenterLng: p.map_center_lng,
          mapZoom: p.map_zoom,
          annualFluxUrl: p.annual_flux_url,
          createdAt: p.created_at,
          updatedAt: p.updated_at,
        })),
      );
    } catch (err: any) {
      console.error("Error loading projects:", err);
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (projectId: string) => {
    if (
      !confirm(
        "Are you sure you want to delete this project? This action cannot be undone.",
      )
    ) {
      return;
    }

    setDeletingId(projectId);

    try {
      await deleteProject(projectId);
      setProjects(projects.filter((p) => p.id !== projectId));
      toast.success("Project deleted successfully");
    } catch (err: any) {
      console.error("Error deleting project:", err);
      toast.error(
        "Failed to delete project: " + (err.message || "Unknown error"),
      );
    } finally {
      setDeletingId(null);
    }
  };

  const handleLoad = (projectId: string) => {
    onLoadProject(projectId);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>My Projects</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <div className={styles.content}>
          {loading && (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading projects...</p>
            </div>
          )}

          {error && (
            <div className={styles.error}>
              <i className="fas fa-exclamation-circle"></i>
              <p>{error}</p>
              <button onClick={loadProjects} className={styles.retryButton}>
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && projects.length === 0 && (
            <div className={styles.empty}>
              <i className="fas fa-folder-open"></i>
              <h3>No projects yet</h3>
              <p>Create your first solar panel design and save it here.</p>
            </div>
          )}

          {!loading && !error && projects.length > 0 && (
            <div className={styles.grid}>
              {projects.map((project) => (
                <ProjectCard
                  key={project.id}
                  project={project}
                  onLoad={() => handleLoad(project.id)}
                  onDelete={() => handleDelete(project.id)}
                  isDeleting={deletingId === project.id}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
