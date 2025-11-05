import { useState, useRef } from 'react'
import type { CreateProjectData } from '@/features/auth/types/database'

/**
 * Hook for managing project-related state
 */
export function useProjectState() {
  const [map, setMap] = useState<google.maps.Map | null>(null)
  const [isImageMode, setIsImageMode] = useState(false)
  const [uploadedImage, setUploadedImage] = useState<string | null>(null)

  // Project data callback refs
  const getProjectDataRef = useRef<(() => Omit<CreateProjectData, 'projectName' | 'status'>) | null>(null)
  const loadProjectRef = useRef<((projectId: string) => Promise<void>) | null>(null)

  return {
    map,
    setMap,
    isImageMode,
    setIsImageMode,
    uploadedImage,
    setUploadedImage,
    getProjectDataRef,
    loadProjectRef,
  }
}
