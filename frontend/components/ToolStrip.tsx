'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import styles from './ToolStrip.module.css'

interface ToolStripProps {
  activeTool: string
  onToolSelect: (tool: string) => void
  onStatsToggle: () => void
  showPanelsTool?: boolean
}

const allToolsDefinition = [
  { id: 'tab', icon: 'list', label: 'Tab', isFixed: true },
  { id: 'upload', icon: 'upload', label: 'Upload' },
  { id: 'select', icon: 'vector-square', label: 'Select' },
  { id: 'panels', icon: 'solar-panel', label: 'Generate' },
  { id: 'edit', icon: 'pen-to-square', label: 'Edit' }
] as const

export default function ToolStrip({ activeTool, onToolSelect, onStatsToggle, showPanelsTool = false }: ToolStripProps) {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const tools = useMemo(() =>
    allToolsDefinition.filter(tool =>
      tool.id !== 'panels' || showPanelsTool
    ),
    [showPanelsTool]
  )

  const bottomTools = useMemo(() => [
    { id: 'search', icon: 'search', label: 'Search', isFixed: true }
  ], [])

  const allTools = useMemo(() => [...tools, ...bottomTools], [tools, bottomTools])

  const getActiveToolData = (targetTool: string | null = null): { index: number; section: string | null } => {
    const targetToolId = targetTool || activeTool
    const mainToolIndex = tools.findIndex(tool => tool.id === targetToolId && !tool.isFixed)

    // Return valid index and section only for non-fixed main tools
    return mainToolIndex !== -1
      ? { index: mainToolIndex - 1, section: 'main' }
      : { index: -1, section: null }
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
    if (toolId === 'tab') {
      setIsExpanded(!isExpanded)
    } else if (toolId === 'stats') {
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
      className={`${styles.toolStrip} ${isExpanded ? styles.expanded : ''}`}
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
              aria-pressed={tool.id === 'tab' ? isExpanded : activeTool === tool.id}
            >
              <i className={`fas fa-${tool.icon}`}></i>
              {isExpanded && !tool.isFixed && (
                <span className={styles.toolLabel}>{tool.label}</span>
              )}
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
              aria-pressed={activeTool === tool.id}
            >
              <i className={`fas fa-${tool.icon}`}></i>
              {isExpanded && !tool.isFixed && (
                <span className={styles.toolLabel}>{tool.label}</span>
              )}
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
          opacity: getActiveToolData(hoveredTool).index === -1 ? 0 : 1
        }}
      />
    </div>
  )
}