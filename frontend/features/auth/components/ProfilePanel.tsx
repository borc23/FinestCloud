'use client'

import { useAuth } from '@/features/auth/hooks/useAuth'
import { getProfile, setDefaultLocation, updateProfile, setShowTutorial } from '@/features/auth/lib/profilesApi'
import type { Project } from '@/features/auth/types/database'
import ProjectCard from '@/features/projects/components/ProjectCard'
import { deleteProject, getProjects } from '@/features/projects/lib/projectsApi'
import { Icon } from '@/shared/components/ui/Icon'
import { createClient } from '@/shared/lib/supabase/client'
import { useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useTutorial } from '@/contexts/TutorialContext'
import styles from './ProfilePanel.module.css'

declare global {
  interface Window {
    google: typeof google
  }
}

interface ProfilePanelProps {
  isOpen: boolean
  onClose: () => void
  onLoadProject?: (projectId: string) => void
}

type AuthView = 'login' | 'signup'
type AuthenticatedView = 'profile' | 'projects'

export default function ProfilePanel({ isOpen, onClose, onLoadProject }: ProfilePanelProps) {
  const { user, signOut } = useAuth()
  const { startTutorial } = useTutorial()

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
  const [showTutorialEnabled, setShowTutorialEnabled] = useState(false)
  const [locationSearch, setLocationSearch] = useState('')
  const [locationSuggestions, setLocationSuggestions] = useState<google.maps.places.PlacePrediction[]>([])
  const [suggestionPosition, setSuggestionPosition] = useState({ top: 0, left: 0, width: 0 })
  const [profileLoading, setProfileLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Refs
  const locationInputRef = useRef<HTMLInputElement>(null)
  const skipSuggestionsRef = useRef(false)

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
        const lat = profile.default_latitude
        const lng = profile.default_longitude
        setDefaultLat(lat?.toString() || '')
        setDefaultLng(lng?.toString() || '')
        setShowTutorialEnabled(profile.show_tutorial)

        // If we have coordinates, reverse geocode to get location name
        if (lat && lng && window.google?.maps) {
          reverseGeocodeLocation(lat, lng)
        }
      }
    } catch (err: any) {
      console.error('Error loading profile:', err)
      setError('Failed to load profile')
    } finally {
      setProfileLoading(false)
    }
  }

  const reverseGeocodeLocation = async (lat: number, lng: number) => {
    try {
      const geocoder = new window.google.maps.Geocoder()
      geocoder.geocode(
        { location: { lat, lng } },
        (
          results: google.maps.GeocoderResult[] | null, 
          status: google.maps.GeocoderStatus
        ) => {
          if (status === 'OK' && results && results[0]) {
            skipSuggestionsRef.current = true
            setLocationSearch(results[0].formatted_address)
          }
        }
      )
    } catch (err) {
      console.error('Error reverse geocoding:', err)
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
        annualFluxUrl: p.annual_flux_url,
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
      toast.success('Check your email for confirmation link!')

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

  const handleTutorialToggle = async (enabled: boolean) => {
    if (!user) return

    try {
      await setShowTutorial(user.id, enabled)
      setShowTutorialEnabled(enabled)

      // If enabling, start the tutorial
      if (enabled) {
        toast.success('Tutorial enabled! Starting tutorial...')
        onClose()
        setTimeout(() => {
          startTutorial()
        }, 500)
      } else {
        toast.success('Tutorial disabled')
      }
    } catch (err: any) {
      console.error('Error updating tutorial preference:', err)
      setError('Failed to update tutorial preference')
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
      setTimeout(() => {
        setSuccess(false)
        onClose()
      }, 1000)
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
          const lat = position.coords.latitude
          const lng = position.coords.longitude
          setDefaultLat(lat.toFixed(6))
          setDefaultLng(lng.toFixed(6))

          if (window.google?.maps) {
            reverseGeocodeLocation(lat, lng)
          }
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

  useEffect(() => {
    const updatePosition = () => {
      if (locationInputRef.current && locationSuggestions.length > 0) {
        const rect = locationInputRef.current.getBoundingClientRect()
        const dropdownHeight = 240
        const viewportHeight = window.innerHeight
        const spaceBelow = viewportHeight - rect.bottom
        const spaceAbove = rect.top

        const shouldFlipUp = spaceBelow < dropdownHeight + 16 && spaceAbove > spaceBelow

        const position = {
          top: shouldFlipUp ? rect.top - dropdownHeight - 8 : rect.bottom + 8,
          left: rect.left,
          width: rect.width
        }
        setSuggestionPosition(position)
      }
    }

    updatePosition()

    // Update position on scroll and resize
    const scrollContainer = document.querySelector(`.${styles.form}`)
    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updatePosition)
      window.addEventListener('resize', updatePosition)
      return () => {
        scrollContainer.removeEventListener('scroll', updatePosition)
        window.removeEventListener('resize', updatePosition)
      }
    }
  }, [locationSuggestions])

  useEffect(() => {
    if (skipSuggestionsRef.current) {
      skipSuggestionsRef.current = false
      return
    }

    if (locationSearch.length < 3) {
      setLocationSuggestions([])
      return
    }

    const timer = setTimeout(async () => {
      try {
        if (!window.google?.maps) return

        const { AutocompleteSuggestion } = (await window.google.maps.importLibrary(
          'places'
        )) as google.maps.PlacesLibrary

        const { suggestions: fetchedSuggestions } =
          await AutocompleteSuggestion.fetchAutocompleteSuggestions({
            input: locationSearch,
            includedPrimaryTypes: ['geocode'],
            locationBias: {
              west: -180.0,
              south: -90.0,
              east: 180.0,
              north: 90.0,
            },
          })

        const predictions = fetchedSuggestions
          .map(suggestion => suggestion.placePrediction)
          .filter((pred): pred is google.maps.places.PlacePrediction => pred !== null)
          .slice(0, 5)

        setLocationSuggestions(predictions)
      } catch (error) {
        console.error('Failed to fetch location suggestions:', error)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [locationSearch])

  const handleLocationSelect = async (prediction: google.maps.places.PlacePrediction) => {
    const description = prediction.text?.toString() || ''
    setLocationSuggestions([])

    // Geocode the selected location
    if (window.google?.maps) {
      try {
        const geocoder = new window.google.maps.Geocoder()
        geocoder.geocode(
          { address: description },
          (
            results: google.maps.GeocoderResult[] | null, 
            status: google.maps.GeocoderStatus
          ) => {
            if (status === 'OK' && results && results[0]) {
              const location = results[0].geometry.location
              setDefaultLat(location.lat().toFixed(6))
              setDefaultLng(location.lng().toFixed(6))
              skipSuggestionsRef.current = true
              setLocationSearch(description)
            } else {
              setError('Failed to find coordinates for this location')
              skipSuggestionsRef.current = true
              setLocationSearch(description)
            }
          }
        )
      } catch (err) {
        console.error('Error geocoding location:', err)
        setError('Failed to geocode location')
        skipSuggestionsRef.current = true
        setLocationSearch(description)
      }
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
      toast.success('Project deleted successfully')
    } catch (err: any) {
      console.error('Error deleting project:', err)
      toast.error('Failed to delete project: ' + (err.message || 'Unknown error'))
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
              <Icon name="user-circle" />
              {authView === 'login' ? 'Sign In' : 'Create Account'}
            </h2>
            <button className={styles.closeButton} onClick={onClose}>
              <Icon name="times" />
            </button>
          </div>

          <form onSubmit={authView === 'login' ? handleLogin : handleSignUp} className={styles.authForm}>
            {authError && (
              <div className={styles.error}>
                <Icon name="warning" />
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
            <Icon name="user-circle" />
            Account
          </h2>
          <button className={styles.closeButton} onClick={onClose}>
            <Icon name="times" />
          </button>
        </div>

        {/* Tabs */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${activeTab === 'profile' ? styles.active : ''}`}
            onClick={() => setActiveTab('profile')}
          >
            <Icon name="user" />
            <span>Profile</span>
          </button>
          <button
            className={`${styles.tab} ${activeTab === 'projects' ? styles.active : ''}`}
            onClick={() => setActiveTab('projects')}
          >
            <Icon name="folder" />
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
                  <Icon name="warning" />
                  <span>{error}</span>
                </div>
              )}

              {success && (
                <div className={styles.success}>
                  <Icon name="check-circle" />
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

                <div className={styles.field}>
                  <label htmlFor="location">Location</label>
                  <div className={styles.locationInputWrapper}>
                    <input
                      ref={locationInputRef}
                      id="location"
                      type="text"
                      value={locationSearch}
                      onChange={(e) => setLocationSearch(e.target.value)}
                      placeholder="Search for a location..."
                      disabled={saving}
                      autoComplete="off"
                    />
                  </div>
                  {defaultLat && defaultLng && (
                    <small>Coordinates: {defaultLat}, {defaultLng}</small>
                  )}
                </div>

                <button
                  type="button"
                  className={styles.locationButton}
                  onClick={handleUseCurrentLocation}
                  disabled={saving}
                >
                  <Icon name="location-arrow" />
                  Use Current Location
                </button>
              </div>

              <div className={styles.section}>
                <h3>Tutorial</h3>
                <p className={styles.description}>
                  Show interactive tutorial when using the application
                </p>

                <div className={styles.field}>
                  <label className={styles.checkboxLabel}>
                    <input
                      type="checkbox"
                      checked={false}
                      onChange={(e) => handleTutorialToggle(e.target.checked)}
                      disabled={true}
                    />
                    <span>Enable tutorial tooltips</span>
                  </label>
                  <small>Tutorial feature is currently disabled.</small>
                </div>
              </div>

              <div className={styles.actions}>
                <button
                  type="button"
                  className={styles.signOutButton}
                  onClick={handleSignOut}
                  disabled={saving}
                >
                  <Icon name="logout" />
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
                <Icon name="folder-open" />
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

      {/* Location Suggestions Dropdown - Rendered at root level with fixed positioning */}
      {locationSuggestions.length > 0 && (
        <div
          className={styles.locationSuggestions}
          style={{
            top: `${suggestionPosition.top}px`,
            left: `${suggestionPosition.left}px`,
            width: `${suggestionPosition.width}px`
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {locationSuggestions.map((prediction) => (
            <button
              key={prediction.placeId}
              type="button"
              className={styles.locationSuggestion}
              onClick={() => handleLocationSelect(prediction)}
            >
              <Icon name="map-marker-alt" />
              <span>{prediction.text.toString()}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
