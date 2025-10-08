'use client'

import { useEffect, useState, useRef } from 'react'
import styles from './TrashZone.module.css'

interface TrashZoneProps {
  isActive: boolean
  onDelete: () => void
}

export default function TrashZone({ isActive, onDelete }: TrashZoneProps) {
  const [isHovering, setIsHovering] = useState(false)
  const trashZoneRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isActive) {
      setIsHovering(false)
      return
    }

    const checkIfCursorOverTrash = (clientX: number, clientY: number) => {
      if (!trashZoneRef.current) return false

      const rect = trashZoneRef.current.getBoundingClientRect()
      const expandedPadding = 50 // Expand hit area by 80px on all sides

      return (
        clientX >= rect.left - expandedPadding &&
        clientX <= rect.right + expandedPadding &&
        clientY >= rect.top - expandedPadding &&
        clientY <= rect.bottom + expandedPadding
      )
    }

    const handleMouseMove = (e: MouseEvent) => {
      const isOver = checkIfCursorOverTrash(e.clientX, e.clientY)
      setIsHovering(isOver)
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const touch = e.touches[0]
        const isOver = checkIfCursorOverTrash(touch.clientX, touch.clientY)
        setIsHovering(isOver)
      }
    }

    const handleMouseUp = (e: MouseEvent) => {
      if (checkIfCursorOverTrash(e.clientX, e.clientY)) {
        onDelete()
      }
      setIsHovering(false)
    }

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length > 0) {
        const touch = e.changedTouches[0]
        if (checkIfCursorOverTrash(touch.clientX, touch.clientY)) {
          onDelete()
        }
      }
      setIsHovering(false)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('touchmove', handleTouchMove, { passive: true })
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [isActive, onDelete])

  if (!isActive) return null

  return (
    <div
      ref={trashZoneRef}
      className={`${styles.trashZone} ${isHovering ? styles.active : ''}`}
    >
      <div className={styles.trashIcon}>
        <i className="fas fa-trash-alt"></i>
      </div>
      <span className={styles.trashText}>
        {isHovering ? 'Release to delete' : 'Drag here to delete'}
      </span>
    </div>
  )
}
