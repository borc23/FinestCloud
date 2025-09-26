'use client'

import { useState } from 'react'
import styles from './Sidebar.module.css'

export default function Sidebar() {
  const [activeItem, setActiveItem] = useState<string>('')

  const handleMenuClick = (action: string) => {
    setActiveItem(action)

    // Basic placeholder handlers - to be implemented with actual functionality
    switch (action) {
      case 'upload':
        console.log('Upload image clicked')
        break
      case 'select':
        console.log('Select area clicked')
        break
      case 'panels':
        console.log('Generate panels clicked')
        break
      case 'edit':
        console.log('Edit mode clicked')
        break
      case 'clear':
        console.log('Clear all clicked')
        break
    }
  }

  return (
    <div className={styles.sidebar}>
      <div className={`${styles.menu} ${styles.mainMenu}`}>
        <button
          className={`${styles.menuItem} ${activeItem === 'upload' ? styles.active : ''}`}
          onClick={() => handleMenuClick('upload')}
          aria-label="Upload image"
        >
          <i className="fas fa-upload"></i>
          <span>Upload</span>
        </button>

        <button
          className={`${styles.menuItem} ${activeItem === 'select' ? styles.active : ''}`}
          onClick={() => handleMenuClick('select')}
          aria-label="Select area"
        >
          <i className="fas fa-home"></i>
          <span>Select Area</span>
        </button>

        <button
          className={`${styles.menuItem} ${activeItem === 'panels' ? styles.active : ''}`}
          onClick={() => handleMenuClick('panels')}
          aria-label="Generate solar panels"
        >
          <i className="fas fa-solar-panel"></i>
          <span>Solar Panels</span>
        </button>

        <button
          className={`${styles.menuItem} ${activeItem === 'edit' ? styles.active : ''}`}
          onClick={() => handleMenuClick('edit')}
          aria-label="Edit image"
        >
          <i className="fas fa-pencil-alt"></i>
          <span>Edit</span>
        </button>
      </div>

      <div className={`${styles.menu} ${styles.bottomMenu}`}>
        <button
          className={`${styles.menuItem} ${activeItem === 'clear' ? styles.active : ''}`}
          onClick={() => handleMenuClick('clear')}
          aria-label="Clear all"
        >
          <i className="fas fa-eraser"></i>
          <span>Clear</span>
        </button>
      </div>
    </div>
  )
}