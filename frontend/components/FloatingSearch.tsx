'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './FloatingSearch.module.css'

declare global {
  interface Window {
    google: typeof google
  }
}

interface FloatingSearchProps {
  map?: any
}

export default function FloatingSearch({ map }: FloatingSearchProps) {
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<any[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const geocoder = useRef<any>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    inputRef.current?.focus()

    if (window.google?.maps) {
      geocoder.current = new window.google.maps.Geocoder()
    }
  }, [])

  useEffect(() => {
    if (query.length < 3) {
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
          input: query,
          includedPrimaryTypes: ['geocode'],
          locationBias: {
            west: -10.0,
            south: 36.0,
            east: 40.0,
            north: 71.0,
          },
        })

        const predictions = fetchedSuggestions
        .map((suggestion: any) => suggestion.placePrediction)
        .slice(0, 5)

        setSuggestions(predictions)
      } catch (error) {
        console.log('Failed to fetch suggestions:', error)
      }
    }, 100)
    return () => clearTimeout(timer)
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return

    searchLocation(query.trim())
    setSuggestions([])
    inputRef.current?.blur()
  }

  const handleSuggestionClick = (prediction: any) => {
    const description = [
      prediction.mainText?.text,
      prediction.secondaryText?.text
    ]
      .filter(Boolean)
      .join(' ')
    
    setQuery(description)
    setSuggestions([])
    searchLocation(description)
  }

  const handleClear = () => {
    setQuery('')
    setSuggestions([])
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSuggestions([])
      inputRef.current?.blur()
    }
  }

  const showSuggestions = suggestions.length > 0

  return (
    <div className={styles.searchContainer}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <div className={styles.searchWrapper}>
          <i className={`fas fa-search ${styles.searchIcon}`} aria-hidden="true" />

          <input
            ref={inputRef}
            type="text"
            className={styles.searchInput}
            placeholder="Search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="off"
            aria-label="Search location"
            aria-autocomplete="list"
            aria-controls={showSuggestions ? 'search-suggestions' : undefined}
            aria-expanded={showSuggestions}
          />

          {query && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={handleClear}
              onMouseDown={(e) => e.preventDefault()}
              aria-label="Clear"
            >
              <span className={styles.clearIcon} aria-hidden="true" />
            </button>
          )}
        </div>

        {showSuggestions && (
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
                <i className={`fas fa-map-marker-alt ${styles.suggestionIcon}`} aria-hidden="true" />
                <span className={styles.suggestionText}>{prediction.text.toString()}</span>
              </button>
            ))}
          </div>
        )}
      </form>
    </div>
  )
}