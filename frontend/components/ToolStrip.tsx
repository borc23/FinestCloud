'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, LayoutGroup } from 'framer-motion'
import styles from './ToolStrip.module.css'

interface ToolStripProps {
  activeTool: string
  onToolSelect: (tool: string) => void
  onStatsToggle: () => void
  showPanelsTool?: boolean
}

const mainToolsDefinition = [
  { id: 'upload', icon: 'upload', label: 'Upload' },
  { id: 'select', icon: 'vector-square', label: 'Select' },
  { id: 'panels', icon: 'solar-panel', label: 'Generate' },
  { id: 'edit', icon: 'pen-to-square', label: 'Edit' }
] as const

// Tab button component - static, no motion
const TabButton = ({ isExpanded, onHover, onClick }: {
  isExpanded: boolean
  onHover: () => void
  onClick: () => void
}) => (
  <div
    className={styles.tabButton}
    onMouseEnter={onHover}
    onClick={onClick}
  >
    <button
      className={styles.tool}
      aria-label="Tab"
      aria-pressed={isExpanded}
    >
      <i className="fas fa-list"></i>
    </button>
  </div>
)

// Search button component - static, no motion
const SearchButton = ({ isActive, onHover, onClick }: {
  isActive: boolean
  onHover: () => void
  onClick: () => void
}) => (
  <div
    className={styles.searchButton}
    onMouseEnter={onHover}
    onClick={onClick}
  >
    <button
      className={styles.tool}
      aria-label="Search"
      aria-pressed={isActive}
    >
      <i className="fas fa-search"></i>
    </button>
  </div>
)

// Middle icon strip component - with motion
const MiddleIconStrip = ({
  tools,
  activeTool,
  isExpanded,
  hoveredTool,
  showPanelsTool,
  onHover,
  onClick
}: {
  tools: readonly typeof mainToolsDefinition[number][]
  activeTool: string
  isExpanded: boolean
  hoveredTool: string | null
  showPanelsTool: boolean
  onHover: (toolId: string | null) => void
  onClick: (toolId: string) => void
}) => {
  const getActiveToolIndex = (targetTool: string | null = null): number => {
    const targetToolId = targetTool || activeTool
    return tools.findIndex(tool => tool.id === targetToolId)
  }

  const activeIndex = getActiveToolIndex(hoveredTool)

  return (
    <div className={styles.middleStrip}>
      <LayoutGroup>
        <div className={styles.iconsContainer}>
          {tools.map((tool) => (
            <motion.div
              key={tool.id}
              layout
              transition={{
                type: 'spring',
                stiffness: 350,
                damping: 25
              }}
              className={styles.iconWrapper}
              onMouseEnter={() => onHover(tool.id)}
              onClick={() => onClick(tool.id)}
            >
              <button
                className={styles.tool}
                aria-label={tool.label}
                aria-pressed={activeTool === tool.id}
              >
                <i className={`fas fa-${tool.icon}`}></i>
                {isExpanded && (
                  <span className={styles.toolLabel}>{tool.label}</span>
                )}
              </button>
            </motion.div>
          ))}
        </div>
      </LayoutGroup>

      {/* Frosted Overlay - only for middle strip */}
      <div
        className={styles.frostedOverlay}
        data-tool-index={activeIndex}
        style={{
          opacity: activeIndex === -1 ? 0 : 1
        }}
      />
    </div>
  )
}

export default function ToolStrip({ activeTool, onToolSelect, onStatsToggle, showPanelsTool = false }: ToolStripProps) {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const tools = useMemo(() =>
    mainToolsDefinition.filter(tool =>
      tool.id !== 'panels' || showPanelsTool
    ),
    [showPanelsTool]
  )

  const handleToolHover = useCallback((toolId: string | null) => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current)
      hoverTimeoutRef.current = null
    }

    if (toolId) {
      setHoveredTool(toolId)
    } else {
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
    } else if (toolId === 'search') {
      onToolSelect(toolId)
    } else {
      onToolSelect(toolId)
    }
  }

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
      data-has-generate={showPanelsTool}
      onMouseLeave={handleContainerMouseLeave}
    >
      {/* Tab Button - Static */}
      <TabButton
        isExpanded={isExpanded}
        onHover={() => handleToolHover('tab')}
        onClick={() => handleToolClick('tab')}
      />

      {/* Middle Icon Strip - With Motion */}
      <MiddleIconStrip
        tools={tools}
        activeTool={activeTool}
        isExpanded={isExpanded}
        hoveredTool={hoveredTool}
        showPanelsTool={showPanelsTool}
        onHover={handleToolHover}
        onClick={handleToolClick}
      />

      {/* Search Button - Static */}
      <SearchButton
        isActive={activeTool === 'search'}
        onHover={() => handleToolHover('search')}
        onClick={() => handleToolClick('search')}
      />
    </div>
  )
}