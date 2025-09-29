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

  const getOverlayPosition = (targetTool: string | null = null) => {
    const targetToolId = targetTool || activeTool
    const toolIndex = allTools.findIndex(tool => tool.id === targetToolId)
    if (toolIndex === -1) return { transform: 'translateX(-50%) translateY(-100%)', opacity: 0 }

    const toolSize = 52 // Tool button size
    const toolGap = 16 // Gap between tools (var(--spacing-base))
    const containerPadding = 24 // var(--spacing-lg)
    const bottomSectionGap = 24 // Additional gap for bottom section (var(--spacing-xl))
    const bottomSectionBorderPadding = 24 // var(--spacing-lg) for border padding

    let yOffset = containerPadding // Start from container padding

    if (toolIndex < 5) {
      // Main tools section
      yOffset += toolIndex * (toolSize + toolGap)
    } else {
      // Bottom section tools
      const mainToolsHeight = 5 * (toolSize + toolGap) - toolGap // Remove last gap
      const bottomSectionOffset = bottomSectionGap + bottomSectionBorderPadding
      const bottomToolIndex = toolIndex - 5
      yOffset += mainToolsHeight + bottomSectionOffset + (bottomToolIndex * (toolSize + toolGap))
    }

    return {
      transform: `translateX(-50%) translateY(${yOffset}px)`,
      opacity: 1
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
        style={getOverlayPosition(hoveredTool)}
      />
    </div>
  )
}