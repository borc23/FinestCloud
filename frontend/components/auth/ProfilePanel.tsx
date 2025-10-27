'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getProfile, updateProfile, setDefaultLocation } from '@/lib/supabase/profiles'
import { getProjects, deleteProject } from '@/lib/supabase/projects'
import { createClient } from '@/lib/supabase/client'
import type { Project } from '@/types/database'
import ProjectCard from '@/components/projects/ProjectCard'
import styles from './ProfilePanel.module.css'

interface ProfilePanelProps {
  isOpen: boolean
  onClose: () => void
  onLoadProject?: (projectId: string) => void
}

type AuthView = 'login' | 'signup'
type AuthenticatedView = 'profile' | 'projects'

export default function ProfilePanel({ isOpen, onClose, onLoadProject }: ProfilePanelProps) {
  const { user, signOut } = useAuth()

  // Auth state
  const [authView, setAuthView] = useState<AuthView>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [authLoading, setAuthLoading] = useState(false)
  const [authError, setAuthError] = useState<string | null>(null)

  // Authenticated view state
  const [activeTab, setActiveTab] = useState<AuthenticatedView>('profile')

  // Profile state
  const [displayName, setDisplayName] = useState('')
  const [defaultLat, setDefaultLat] = useState('')
  const [defaultLng, setDefaultLng] = useState('')
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Projects state
  const [projects, setProjects] = useState<Project[]>([])
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && user) {
      loadProfile()
      if (activeTab === 'projects') {
        loadProjects()
      }
    }
  }, [isOpen, user, activeTab])

  const loadProfile = async () => {
    if (!user) return

    setProfileLoading(true)
    setError(null)

    try {
      const profile = await getProfile(user.id)
      if (profile) {
        setDisplayName(profile.display_name || '')
        setDefaultLat(profile.default_latitude?.toString() || '')
        setDefaultLng(profile.default_longitude?.toString() || '')
      }
    } catch (err: any) {
      console.error('Error loading profile:', err)
      setError('Failed to load profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const loadProjects = async () => {
    if (!user) return

    setProjectsLoading(true)

    try {
      const data = await getProjects(user.id)
      setProjects(data.map(p => ({
        id: p.id,
        userId: p.user_id,
        projectName: p.project_name,
        status: p.status,
        mapCenterLat: p.map_center_lat,
        mapCenterLng: p.map_center_lng,
        mapZoom: p.map_zoom,
        createdAt: p.created_at,
        updatedAt: p.updated_at,
      })))
    } catch (err: any) {
      console.error('Error loading projects:', err)
    } finally {
      setProjectsLoading(false)
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setAuthLoading(true)
    setAuthError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      // Reset form
      setEmail('')
      setPassword('')
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign in')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      setAuthError('Passwords do not match')
      return
    }

    setAuthLoading(true)
    setAuthError(null)

    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (error) throw error

      setAuthError(null)
      alert('Check your email for confirmation link!')

      // Reset form
      setEmail('')
      setPassword('')
      setConfirmPassword('')
      setAuthView('login')
    } catch (err: any) {
      setAuthError(err.message || 'Failed to sign up')
    } finally {
      setAuthLoading(false)
    }
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) return

    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      await updateProfile(user.id, {
        display_name: displayName.trim() || null,
      })

      if (defaultLat && defaultLng) {
        const lat = parseFloat(defaultLat)
        const lng = parseFloat(defaultLng)

        if (isNaN(lat) || isNaN(lng)) {
          throw new Error('Invalid coordinates')
        }

        if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
          throw new Error('Coordinates out of range')
        }

        await setDefaultLocation(user.id, lat, lng)
      }

      setSuccess(true)
      setTimeout(() => setSuccess(false), 3000)
    } catch (err: any) {
      console.error('Error saving profile:', err)
      setError(err.message || 'Failed to save profile')
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    setActiveTab('profile')
    onClose()
  }

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setDefaultLat(position.coords.latitude.toFixed(6))
          setDefaultLng(position.coords.longitude.toFixed(6))
        },
        (error) => {
          console.error('Error getting location:', error)
          setError('Failed to get current location')
        }
      )
    } else {
      setError('Geolocation is not supported by your browser')
    }
  }

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      return
    }

    setDeletingId(projectId)

    try {
      await deleteProject(projectId)
      setProjects(projects.filter(p => p.id !== projectId))
    } catch (err: any) {
      console.error('Error deleting project:', err)
      alert('Failed to delete project: ' + (err.message || 'Unknown error'))
    } finally {
      setDeletingId(null)
    }
  }

  const handleLoadProjectClick = (projectId: string) => {
    onLoadProject?.(projectId)
    onClose()
  }

  if (!isOpen) return null

  // Not authenticated - show auth forms
  if (!user) {
    return (
      <div className={styles.overlay} onClick={onClose}>
        <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
          <div className={styles.header}>
            <h2>
              <i className="fas fa-user-circle"></i>
              {authView === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
            <button className={styles.closeButton} onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>

          <form onSubmit={authView === 'login' ? handleLogin : handleSignUp} className={styles.authForm}>
            {authError && (
              <div className={styles.error}>
                <i className="fas fa-exclamation-circle"></i>
                <span>{authError}</span>
              </div>
            )}

            <div className={styles.field}>
              <label htmlFor="email">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                required
                disabled={authLoading}
                autoComplete="email"
              />
            </div>

            <div className={styles.field}>
              <label htmlFor="password">Password</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                disabled={authLoading}
                minLength={6}
                autoComplete={authView === 'login' ? 'current-password' : 'new-password'}
              />
            </div>

            {authView === 'signup' && (
              <div className={styles.field}>
                <label htmlFor="confirmPassword">Confirm Password</label>
                <input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  disabled={authLoading}
                  minLength={6}
                  autoComplete="new-password"
                />
              </div>
            )}

            <button
              type="submit"
              className={styles.submitButton}
              disabled={authLoading}
            >
              {authLoading ? (
                <>
                  <div className={styles.smallSpinner}></div>
                  {authView === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                authView === 'login' ? 'Sign In' : 'Create Account'
              )}
            </button>

            <div className={styles.switchView}>
              {authView === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView('signup')
                      setAuthError(null)
                    }}
                    className={styles.linkButton}
                  >
                    Sign Up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => {
                      setAuthView('login')
                      setAuthError(null)
                    }}
                    className={styles.linkButton}
                  >
                    Sign In
                  </button>
                </>
              )}
            </div>
          </form>
        </div>
      </div>
    )
  }

  // Authenticated - show profile/projects
  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2>
            <i className="fas fa-user-circle"></i>
            Account
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <i className="fas fa-times"></i>
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'profile' ? styles.active : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <i className="fas fa-user"></i>
            <span>Profile</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'projects' ? styles.active : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            <i className="fas fa-folder"></i>
            <span>Projects</span>
          </button>
        </div>

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          profileLoading ? (
            <div className={styles.loading}>
              <div className={styles.spinner}></div>
              <p>Loading profile...</p>
            </div>
          ) : (
            <form onSubmit={handleSaveProfile} className={styles.form}>
              {error && (
                <div className={styles.error}>
                  <i className="fas fa-exclamation-circle"></i>
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className={styles.success}>
                  <i className="fas fa-check-circle"></i>
                  <span>Profile updated successfully!</span>
                </div>
              )}

              <div className={styles.section}>
                <h3>Account Information</h3>

                <div className={styles.field}>
                  <label htmlFor="email">Email</label>
                  <input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className={styles.disabled}
                  />
                  <small>Email cannot be changed</small>
                </div>

                <div className={styles.field}>
                  <label htmlFor="displayName">Display Name</label>
                  <input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Your name (optional)"
                    maxLength={100}
                    disabled={saving}
                  />
                </div>
              </div>

              <div className={styles.section}>
                <h3>Default Map Location</h3>
                <p className={styles.description}>
                  Set your preferred starting location for the map
                </p>

                <div className={styles.coordsGroup}>
                  <div className={styles.field}>
                    <label htmlFor="latitude">Latitude</label>
                    <input
                      id="latitude"
                      type="text"
                      value={defaultLat}
                      onChange={(e) => setDefaultLat(e.target.value)}
                      placeholder="e.g., 37.7749"
                      disabled={saving}
                    />
                  </div>

                  <div className={styles.field}>
                    <label htmlFor="longitude">Longitude</label>
                    <input
                      id="longitude"
                      type="text"
                      value={defaultLng}
                      onChange={(e) => setDefaultLng(e.target.value)}
                      placeholder="e.g., -122.4194"
                      disabled={saving}
                    />
                  </div>
                </div>

                <button
                  type="button"
                  className={styles.locationButton}
                  onClick={handleUseCurrentLocation}
                  disabled={saving}
                >
                  <i className="fas fa-location-arrow"></i>
                  Use Current Location
                </button>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.signOutButton}
                  onClick={handleSignOut}
                  disabled={saving}
                >
                  <i className="fas fa-sign-out-alt"></i>
                  Sign Out
                </button>

                <div className={styles.rightActions}>
                  <button
                    type="button"
                    className={styles.cancelButton}
                    onClick={onClose}
                    disabled={saving}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className={styles.saveButton}
                    disabled={saving}
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                </div>
              </div>
            </form>
          )
        )}

        {/* Projects Tab */}
        {activeTab === 'projects' && (
          <div className={styles.projectsTab}>
            {projectsLoading ? (
              <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p>Loading projects...</p>
              </div>
            ) : projects.length === 0 ? (
              <div className={styles.empty}>
                <i className="fas fa-folder-open"></i>
                <h3>No projects yet</h3>
                <p>Create your first solar panel design and save it to see it here.</p>
              </div>
            ) : (
              <div className={styles.projectsGrid}>
                {projects.map((project) => (
                  <ProjectCard
                    key={project.id}
                    project={project}
                    onLoad={() => handleLoadProjectClick(project.id)}
                    onDelete={() => handleDeleteProject(project.id)}
                    isDeleting={deletingId === project.id}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
