'use client'

import styles from './PanelSelectorButton.module.css'

interface PanelSelectorButtonProps {
  onClick: () => void
}

export default function PanelSelectorButton({ onClick }: PanelSelectorButtonProps) {
  return (
    <button className={styles.floatingBtn} onClick={onClick} title="Select Panel Type">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="3" y="3" width="8" height="8" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="3" y="13" width="8" height="8" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="13" y="3" width="8" height="8" stroke="currentColor" strokeWidth="2" fill="none"/>
        <rect x="13" y="13" width="8" height="8" stroke="currentColor" strokeWidth="2" fill="none"/>
      </svg>
    </button>
  )
}
