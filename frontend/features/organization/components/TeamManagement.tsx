'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/shared/components/ui/Icon'
import { toast } from 'sonner'
import {
  getUserOrganization,
  getOrganizationMembers,
  getInvitations,
  createInvitation,
  cancelInvitation,
  updateMemberRole,
  removeMember,
} from '../lib/organizationApi'
import type { Organization, OrganizationMember, Invitation, UserRole } from '../types/organization'
import styles from './TeamManagement.module.css'

interface TeamManagementProps {
  userId: string
  userRole: UserRole
}

export default function TeamManagement({ userId, userRole }: TeamManagementProps) {
  const [organization, setOrganization] = useState<Organization | null>(null)
  const [members, setMembers] = useState<OrganizationMember[]>([])
  const [invitations, setInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('designer')
  const [inviting, setInviting] = useState(false)

  const canManageTeam = userRole === 'owner' || userRole === 'admin'

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      const org = await getUserOrganization(userId)
      if (org) {
        setOrganization(org)
        const [membersData, invitationsData] = await Promise.all([
          getOrganizationMembers(org.id),
          getInvitations(org.id),
        ])
        setMembers(membersData)
        setInvitations(invitationsData)
      }
    } catch (err: any) {
      setError('Failed to load team data')
    } finally {
      setLoading(false)
    }
  }

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!organization) return

    setInviting(true)
    setError(null)

    try {
      const invitation = await createInvitation(organization.id, inviteEmail, inviteRole)

      // Generate invitation link
      const invitationLink = `${window.location.origin}/accept-invitation?token=${invitation.token}`

      // Copy to clipboard
      await navigator.clipboard.writeText(invitationLink)

      setInviteEmail('')
      setInviteRole('designer')
      setShowInviteForm(false)
      toast.success(`Invitation created! Link copied to clipboard.`)
      await loadData()
    } catch (err: any) {
      setError('Failed to send invitation')
      toast.error('Failed to send invitation')
    } finally {
      setInviting(false)
    }
  }

  const handleCancelInvitation = async (invitationId: string) => {
    if (!confirm('Cancel this invitation?')) return

    try {
      await cancelInvitation(invitationId)
      toast.success('Invitation cancelled')
      await loadData()
    } catch (err: any) {
      setError('Failed to cancel invitation')
      toast.error('Failed to cancel invitation')
    }
  }

  const handleRoleChange = async (memberId: string, newRole: UserRole) => {
    try {
      await updateMemberRole(memberId, newRole)
      toast.success('Role updated successfully')
      await loadData()
    } catch (err: any) {
      setError('Failed to update role')
      toast.error('Failed to update role')
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!confirm('Remove this member from the organization?')) return

    try {
      await removeMember(memberId)
      toast.success('Member removed from organization')
      await loadData()
    } catch (err: any) {
      setError('Failed to remove member')
      toast.error('Failed to remove member')
    }
  }

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.spinner}></div>
        <p>Loading team...</p>
      </div>
    )
  }

  if (!organization) {
    return (
      <div className={styles.empty}>
        <Icon name="users" />
        <h3>No Organization</h3>
        <p>You are not part of any organization yet.</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      {error && (
        <div className={styles.error}>
          <Icon name="warning" />
          <span>{error}</span>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3>Team Members</h3>
          <p>{members.length} of {organization.max_users} members</p>
        </div>
        {canManageTeam && (
          <button
            className={styles.inviteButton}
            onClick={() => setShowInviteForm(!showInviteForm)}
          >
            <Icon name="user-plus" />
            Invite Member
          </button>
        )}
      </div>

      {/* Invite Form */}
      {showInviteForm && canManageTeam && (
        <form onSubmit={handleInvite} className={styles.inviteForm}>
          <input
            type="email"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            placeholder="email@example.com"
            required
            disabled={inviting}
          />
          <select
            value={inviteRole}
            onChange={(e) => setInviteRole(e.target.value as UserRole)}
            disabled={inviting}
          >
            <option value="viewer">Viewer</option>
            <option value="designer">Designer</option>
            <option value="admin">Admin</option>
          </select>
          <button type="submit" disabled={inviting}>
            {inviting ? 'Sending...' : 'Send Invite'}
          </button>
        </form>
      )}

      {/* Members List */}
      <div className={styles.section}>
        <h4>Active Members</h4>
        <div className={styles.list}>
          {members.map((member) => (
            <div key={member.id} className={styles.memberCard}>
              <div className={styles.memberInfo}>
                <Icon name="user-circle" />
                <div>
                  <div className={styles.memberName}>
                    {member.display_name || member.email}
                  </div>
                  <div className={styles.memberEmail}>{member.email}</div>
                </div>
              </div>
              <div className={styles.memberActions}>
                {canManageTeam && member.id !== userId ? (
                  <>
                    <select
                      value={member.role}
                      onChange={(e) => handleRoleChange(member.id, e.target.value as UserRole)}
                      className={styles.roleSelect}
                    >
                      <option value="viewer">Viewer</option>
                      <option value="designer">Designer</option>
                      <option value="admin">Admin</option>
                      {member.role === 'owner' && <option value="owner">Owner</option>}
                    </select>
                    {member.role !== 'owner' && (
                      <button
                        onClick={() => handleRemoveMember(member.id)}
                        className={styles.removeButton}
                        title="Remove member"
                      >
                        <Icon name="times" />
                      </button>
                    )}
                  </>
                ) : (
                  <span className={styles.roleBadge}>{member.role}</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Pending Invitations */}
      {invitations.length > 0 && (
        <div className={styles.section}>
          <h4>Pending Invitations</h4>
          <div className={styles.list}>
            {invitations.map((invitation) => (
              <div key={invitation.id} className={styles.invitationCard}>
                <div className={styles.invitationInfo}>
                  <Icon name="envelope" />
                  <div>
                    <div className={styles.invitationEmail}>{invitation.email}</div>
                    <div className={styles.invitationStatus}>
                      {invitation.status} · expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className={styles.invitationActions}>
                  <span className={styles.roleBadge}>{invitation.role}</span>
                  {canManageTeam && invitation.status === 'pending' && (
                    <button
                      onClick={() => handleCancelInvitation(invitation.id)}
                      className={styles.cancelButton}
                      title="Cancel invitation"
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
