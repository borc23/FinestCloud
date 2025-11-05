'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { Icon } from '@/shared/components/ui/Icon'
import styles from './UserMenu.module.css'

interface UserMenuProps {
  onOpenProfile?: () => void
  onOpenLogin: () => void
  onOpenSignUp: () => void
}

export default function UserMenu({
  onOpenProfile,
  onOpenLogin,
  onOpenSignUp,
}: UserMenuProps) {
  const { user, loading, signOut } = useAuth()
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    await signOut()
    setIsOpen(false)
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.skeleton}></div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className={styles.container}>
        <button className={styles.loginButton} onClick={onOpenLogin}>
          Sign In
        </button>
        <button className={styles.signUpButton} onClick={onOpenSignUp}>
          Sign Up
        </button>
      </div>
    )
  }

  return (
    <div className={styles.container} ref={menuRef}>
      <button
        className={styles.userButton}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="User menu"
      >
        <div className={styles.avatar}>
          <Icon name="user" />
        </div>
        <span className={styles.email}>{user.email}</span>
        <Icon name="chevron-down" className={`${styles.chevron} ${isOpen ? styles.open : ''}`} />
      </button>

      {isOpen && (
        <div className={styles.dropdown}>
          <div className={styles.userInfo}>
            <div className={styles.userEmail}>{user.email}</div>
          </div>

          <div className={styles.divider}></div>

          <button
            className={styles.menuItem}
            onClick={() => {
              onOpenProfile?.()
              setIsOpen(false)
            }}
          >
            <Icon name="user-circle" />
            <span>Profile Settings</span>
          </button>

          <div className={styles.divider}></div>

          <button className={styles.menuItem} onClick={handleSignOut}>
            <Icon name="logout" />
            <span>Sign Out</span>
          </button>
        </div>
      )}
    </div>
  )
}
