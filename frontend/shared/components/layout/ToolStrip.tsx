'use client'

import { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { motion, LayoutGroup } from 'framer-motion'
import { Icon } from '@/shared/components/ui/Icon'
import styles from './ToolStrip.module.css'

declare global {
  interface Window {
    google: any
  }
}

interface ToolStripProps {
  activeTool: string
  onToolSelect: (tool: string) => void
  onStatsToggle: () => void
  showPanelsTool?: boolean
  map?: google.maps.Map | null
  isImageMode?: boolean
  onToggleMode?: () => void
  isAuthenticated?: boolean
  onOpenProfile?: () => void
}

const mainToolsDefinition = [
  { id: 'upload', icon: 'upload', label: 'Upload' },
  { id: 'select', icon: 'vector-square', label: 'Select' },
  { id: 'panels', icon: 'solar-panel', label: 'Generate' },
  { id: 'edit', icon: 'pen-to-square', label: 'Edit' }
] as const

// Profile button component - static, no motion
const ProfileButton = ({ onHover, onClick, isAuthenticated }: {
  onHover: () => void
  onClick: () => void
  isAuthenticated: boolean
}) => (
  <div
    className={styles.profileButton}
    onMouseEnter={onHover}
    onClick={onClick}
  >
    <button
      className={styles.tool}
      aria-label="User Profile"
    >
      <Icon name={isAuthenticated ? 'user-circle' : 'user'} />
    </button>
  </div>
)

// Search button component - static, no motion (inactive in image mode)
const SearchButton = ({ isActive, onHover, onClick, isImageMode }: {
  isActive: boolean
  onHover: () => void
  onClick: () => void
  isImageMode?: boolean
}) => (
  <div
    className={styles.searchButton}
    onMouseEnter={onHover}
    onClick={isImageMode ? undefined : onClick}
  >
    <button
      className={`${styles.tool} ${isImageMode ? styles.inactive : ''}`}
      aria-label="Search"
      aria-pressed={isActive}
      disabled={isImageMode}
    >
      <Icon name="search" />
    </button>
  </div>
)

// Middle icon strip component - with motion
const MiddleIconStrip = ({
  tools,
  activeTool,
  hoveredTool,
  showPanelsTool,
  onHover,
  onClick,
  isImageMode
}: {
  tools: readonly typeof mainToolsDefinition[number][]
  activeTool: string
  hoveredTool: string | null
  showPanelsTool: boolean
  onHover: (toolId: string | null) => void
  onClick: (toolId: string) => void
  isImageMode?: boolean
}) => {
  const getActiveToolIndex = (targetTool: string | null = null): number => {
    const targetToolId = targetTool || activeTool
    return tools.findIndex(tool => tool.id === targetToolId)
  }

  const activeIndex = getActiveToolIndex(hoveredTool)

  const getToolIcon = (tool: typeof mainToolsDefinition[number]) => {
    if (tool.id === 'upload' && isImageMode) {
      return 'map'
    }
    return tool.icon
  }

  const getToolLabel = (tool: typeof mainToolsDefinition[number]) => {
    if (tool.id === 'upload' && isImageMode) {
      return 'Map'
    }
    return tool.label
  }

  return (
    <div className={styles.middleStrip}>
      <LayoutGroup>
        <div className={styles.iconsContainer}>
          {tools.map((tool) => {
            const isDisabled = tool.id === 'upload' && !isImageMode
            return (
              <motion.div
                key={tool.id}
                layout
                transition={{
                  type: 'spring',
                  stiffness: 350,
                  damping: 25
                }}
                className={styles.iconWrapper}
                onMouseEnter={isDisabled ? undefined : () => onHover(tool.id)}
                onClick={isDisabled ? undefined : () => onClick(tool.id)}
              >
                <button
                  className={`${styles.tool} ${isDisabled ? styles.inactive : ''}`}
                  aria-label={getToolLabel(tool)}
                  aria-pressed={activeTool === tool.id}
                  disabled={isDisabled}
                >
                  <Icon name={getToolIcon(tool) as any} />
                </button>
              </motion.div>
            )
          })}
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

export default function ToolStrip({ activeTool, onToolSelect, onStatsToggle, showPanelsTool = false, map, isImageMode = false, onToggleMode, isAuthenticated = false, onOpenProfile }: ToolStripProps) {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null)
  const [isSearchMode, setIsSearchMode] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompletePrediction[]>([])
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const geocoder = useRef<google.maps.Geocoder | null>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  const tools = useMemo(() =>
    mainToolsDefinition.filter(tool => {
      // Filter out panels tool if not available
      if (tool.id === 'panels' && !showPanelsTool) return false
      return true
    }),
    [showPanelsTool]
  )

  useEffect(() => {
    if (window.google?.maps) {
      geocoder.current = new window.google.maps.Geocoder()
    }
  }, [])

  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        const { AutocompleteSuggestion } = (await window.google.maps.importLibrary(
          'places'
        )) as google.maps.PlacesLibrary

        const { suggestions: fetchedSuggestions } =
        await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: searchQuery,
          includedPrimaryTypes: ['geocode'],
          locationBias: {
            west: -10.0,
            south: 36.0,
            east: 40.0,
            north: 71.0,
          },
        })

        const predictions = fetchedSuggestions
        .map((suggestion) => suggestion.placePrediction)
        .slice(0, 5)

        setSuggestions(predictions as google.maps.places.AutocompletePrediction[])
      } catch (error) {
      }
    }, 100)
    return () => clearTimeout(timer)
  }, [searchQuery])

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
    if (toolId === 'profile') {
      onOpenProfile?.()
    } else if (toolId === 'search') {
      if (!geocoder.current && window.google?.maps) {
        geocoder.current = new window.google.maps.Geocoder()
      }
      setIsSearchMode(true)
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 300)
    } else if (toolId === 'upload') {
      // Upload button is disabled in map mode
      if (!isImageMode) return
      // Upload button toggles between image and map mode
      onToggleMode?.()
    } else {
      onToolSelect(toolId)
    }
  }

  const searchLocation = (address: string) => {
    if (!map) return

    if (!geocoder.current && window.google?.maps) {
      geocoder.current = new window.google.maps.Geocoder()
    }

    if (!geocoder.current) return

    geocoder.current.geocode({ address }, (results: google.maps.GeocoderResult[] | null, status: google.maps.GeocoderStatus) => {
      if (status === 'OK' && results && results[0]) {
        const location = results[0].geometry.location
        map.setCenter(location)
        map.setZoom(20)
      }
    })
  }

  const handleExitSearch = () => {
    setIsSearchMode(false)
    setSearchQuery('')
    setSuggestions([])
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value)
  }

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!searchQuery.trim()) return

    searchLocation(searchQuery.trim())
    setSuggestions([])
    searchInputRef.current?.blur()
    setTimeout(() => {
      handleExitSearch()
    }, 500)
  }

  const handleSuggestionClick = (prediction: google.maps.places.AutocompletePrediction) => {
    const description = prediction.text?.toString() || ''

    setSuggestions([])
    searchLocation(description)
    setTimeout(() => {
      handleExitSearch()
    }, 500)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleExitSearch()
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
      className={`${styles.toolStrip} ${isSearchMode ? styles.searchMode : ''}`}
      data-has-generate={showPanelsTool}
      onMouseLeave={handleContainerMouseLeave}
    >
      {isSearchMode ? (
        <>
          {/* Search Mode Layout */}
          <motion.div
            className={styles.searchIconLeft}
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <Icon name="search" />
          </motion.div>

          <motion.div
            className={styles.searchInputContainer}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3, delay: 0.15 }}
          >
            <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
              <input
                ref={searchInputRef}
                type="text"
                className={styles.searchInput}
                placeholder="Search..."
                value={searchQuery}
                onChange={handleSearchChange}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                aria-label="Search location"
                aria-autocomplete="list"
                aria-controls={suggestions.length > 0 ? 'search-suggestions' : undefined}
                aria-expanded={suggestions.length > 0}
              />
            </form>

            {suggestions.length > 0 && (
              <div
                id="search-suggestions"
                ref={suggestionsRef}
                className={styles.suggestions}
                role="listbox"
              >
                {suggestions.map((prediction) => (
                  <button
                    key={prediction.placeId}
                    type="button"
                    className={styles.suggestion}
                    onClick={() => handleSuggestionClick(prediction)}
                    role="option"
                  >
                    <Icon name="map-marker-alt" className={styles.suggestionIcon} />
                    <span className={styles.suggestionText}>{prediction.text.toString()}</span>
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div
            className={styles.closeButton}
            onClick={handleExitSearch}
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <button className={styles.tool} aria-label="Close Search">
              <Icon name="times" />
            </button>
          </motion.div>
        </>
      ) : (
        <>
          {/* Normal Mode Layout */}
          <ProfileButton
            onHover={() => handleToolHover('profile')}
            onClick={() => handleToolClick('profile')}
            isAuthenticated={isAuthenticated}
          />

          <MiddleIconStrip
            tools={tools}
            activeTool={activeTool}
            hoveredTool={hoveredTool}
            showPanelsTool={showPanelsTool}
            onHover={handleToolHover}
            onClick={handleToolClick}
            isImageMode={isImageMode}
          />

          <SearchButton
            isActive={activeTool === 'search'}
            onHover={() => handleToolHover('search')}
            onClick={() => handleToolClick('search')}
            isImageMode={isImageMode}
          />
        </>
      )}
    </div>
  )
}