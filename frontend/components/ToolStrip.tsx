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
    { id: 'tab', icon: 'list', label: 'Tab', isFixed: true },
    { id: 'upload', icon: 'upload', label: 'Upload Image' },
    { id: 'select', icon: 'vector-square', label: 'Select Area' },
    { id: 'panels', icon: 'solar-panel', label: 'Generate Panels' },
    { id: 'edit', icon: 'pen-to-square', label: 'Edit Mode' }
  ]

  const tools = allToolsDefinition.filter(tool =>
    tool.id !== 'panels' || showPanelsTool
  )

  const bottomTools = [
    { id: 'search', icon: 'search', label: 'Search', isFixed: true }
  ]

  const allTools = [...tools, ...bottomTools]

  const getActiveToolData = (targetTool: string | null = null) => {
    const targetToolId = targetTool || activeTool

    // Skip fixed tools (first and last)
    if (targetToolId === 'tab' || targetToolId === 'search') {
      return { index: -1, section: null }
    }

    // Check if tool is in main tools section (excluding first tab icon)
    const mainToolIndex = tools.findIndex(tool => tool.id === targetToolId && !tool.isFixed)
    if (mainToolIndex !== -1) {
      // Subtract 1 to account for the first fixed icon
      return {
        index: mainToolIndex - 1,
        section: 'main'
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
        {bottomTools.map((tool) => (
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