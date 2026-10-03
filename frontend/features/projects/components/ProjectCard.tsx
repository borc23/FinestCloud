"use client";

import type { Project } from "@/features/auth/types/database";
import { Icon } from "@/shared/components/ui/Icon";
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
  const formatDate = (date: string) =>
    new Date(date).toLocaleDateString("en-US", {
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
          <Icon name="calendar-plus" />
          <span>Created {formatDate(project.createdAt)}</span>
        </div>
        <div className={styles.metaItem}>
          <Icon name="clock" />
          <span>Updated {formatDate(project.updatedAt)}</span>
        </div>
        <div className={styles.metaItem}>
          <Icon name="map-marker-alt" />
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
          <Icon name="folder-open" />
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
              <Icon name="trash" />
              <span>Delete</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
