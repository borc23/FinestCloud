'use client'

import { useState } from 'react'
import styles from './Navbar.module.css'

export default function Navbar() {
  const [searchQuery, setSearchQuery] = useState('')

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Searching for:', searchQuery)
    // Placeholder for search functionality
  }

  const handleModuleSelect = () => {
    console.log('Module selector clicked')
    // Placeholder for module selection
  }

  const handleShortcuts = () => {
    console.log('Keyboard shortcuts clicked')
    // Placeholder for shortcuts modal
  }

  return (
    <nav className={styles.navbar}>
      <div className={styles.navLeft}>
        <div className={styles.searchWrapper}>
          <i className={`fas fa-search ${styles.searchIcon}`}></i>
          <form onSubmit={handleSearch}>
            <input
              type="text"
              className={styles.searchInput}
              placeholder="Search address or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoComplete="off"
            />
          </form>
          <div className={styles.searchResults}></div>
        </div>

        <div className={styles.moduleSelector}>
          <button
            className={styles.moduleButton}
            onClick={handleModuleSelect}
            aria-label="Select solar module"
          >
            <i className="fas fa-solar-panel"></i>
            <span>Select Module</span>
            <span><i className="fas fa-chevron-down"></i></span>
          </button>
        </div>
      </div>

      <div className={styles.navRight}>
        <button
          className={styles.actionButton}
          onClick={handleShortcuts}
          title="Keyboard Shortcuts (Press H)"
          aria-label="Show keyboard shortcuts"
        >
          <i className="fas fa-keyboard"></i>
          <span>Shortcuts</span>
        </button>
      </div>
    </nav>
  )
}