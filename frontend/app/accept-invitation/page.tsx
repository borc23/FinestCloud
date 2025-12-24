'use client'

import { useEffect, useState } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getInvitationByToken, acceptInvitation } from '@/features/organization/lib/organizationApi'
import { Icon } from '@/shared/components/ui/Icon'
import styles from './page.module.css'

export default function AcceptInvitationPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const token = searchParams.get('token')

  const [loading, setLoading] = useState(true)
  const [accepting, setAccepting] = useState(false)
  const [invitation, setInvitation] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (token) {
      loadInvitation()
    } else {
      setError('No invitation token provided')
      setLoading(false)
    }
  }, [token])

  const loadInvitation = async () => {
    if (!token) return

    setLoading(true)
    setError(null)

    try {
      const data = await getInvitationByToken(token)
      if (!data) {
        setError('Invitation not found')
      } else if (data.status === 'accepted') {
        setError('This invitation has already been accepted')
      } else if (data.status === 'cancelled') {
        setError('This invitation has been cancelled')
      } else if (new Date(data.expires_at) < new Date()) {
        setError('This invitation has expired')
      } else {
        setInvitation(data)
      }
    } catch (err: any) {
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async () => {
    if (!user || !token) {
      setError('You must be logged in to accept an invitation')
      return
    }

    setAccepting(true)
    setError(null)

    try {
      await acceptInvitation(token, user.id)
      setSuccess(true)
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (err: any) {
      setError(err.message || 'Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.spinner}></div>
          <p>Loading invitation...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.errorIcon}>
            <Icon name="warning" />
          </div>
          <h1>Invitation Error</h1>
          <p className={styles.errorText}>{error}</p>
          <button onClick={() => router.push('/')} className={styles.button}>
            Go to Home
          </button>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <div className={styles.successIcon}>
            <Icon name="check-circle" />
          </div>
          <h1>Welcome to the Team!</h1>
          <p>You've successfully joined the organization.</p>
          <p className={styles.redirectText}>Redirecting to home...</p>
        </div>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.icon}>
          <Icon name="envelope" />
        </div>
        <h1>You're Invited!</h1>
        <p>You've been invited to join:</p>

        <div className={styles.orgInfo}>
          <h2>{invitation?.organizations?.name || 'Organization'}</h2>
          <div className={styles.roleBadge}>
            Role: {invitation?.role}
          </div>
        </div>

        <div className={styles.details}>
          <p>Invited to: <strong>{invitation?.email}</strong></p>
          <p>Expires: <strong>{new Date(invitation?.expires_at).toLocaleDateString()}</strong></p>
        </div>

        {!user ? (
          <div className={styles.actions}>
            <p className={styles.loginPrompt}>Please sign in to accept this invitation</p>
            <button onClick={() => router.push('/')} className={styles.button}>
              Sign In
            </button>
          </div>
        ) : user.email !== invitation?.email ? (
          <div className={styles.actions}>
            <p className={styles.warningText}>
              This invitation was sent to <strong>{invitation?.email}</strong>,
              but you're logged in as <strong>{user.email}</strong>.
            </p>
            <p>Please sign in with the correct account.</p>
          </div>
        ) : (
          <div className={styles.actions}>
            <button
              onClick={handleAccept}
              className={styles.acceptButton}
              disabled={accepting}
            >
              {accepting ? 'Accepting...' : 'Accept Invitation'}
            </button>
            <button
              onClick={() => router.push('/')}
              className={styles.declineButton}
              disabled={accepting}
            >
              Decline
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
