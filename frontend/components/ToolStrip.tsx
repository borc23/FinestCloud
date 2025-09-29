'use client'

import { useState } from 'react'
import styles from './ToolStrip.module.css'

interface ToolStripProps {
  activeTool: string
  onToolSelect: (tool: string) => void
  onStatsToggle: () => void
}

export default function ToolStrip({ activeTool, onToolSelect, onStatsToggle }: ToolStripProps) {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null)

  const tools = [
    { id: 'upload', icon: 'upload', label: 'Upload Image' },
    { id: 'select', icon: 'vector-square', label: 'Select Area' },
    { id: 'panels', icon: 'solar-panel', label: 'Generate Panels' },
    { id: 'edit', icon: 'pen-to-square', label: 'Edit Mode' },
    { id: 'analyze', icon: 'chart-line', label: 'Analysis' }
  ]

  const allTools = [
    ...tools,
    { id: 'settings', icon: 'cog', label: 'Settings' },
    { id: 'help', icon: 'question-circle', label: 'Help' }
  ]

  const getActiveToolData = (targetTool: string | null = null) => {
    const targetToolId = targetTool || activeTool
    const toolIndex = allTools.findIndex(tool => tool.id === targetToolId)
    if (toolIndex === -1) return { index: -1, section: null }

    return {
      index: toolIndex < 5 ? toolIndex : toolIndex - 5,
      section: toolIndex < 5 ? 'main' : 'bottom'
    }
  }

  const handleToolClick = (toolId: string) => {
    if (toolId === 'stats') {
      onStatsToggle()
    } else {
      onToolSelect(toolId)
    }
  }

  return (
    <div className={styles.toolStrip}>
      {/* Tools */}
      <div className={styles.toolsSection}>
        {tools.map((tool, index) => (
          <button
            key={tool.id}
            className={styles.tool}
            onClick={() => handleToolClick(tool.id)}
            onMouseEnter={() => setHoveredTool(tool.id)}
            onMouseLeave={() => setHoveredTool(null)}
            aria-label={tool.label}
          >
            <i className={`fas fa-${tool.icon}`}></i>
          </button>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className={styles.bottomSection}>
        <button
          className={styles.tool}
          onClick={() => handleToolClick('settings')}
          onMouseEnter={() => setHoveredTool('settings')}
          onMouseLeave={() => setHoveredTool(null)}
          aria-label="Settings"
        >
          <i className="fas fa-cog"></i>
        </button>

        <button
          className={styles.tool}
          onClick={() => handleToolClick('help')}
          onMouseEnter={() => setHoveredTool('help')}
          onMouseLeave={() => setHoveredTool(null)}
          aria-label="Help"
        >
          <i className="fas fa-question-circle"></i>
        </button>
      </div>

      {/* Frosted Overlay */}
      <div
        className={styles.frostedOverlay}
        data-active-tool={hoveredTool || activeTool}
        data-tool-section={getActiveToolData(hoveredTool).section}
        data-tool-index={getActiveToolData(hoveredTool).index}
        style={{ opacity: getActiveToolData(hoveredTool).index === -1 ? 0 : 1 }}
      />
    </div>
  )
}