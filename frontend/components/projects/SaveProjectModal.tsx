'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createProject } from '@/lib/supabase/projects'
import type { CreateProjectData } from '@/types/database'
import styles from './ProjectModal.module.css'

interface SaveProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSave: (projectId: string) => void
  projectData: Omit<CreateProjectData, 'projectName' | 'status'>
}

export default function SaveProjectModal({
  isOpen,
  onClose,
  onSave,
  projectData,
}: SaveProjectModalProps) {
  const { user } = useAuth()
  const [projectName, setProjectName] = useState('')
  const [status, setStatus] = useState<'draft' | 'completed'>('draft')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      setError('You must be logged in to save projects')
      return
    }

    if (!projectName.trim()) {
      setError('Please enter a project name')
      return
    }

    if (projectData.roofs.length === 0) {
      setError('No roof data to save. Please add at least one roof.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const fullProjectData: CreateProjectData = {
        ...projectData,
        projectName: projectName.trim(),
        status,
      }

      const projectId = await createProject(user.id, fullProjectData)
      onSave(projectId)
      setProjectName('')
      onClose()
    } catch (err: any) {
      console.error('Error saving project:', err)
      setError(err.message || 'Failed to save project')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>Save Project</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          {error && <div className={styles.error}>{error}</div>}

          <div className={styles.projectSummary}>
            <div className={styles.summaryItem}>
              <i className="fas fa-home"></i>
              <span>{projectData.roofs.length} roof{projectData.roofs.length !== 1 ? 's' : ''}</span>
            </div>
            <div className={styles.summaryItem}>
              <i className="fas fa-solar-panel"></i>
              <span>
                {projectData.roofs.reduce((sum, roof) => sum + roof.panelCount, 0)} panels
              </span>
            </div>
            {projectData.objects && projectData.objects.length > 0 && (
              <div className={styles.summaryItem}>
                <i className="fas fa-circle-exclamation"></i>
                <span>{projectData.objects.length} obstacle{projectData.objects.length !== 1 ? 's' : ''}</span>
              </div>
            )}
          </div>

          <div className={styles.field}>
            <label htmlFor="projectName">Project Name</label>
            <input
              id="projectName"
              type="text"
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder="e.g., Smith Residence Solar Design"
              required
              disabled={loading}
              maxLength={100}
            />
          </div>

          <div className={styles.field}>
            <label htmlFor="status">Status</label>
            <select
              id="status"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'draft' | 'completed')}
              disabled={loading}
            >
              <option value="draft">Draft</option>
              <option value="completed">Completed</option>
            </select>
          </div>

          <div className={styles.actions}>
            <button
              type="button"
              className={styles.cancelButton}
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className={styles.saveButton}
              disabled={loading}
            >
              {loading ? 'Saving...' : 'Save Project'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
