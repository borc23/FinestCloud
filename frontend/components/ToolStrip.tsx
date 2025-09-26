'use client'

import { useState } from 'react'
import styles from './ToolStrip.module.css'

interface ToolStripProps {
  activeTool: string
  onToolSelect: (tool: string) => void
  onStatsToggle: () => void
}

export default function ToolStrip({ activeTool, onToolSelect, onStatsToggle }: ToolStripProps) {
  const [tooltip, setTooltip] = useState<string | null>(null)

  const tools = [
    { id: 'upload', icon: 'upload', label: 'Upload Image' },
    { id: 'select', icon: 'vector-square', label: 'Select Area' },
    { id: 'panels', icon: 'solar-panel', label: 'Generate Panels' },
    { id: 'edit', icon: 'pen-to-square', label: 'Edit Mode' },
    { id: 'analyze', icon: 'chart-line', label: 'Analysis' }
  ]

  const handleToolClick = (toolId: string) => {
    onToolSelect(toolId)
    setTooltip(null)
  }

  return (
    <div className={styles.toolStrip}>

      {/* Tools */}
      <div className={styles.toolsSection}>
        {tools.map((tool) => (
          <button
            key={tool.id}
            className={`${styles.tool} ${activeTool === tool.id ? styles.active : ''}`}
            onClick={() => handleToolClick(tool.id)}
            onMouseEnter={() => setTooltip(tool.label)}
            onMouseLeave={() => setTooltip(null)}
            aria-label={tool.label}
          >
            <i className={`fas fa-${tool.icon}`}></i>
            {tooltip === tool.label && (
              <div className={styles.tooltip}>
                {tool.label}
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className={styles.bottomSection}>
        <button
          className={styles.tool}
          onClick={onStatsToggle}
          onMouseEnter={() => setTooltip('Stats')}
          onMouseLeave={() => setTooltip(null)}
          aria-label="Toggle Stats"
        >
          <i className="fas fa-chart-bar"></i>
          {tooltip === 'Stats' && (
            <div className={styles.tooltip}>
              Stats
            </div>
          )}
        </button>

        <button
          className={styles.tool}
          onMouseEnter={() => setTooltip('Settings')}
          onMouseLeave={() => setTooltip(null)}
          aria-label="Settings"
        >
          <i className="fas fa-cog"></i>
          {tooltip === 'Settings' && (
            <div className={styles.tooltip}>
              Settings
            </div>
          )}
        </button>

        <button
          className={styles.tool}
          onMouseEnter={() => setTooltip('Help')}
          onMouseLeave={() => setTooltip(null)}
          aria-label="Help"
        >
          <i className="fas fa-question-circle"></i>
          {tooltip === 'Help' && (
            <div className={styles.tooltip}>
              Help
            </div>
          )}
        </button>
      </div>
    </div>
  )
}