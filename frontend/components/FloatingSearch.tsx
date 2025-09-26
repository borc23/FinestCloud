'use client'

import { useState, useRef, useEffect } from 'react'
import styles from './FloatingSearch.module.css'

export default function FloatingSearch() {
  const [query, setQuery] = useState('')
  const [isFocused, setIsFocused] = useState(false)
  const [suggestions, setSuggestions] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  // Mock suggestions - replace with actual Google Places API
  const mockSuggestions = [
    'San Francisco, CA, USA',
    'Los Angeles, CA, USA',
    'New York, NY, USA',
    'Seattle, WA, USA',
    'Austin, TX, USA'
  ]

  useEffect(() => {
    if (query.length > 2) {
      const filtered = mockSuggestions.filter(suggestion =>
        suggestion.toLowerCase().includes(query.toLowerCase())
      )
      setSuggestions(filtered.slice(0, 5))
    } else {
      setSuggestions([])
    }
  }, [query])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (query.trim()) {
      console.log('Searching for:', query)
      // Integrate with Google Places API
      setSuggestions([])
      setIsFocused(false)
      inputRef.current?.blur()
    }
  }

  const handleSuggestionClick = (suggestion: string) => {
    setQuery(suggestion)
    setSuggestions([])
    setIsFocused(false)
    console.log('Selected location:', suggestion)
    // Trigger map navigation
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

        {suggestions.length > 0 && (isFocused || suggestions.length > 0) && (
          <div className={styles.suggestions}>
            {suggestions.map((suggestion, index) => (
              <button
                key={index}
                type="button"
                className={styles.suggestion}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <div className={styles.suggestionIcon}>
                  <i className="fas fa-map-marker-alt"></i>
                </div>
                <span className={styles.suggestionText}>{suggestion}</span>
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