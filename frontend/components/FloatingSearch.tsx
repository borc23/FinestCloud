'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './FloatingSearch.module.css'

declare global {
  interface Window {
    google: any
  }
}

interface FloatingSearchProps {
  map?: any
}

export default function FloatingSearch({ map }: FloatingSearchProps) {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [showLocationFallback, setShowLocationFallback] = useState(false)
  const [fallbackLocation, setFallbackLocation] = useState('')
  const [searchHistory, setSearchHistory] = useState<string[]>([])
  const [historyIndex, setHistoryIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const fallbackInputRef = useRef<HTMLInputElement>(null)
  const autocompleteService = useRef<any>(null)
  const geocoder = useRef<any>(null)

  useEffect(() => {
    if (window.google && window.google.maps) {
      autocompleteService.current = new window.google.maps.places.AutocompleteService()
      geocoder.current = new window.google.maps.Geocoder()
    }
  }, [])

  useEffect(() => {
    if (query.length > 2 && autocompleteService.current) {
      autocompleteService.current.getPlacePredictions(
        {
          input: query,
          types: ['geocode']
        },
        (predictions: any[], status: string) => {
          console.log('Places API response:', { status, predictions })
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            const newSuggestions = predictions.slice(0, 5)
            setSuggestions(newSuggestions)
            console.log('Setting suggestions:', newSuggestions)
          } else {
            setSuggestions([])
          }
        }
      )
    } else {
      setSuggestions([])
    }
  }, [query])

  const searchLocation = (address: string) => {
    if (!geocoder.current || !map) return

    geocoder.current.geocode({ address }, (results: any[], status: string) => {
      if (status === 'OK' && results[0]) {
        const location = results[0].geometry.location
        map.setCenter(location)
        map.setZoom(20)
      }
    })
  }

  const getCurrentLocation = () => {
    if (!map) return

    if (!navigator.geolocation) {
      setShowLocationFallback(true)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const currentLocation = new window.google.maps.LatLng(latitude, longitude)
        map.setCenter(currentLocation)
        map.setZoom(20)
      },
      (error) => {
        console.log('Geolocation failed, showing manual location input')
        setShowLocationFallback(true)
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000 // 5 minutes
      }
    )
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      const location = query.trim()
      searchLocation(location)
      addToHistory(location)
      setSuggestions([])
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }

  const handleSuggestionClick = (prediction: any) => {
    const address = prediction.description
    setQuery(address)
    setSuggestions([])
    setIsFocused(false)
    searchLocation(address)
    addToHistory(address)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSuggestions([])
      setIsFocused(false)
      setIsExpanded(false)
      inputRef.current?.blur()
    }
  }

  const handleExpandClick = () => {
    setIsExpanded(true)
    setTimeout(() => {
      inputRef.current?.focus()
    }, 150)
  }

  const handleCollapseClick = () => {
    setIsExpanded(false)
    setIsFocused(false)
    setSuggestions([])
    setQuery('')
  }

  const handleFallbackSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (fallbackLocation.trim()) {
      const location = fallbackLocation.trim()
      searchLocation(location)
      addToHistory(location)
      setShowLocationFallback(false)
      setFallbackLocation('')
    }
  }

  const handleFallbackCancel = () => {
    setShowLocationFallback(false)
    setFallbackLocation('')
  }

  const addToHistory = (location: string) => {
    setSearchHistory(prev => {
      // Remove if already exists to avoid duplicates
      const filtered = prev.filter(item => item !== location)
      // Add new location to the front
      const newHistory = [location, ...filtered]
      // Keep only the first 5 items
      return newHistory.slice(0, 5)
    })
    // Set history index to 1 (previous location) when new location is added
    // This way first click goes to the previous location, not current
    setHistoryIndex(1)
  }

  const handleHistoryNavigation = () => {
    if (searchHistory.length === 0) return

    // Get current location from history
    const currentLocation = searchHistory[historyIndex]

    // Search the current location
    searchLocation(currentLocation)
    setQuery(currentLocation)

    // Move to next index (circular)
    setHistoryIndex(prev => {
      const nextIndex = prev + 1
      // If we reach the end, go back to 0
      return nextIndex >= searchHistory.length ? 0 : nextIndex
    })

    // Close suggestions and unfocus
    setSuggestions([])
    setIsFocused(false)
    inputRef.current?.blur()
  }

  return (
    <div className={styles.searchContainer}>
      {!isExpanded ? (
        // Collapsed circle state
        <button
          className={styles.searchCircle}
          onClick={handleExpandClick}
          title="Search locations"
        >
          <i className="fas fa-search"></i>
        </button>
      ) : (
        // Expanded search state
        <>
          <form onSubmit={handleSubmit} className={styles.searchForm}>
            <div className={`${styles.searchWrapper} ${styles.expanded} ${isFocused ? styles.focused : ''}`}>
              <button
                type="button"
                className={styles.collapseButton}
                onClick={handleCollapseClick}
                title="Collapse search"
              >
                <i className="fas fa-times"></i>
              </button>

              <div className={styles.searchIcon}>
                <i className="fas fa-search"></i>
              </div>

              <input
                ref={inputRef}
                type="text"
                className={styles.searchInput}
                placeholder="Search location or address..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setTimeout(() => setIsFocused(false), 200)}
                onKeyDown={handleKeyDown}
                autoComplete="off"
              />

            </div>

            {suggestions.length > 0 && isFocused && (
              <div className={styles.suggestions}>
                {console.log('Rendering suggestions:', { suggestionsLength: suggestions.length, isFocused, suggestions })}
                {suggestions.map((prediction, index) => (
                  <button
                    key={prediction.place_id || index}
                    type="button"
                    className={styles.suggestion}
                    onClick={() => handleSuggestionClick(prediction)}
                  >
                    <div className={styles.suggestionIcon}>
                      <i className="fas fa-map-marker-alt"></i>
                    </div>
                    <span className={styles.suggestionText}>{prediction.description}</span>
                  </button>
                ))}
              </div>
            )}
          </form>

          {/* Quick Actions */}
          <div className={styles.quickActions}>
            <button
              className={styles.quickAction}
              title="Use Current Location"
              onClick={getCurrentLocation}
            >
              <i className="fas fa-location-arrow"></i>
            </button>

            <button
              className={styles.quickAction}
              title={searchHistory.length > 1 && historyIndex < searchHistory.length ? `Go to: ${searchHistory[historyIndex]}` : searchHistory.length === 1 ? "Only one location in history" : "No search history"}
              onClick={handleHistoryNavigation}
              disabled={searchHistory.length <= 1}
            >
              <i className="fas fa-history"></i>
            </button>
          </div>
        </>
      )}

      {/* Location Fallback Modal */}
      {showLocationFallback && (
        <div className={styles.fallbackOverlay}>
          <div className={styles.fallbackModal}>
            <h3 className={styles.fallbackTitle}>Enter Your Location</h3>
            <p className={styles.fallbackMessage}>
              We couldn't detect your current location automatically. Please enter your address, city, or location:
            </p>
            <form onSubmit={handleFallbackSubmit} className={styles.fallbackForm}>
              <input
                ref={fallbackInputRef}
                type="text"
                className={styles.fallbackInput}
                placeholder="Enter your address or city..."
                value={fallbackLocation}
                onChange={(e) => setFallbackLocation(e.target.value)}
                autoFocus
              />
              <div className={styles.fallbackButtons}>
                <button
                  type="button"
                  className={styles.fallbackCancel}
                  onClick={handleFallbackCancel}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className={styles.fallbackSubmit}
                  disabled={!fallbackLocation.trim()}
                >
                  Go to Location
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}