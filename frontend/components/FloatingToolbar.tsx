'use client'

import { useState } from 'react'
import styles from './FloatingToolbar.module.css'

interface FloatingToolbarProps {
  onToolSelect: (tool: string) => void
  activeTool: string
}

export default function FloatingToolbar({ onToolSelect, activeTool }: FloatingToolbarProps) {
  const [isExpanded, setIsExpanded] = useState(false)

  const tools = [
    { id: 'upload', icon: 'fa-cloud-upload-alt', label: 'Upload', color: '#6366f1' },
    { id: 'select', icon: 'fa-vector-square', label: 'Select Area', color: '#8b5cf6' },
    { id: 'panels', icon: 'fa-solar-panel', label: 'Solar Panels', color: '#06b6d4' },
    { id: 'edit', icon: 'fa-pen-to-square', label: 'Edit', color: '#10b981' },
    { id: 'analyze', icon: 'fa-chart-line', label: 'Analyze', color: '#f59e0b' },
  ]

  const handleToolClick = (toolId: string) => {
    onToolSelect(toolId)
    if (window.innerWidth <= 768) {
      setIsExpanded(false)
    }
  }

  return (
    <div className={styles.toolbar}>
      {/* Main Toolbar */}
      <div className={`${styles.toolbarContainer} ${isExpanded ? styles.expanded : ''}`}>
        <div className={styles.toolbarContent}>
          {/* Logo/Brand */}
          <div className={styles.brand}>
            <div className={styles.brandIcon}>
              <i className="fas fa-sun"></i>
            </div>
            <span className={styles.brandText}>Solar</span>
          </div>

          {/* Tool Buttons */}
          <div className={styles.toolsSection}>
            {tools.map((tool) => (
              <button
                key={tool.id}
                className={`${styles.toolButton} ${activeTool === tool.id ? styles.active : ''}`}
                onClick={() => handleToolClick(tool.id)}
                style={{ '--tool-color': tool.color } as React.CSSProperties}
                title={tool.label}
              >
                <div className={styles.toolIcon}>
                  <i className={`fas ${tool.icon}`}></i>
                </div>
                <span className={styles.toolLabel}>{tool.label}</span>
                <div className={styles.activeIndicator}></div>
              </button>
            ))}
          </div>

          {/* Actions */}
          <div className={styles.actionsSection}>
            <button className={styles.actionButton} title="Settings">
              <i className="fas fa-cog"></i>
            </button>
            <button className={styles.actionButton} title="Help">
              <i className="fas fa-question-circle"></i>
            </button>
          </div>
        </div>

        {/* Mobile Toggle */}
        <button
          className={styles.mobileToggle}
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <i className={`fas ${isExpanded ? 'fa-times' : 'fa-bars'}`}></i>
        </button>
      </div>

      {/* Search Bar - Separate floating element */}
      <div className={styles.searchContainer}>
        <div className={styles.searchWrapper}>
          <i className="fas fa-search"></i>
          <input
            type="text"
            placeholder="Search location..."
            className={styles.searchInput}
          />
        </div>
      </div>
    </div>
  )
}