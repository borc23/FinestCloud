'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import styles from './ImageUploadModal.module.css'

interface ImageUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onImageUpload: (imageUrl: string) => void
}

export default function ImageUploadModal({ isOpen, onClose, onImageUpload }: ImageUploadModalProps) {
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }, [])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }, [])

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file')
      return
    }

    setUploading(true)

    try {
      // Create a local URL for the image
      const imageUrl = URL.createObjectURL(file)
      onImageUpload(imageUrl)
      onClose()
      toast.success('Image uploaded successfully')
    } catch (error) {
      console.error('Error uploading image:', error)
      toast.error('Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  const handleButtonClick = () => {
    fileInputRef.current?.click()
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className={styles.backdrop}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleBackdropClick}
        >
          <motion.div
            className={styles.modal}
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          >
            <div className={styles.header}>
              <h2 className={styles.title}>Upload Image</h2>
              <button
                className={styles.closeButton}
                onClick={onClose}
                aria-label="Close"
              >
                <i className="fas fa-times"></i>
              </button>
            </div>

            <div
              className={`${styles.dropzone} ${dragActive ? styles.dragActive : ''}`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
              onClick={handleButtonClick}
            >
              <input
                ref={fileInputRef}
                type="file"
                className={styles.fileInput}
                accept="image/*"
                onChange={handleChange}
              />

              {uploading ? (
                <div className={styles.uploadingState}>
                  <div className={styles.spinner}></div>
                  <p>Uploading...</p>
                </div>
              ) : (
                <>
                  <i className={`fas fa-cloud-upload-alt ${styles.uploadIcon}`}></i>
                  <p className={styles.dropzoneText}>
                    Drag and drop an image here, or click to select
                  </p>
                  <p className={styles.dropzoneHint}>
                    Supports: JPG, PNG, GIF, WebP
                  </p>
                </>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
