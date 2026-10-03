"use client";

import { useState, useRef, useEffect } from "react";
import { motion, LayoutGroup } from "framer-motion";
import { Icon } from "@/shared/components/ui/Icon";
import styles from "./ToolStrip.module.css";

interface ToolStripProps {
  activeTool: string;
  onToolSelect: (tool: string) => void;
  showPanelsTool?: boolean;
  map?: google.maps.Map | null;
  isAuthenticated?: boolean;
  onOpenProfile?: () => void;
}

const mainToolsDefinition = [
  { id: "select", icon: "vector-square", label: "Select" },
  { id: "panels", icon: "solar-panel", label: "Generate" },
  { id: "edit", icon: "pen-to-square", label: "Edit" },
] as const;

const Tooltip = ({ children }: { children: React.ReactNode }) => (
  <motion.div
    className={styles.tooltip}
    initial={{ opacity: 0, y: 5, x: "-50%" }}
    animate={{ opacity: 1, y: 0, x: "-50%" }}
    transition={{ duration: 0.2 }}
  >
    {children}
  </motion.div>
);

export default function ToolStrip({
  activeTool,
  onToolSelect,
  showPanelsTool = false,
  map,
  isAuthenticated = false,
  onOpenProfile,
}: ToolStripProps) {
  const [hoveredTool, setHoveredTool] = useState<string | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<
    google.maps.places.PlacePrediction[]
  >([]);
  const [showTooltipFor, setShowTooltipFor] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const tooltipTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  const tools = showPanelsTool
    ? mainToolsDefinition
    : mainToolsDefinition.filter((tool) => tool.id !== "panels");
  // The frosted highlight follows the hovered tool, else the active one
  const highlightIndex = tools.findIndex(
    (tool) => tool.id === (hoveredTool || activeTool),
  );

  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const { AutocompleteSuggestion } = (await google.maps.importLibrary(
          "places",
        )) as google.maps.PlacesLibrary;

        const { suggestions: fetchedSuggestions } =
          await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: searchQuery,
            includedPrimaryTypes: ["geocode"],
            locationBias: {
              west: -10.0,
              south: 36.0,
              east: 40.0,
              north: 71.0,
            },
          });

        const predictions = fetchedSuggestions
          .map((suggestion) => suggestion.placePrediction)
          .filter(
            (pred): pred is google.maps.places.PlacePrediction => pred !== null,
          )
          .slice(0, 5);

        setSuggestions(predictions);
      } catch {
        // Maps API not loaded or request failed: no suggestions
      }
    }, 100);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const clearTimeouts = () => {
    if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
    if (tooltipTimeoutRef.current) clearTimeout(tooltipTimeoutRef.current);
  };

  useEffect(() => clearTimeouts, []);

  const clearHoverAfter = (delay: number) => {
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredTool(null);
      setShowTooltipFor(null);
    }, delay);
  };

  const handleToolHover = (toolId: string) => {
    clearTimeouts();
    setHoveredTool(toolId);
    // Show tooltip after a short delay (iOS-style)
    tooltipTimeoutRef.current = setTimeout(
      () => setShowTooltipFor(toolId),
      600,
    );
  };

  const handleContainerMouseLeave = () => {
    clearTimeouts();
    clearHoverAfter(150);
  };

  const openSearch = () => {
    setIsSearchMode(true);
    setTimeout(() => searchInputRef.current?.focus(), 300);
  };

  const searchLocation = (address: string) => {
    if (!map) return;
    geocoderRef.current ??= new google.maps.Geocoder();
    geocoderRef.current.geocode({ address }, (results, status) => {
      if (status === "OK" && results?.[0]) {
        map.setCenter(results[0].geometry.location);
        map.setZoom(20);
      }
    });
  };

  const handleExitSearch = () => {
    setIsSearchMode(false);
    setSearchQuery("");
    setSuggestions([]);
  };

  const searchAndExit = (address: string) => {
    searchLocation(address);
    setSuggestions([]);
    setTimeout(handleExitSearch, 500);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    searchInputRef.current?.blur();
    searchAndExit(searchQuery.trim());
  };

  return (
    <div
      className={`${styles.toolStrip} ${isSearchMode ? styles.searchMode : ""}`}
      onMouseLeave={handleContainerMouseLeave}
    >
      {isSearchMode ? (
        <>
          {/* Search Mode Layout */}
          <motion.div
            className={styles.searchIconLeft}
            initial={{ x: 0, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
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
                id="search-input"
                type="text"
                className={styles.searchInput}
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Escape" && handleExitSearch()}
                autoComplete="off"
                aria-label="Search location"
                aria-autocomplete="list"
                aria-controls={
                  suggestions.length > 0 ? "search-suggestions" : undefined
                }
                aria-expanded={suggestions.length > 0}
              />
            </form>

            {suggestions.length > 0 && (
              <div
                id="search-suggestions"
                className={styles.suggestions}
                role="listbox"
              >
                {suggestions.map((prediction) => (
                  <button
                    key={prediction.placeId}
                    type="button"
                    className={styles.suggestion}
                    onClick={() => searchAndExit(prediction.text.toString())}
                    role="option"
                  >
                    <Icon
                      name="map-marker-alt"
                      className={styles.suggestionIcon}
                    />
                    <span className={styles.suggestionText}>
                      {prediction.text.toString()}
                    </span>
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
            transition={{ duration: 0.3, ease: "easeInOut" }}
          >
            <button className={styles.tool} aria-label="Close Search">
              <Icon name="times" />
            </button>
          </motion.div>
        </>
      ) : (
        <>
          {/* Normal Mode Layout */}
          <div
            className={styles.profileButton}
            onMouseEnter={() => handleToolHover("profile")}
            onClick={onOpenProfile}
          >
            <button className={styles.tool} aria-label="User Profile">
              <Icon name={isAuthenticated ? "user-circle" : "user"} />
            </button>
            {showTooltipFor === "profile" && (
              <Tooltip>{isAuthenticated ? "Profile" : "Sign In"}</Tooltip>
            )}
          </div>

          <div className={styles.middleStrip}>
            <LayoutGroup>
              <div className={styles.iconsContainer}>
                {tools.map((tool) => (
                  <motion.div
                    key={tool.id}
                    layout
                    transition={{ type: "spring", stiffness: 350, damping: 25 }}
                    className={styles.iconWrapper}
                    onMouseEnter={() => handleToolHover(tool.id)}
                    onClick={() => onToolSelect(tool.id)}
                  >
                    <button
                      className={styles.tool}
                      aria-label={tool.label}
                      aria-pressed={activeTool === tool.id}
                      data-tool={tool.id}
                    >
                      <Icon name={tool.icon} />
                    </button>
                    {showTooltipFor === tool.id && (
                      <Tooltip>{tool.label}</Tooltip>
                    )}
                  </motion.div>
                ))}
              </div>
            </LayoutGroup>

            {/* Frosted Overlay - only for middle strip */}
            <div
              className={styles.frostedOverlay}
              style={
                {
                  "--tool-count": tools.length,
                  "--tool-index": Math.max(highlightIndex, 0),
                  opacity: highlightIndex === -1 ? 0 : 1,
                } as React.CSSProperties
              }
            />
          </div>

          <div
            className={styles.searchButton}
            onMouseEnter={() => handleToolHover("search")}
            onClick={openSearch}
          >
            <button
              id="search-button"
              className={styles.tool}
              aria-label="Search"
              aria-pressed={false}
            >
              <Icon name="search" />
            </button>
            {showTooltipFor === "search" && <Tooltip>Search Location</Tooltip>}
          </div>
        </>
      )}
    </div>
  );
}
