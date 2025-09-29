'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import styles from './ToolStrip.module.css'

interface ToolStripProps {
  activeTool: string
  onToolSelect: (tool: string) => void
  onStatsToggle: () => void
  showPanelsTool?: boolean
}

export default function ToolStrip({ activeTool, onToolSelect, onStatsToggle, showPanelsTool = false }: ToolStripProps) {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const allToolsDefinition = [
    { id: 'upload', icon: 'upload', label: 'Upload Image' },
    { id: 'select', icon: 'vector-square', label: 'Select Area' },
    { id: 'panels', icon: 'solar-panel', label: 'Generate Panels' },
    { id: 'edit', icon: 'pen-to-square', label: 'Edit Mode' }
  ]

  const tools = allToolsDefinition.filter(tool =>
    tool.id !== 'panels' || showPanelsTool
  )

  const bottomTools = [
    { id: 'settings', icon: 'cog', label: 'Settings' },
    { id: 'help', icon: 'question-circle', label: 'Help' }
  ]

  const allTools = [...tools, ...bottomTools]

  const getActiveToolData = (targetTool: string | null = null) => {
    const targetToolId = targetTool || activeTool

    // Check if tool is in main tools section
    const mainToolIndex = tools.findIndex(tool => tool.id === targetToolId)
    if (mainToolIndex !== -1) {
      return {
        index: mainToolIndex,
        section: 'main'
      }
    }

    // Check if tool is in bottom tools section
    const bottomToolIndex = bottomTools.findIndex(tool => tool.id === targetToolId)
    if (bottomToolIndex !== -1) {
      return {
        index: bottomToolIndex,
        section: 'bottom'
      }
    }

    return { index: -1, section: null }
  }

  const handleToolHover = useCallback((toolId: string | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    if (toolId) {
      setHoveredTool(toolId)
    } else {
      // Delay clearing hover state to prevent flicker when moving between tools
      hoverTimeoutRef.current = setTimeout(() => {
        setHoveredTool(null)
      }, 100)
    }
  }, [])

  const handleContainerMouseLeave = useCallback(() => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTool(null)
    }, 150)
  }, [])

  const handleToolClick = (toolId: string) => {
    if (toolId === 'stats') {
      onStatsToggle()
    } else {
      onToolSelect(toolId)
    }
  }

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
    }
  }, [])

  return (
    <div
      ref={containerRef}
      className={styles.toolStrip}
      onMouseLeave={handleContainerMouseLeave}
    >
      {/* Tools */}
      <div className={styles.toolsSection}>
        {tools.map((tool, index) => (
          <div
            key={tool.id}
            className={styles.toolWrapper}
            onMouseEnter={() => handleToolHover(tool.id)}
          >
            <button
              className={styles.tool}
              onClick={() => handleToolClick(tool.id)}
              aria-label={tool.label}
            >
              <i className={`fas fa-${tool.icon}`}></i>
            </button>
          </div>
        ))}
      </div>

      {/* Bottom Actions */}
      <div className={styles.bottomSection}>
        <div
          className={styles.toolWrapper}
          onMouseEnter={() => handleToolHover('settings')}
        >
          <button
            className={styles.tool}
            onClick={() => handleToolClick('settings')}
            aria-label="Settings"
          >
            <i className="fas fa-cog"></i>
          </button>
        </div>

        <div
          className={styles.toolWrapper}
          onMouseEnter={() => handleToolHover('help')}
        >
          <button
            className={styles.tool}
            onClick={() => handleToolClick('help')}
            aria-label="Help"
          >
            <i className="fas fa-question-circle"></i>
          </button>
        </div>
      </div>

      {/* Frosted Overlay */}
      <div
        className={styles.frostedOverlay}
        data-active-tool={hoveredTool || activeTool}
        data-tool-section={getActiveToolData(hoveredTool).section}
        data-tool-index={getActiveToolData(hoveredTool).index}
        style={{
          opacity: getActiveToolData(hoveredTool).index === -1 ? 0 : 1,
          '--main-tools-count': tools.length
        } as React.CSSProperties}
      />
    </div>
  )
}