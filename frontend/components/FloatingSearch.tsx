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
  const [suggestions, setSuggestions] = useState<any[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
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
          types: ['address', 'establishment', 'geocode']
        },
        (predictions: any[], status: string) => {
          if (status === window.google.maps.places.PlacesServiceStatus.OK && predictions) {
            setSuggestions(predictions.slice(0, 5))
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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      searchLocation(query.trim())
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
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setSuggestions([])
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }

  return (
    <div className={styles.searchContainer}>
      <form onSubmit={handleSubmit} className={styles.searchForm}>
        <div className={`${styles.searchWrapper} ${isFocused ? styles.focused : ''}`}>
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

          {query && (
            <button
              type="button"
              className={styles.clearButton}
              onClick={() => {
                setQuery('')
                setSuggestions([])
                inputRef.current?.focus()
              }}
            >
              <i className="fas fa-times"></i>
            </button>
          )}
        </div>

        {suggestions.length > 0 && isFocused && (
          <div className={styles.suggestions}>
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
          onClick={() => console.log('Get current location')}
        >
          <i className="fas fa-location-arrow"></i>
        </button>

        <button
          className={styles.quickAction}
          title="Recent Searches"
          onClick={() => console.log('Show recent searches')}
        >
          <i className="fas fa-history"></i>
        </button>
      </div>
    </div>
  )
}