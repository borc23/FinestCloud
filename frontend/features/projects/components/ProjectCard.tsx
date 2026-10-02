"use client";

import type { Project } from "@/features/auth/types/database";
import styles from "./ProjectCard.module.css";

interface ProjectCardProps {
  project: Project;
  onLoad: () => void;
  onDelete: () => void;
  isDeleting?: boolean;
}

export default function ProjectCard({
  project,
  onLoad,
  onDelete,
  isDeleting = false,
}: ProjectCardProps) {
  const createdDate = new Date(project.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  const updatedDate = new Date(project.updatedAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });

  return (
    <div className={styles.card}>
      <div className={styles.header}>
        <h3 className={styles.title}>{project.projectName}</h3>
        <span className={`${styles.badge} ${styles[project.status]}`}>
          {project.status === "draft" ? "Draft" : "Completed"}
        </span>
      </div>

      <div className={styles.meta}>
        <div className={styles.metaItem}>
          <i className="fas fa-calendar-plus"></i>
          <span>Created {createdDate}</span>
        </div>
        <div className={styles.metaItem}>
          <i className="fas fa-clock"></i>
          <span>Updated {updatedDate}</span>
        </div>
        <div className={styles.metaItem}>
          <i className="fas fa-map-marker-alt"></i>
          <span>
            {project.mapCenterLat.toFixed(4)}, {project.mapCenterLng.toFixed(4)}
          </span>
        </div>
      </div>

      <div className={styles.actions}>
        <button
          onClick={onLoad}
          className={styles.loadButton}
          disabled={isDeleting}
        >
          <i className="fas fa-folder-open"></i>
          <span>Load</span>
        </button>
        <button
          onClick={onDelete}
          className={styles.deleteButton}
          disabled={isDeleting}
        >
          {isDeleting ? (
            <>
              <div className={styles.miniSpinner}></div>
              <span>Deleting...</span>
            </>
          ) : (
            <>
              <i className="fas fa-trash"></i>
              <span>Delete</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
