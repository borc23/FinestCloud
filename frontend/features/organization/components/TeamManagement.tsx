'use client'

import { useState, useEffect } from 'react'
import { Icon } from '@/shared/components/ui/Icon'
import { toast } from 'sonner'
import {
  getUserOrganization,
  getOrganizationMembers,
  getInvitations,
  getMyInvitations,
  createInvitation,
  cancelInvitation,
  updateMemberRole,
  removeMember,
  acceptInvitation,
  createOrganization,
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
  const [myInvitations, setMyInvitations] = useState<Invitation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Invite form
  const [showInviteForm, setShowInviteForm] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<UserRole>('designer')
  const [inviting, setInviting] = useState(false)

  // Create organization form
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [orgName, setOrgName] = useState('')
  const [creating, setCreating] = useState(false)

  const canManageTeam = userRole === 'owner' || userRole === 'admin'

  useEffect(() => {
    loadData()
  }, [userId])

  const loadData = async () => {
    setLoading(true)
    setError(null)

    try {
      // Always load incoming invitations for the current user
      const myInvitationsData = await getMyInvitations()
      setMyInvitations(myInvitationsData)

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
      console.error('Error loading team data:', err)
      setError(`Failed to load team data: ${err.message}`)
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
      await createInvitation(organization.id, inviteEmail, inviteRole)

      setInviteEmail('')
      setInviteRole('designer')
      setShowInviteForm(false)
      toast.success(`Invitation sent! The user will see it when they open their profile.`)
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

  const handleAcceptInvitation = async (token: string) => {
    try {
      await acceptInvitation(token, userId)
      toast.success('Invitation accepted! You have joined the organization.')
      await loadData()
      // Reload the page to update the organization context
      window.location.reload()
    } catch (err: any) {
      setError('Failed to accept invitation')
      toast.error('Failed to accept invitation')
    }
  }

  const handleDeclineInvitation = async (invitationId: string) => {
    if (!confirm('Decline this invitation?')) return

    try {
      await cancelInvitation(invitationId)
      toast.success('Invitation declined')
      await loadData()
    } catch (err: any) {
      setError('Failed to decline invitation')
      toast.error('Failed to decline invitation')
    }
  }

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!orgName.trim()) return

    setCreating(true)
    setError(null)

    try {
      await createOrganization(userId, orgName)
      toast.success('Organization created successfully!')
      setOrgName('')
      setShowCreateForm(false)
      // Reload the page to update the organization context
      window.location.reload()
    } catch (err: any) {
      console.error('Error creating organization:', err)
      setError(`Failed to create organization: ${err.message}`)
      toast.error(`Failed to create organization: ${err.message}`)
    } finally {
      setCreating(false)
    }
  }

  const handleLeaveOrganization = async () => {
    if (!confirm('Are you sure you want to leave this organization? You will need to be re-invited to join again.')) return

    try {
      await removeMember(userId)
      toast.success('You have left the organization')
      // Reload the page to update the organization context
      window.location.reload()
    } catch (err: any) {
      setError('Failed to leave organization')
      toast.error('Failed to leave organization')
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
      <div className={styles.container}>
        {error && (
          <div className={styles.error}>
            <Icon name="warning" />
            <span>{error}</span>
          </div>
        )}

        {/* Incoming Invitations - Show even without organization */}
        {myInvitations.length > 0 && (
          <div className={styles.incomingSection}>
            <h3>Incoming Invitations</h3>
            <p className={styles.incomingSectionSubtitle}>
              You have been invited to join {myInvitations.length === 1 ? 'an organization' : 'organizations'}
            </p>
            <div className={styles.list}>
              {myInvitations.map((invitation: any) => (
                <div key={invitation.id} className={styles.incomingInvitationCard}>
                  <div className={styles.invitationInfo}>
                    <Icon name="building" />
                    <div>
                      <div className={styles.invitationOrgName}>
                        {invitation.organizations?.name || 'Organization'}
                      </div>
                      <div className={styles.invitationDetails}>
                        As {invitation.role} · Expires {new Date(invitation.expires_at).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  <div className={styles.incomingActions}>
                    <button
                      onClick={() => handleAcceptInvitation(invitation.token)}
                      className={styles.acceptButton}
                    >
                      <Icon name="check-circle" />
                      Accept
                    </button>
                    <button
                      onClick={() => handleDeclineInvitation(invitation.id)}
                      className={styles.declineButton}
                    >
                      <Icon name="times" />
                      Decline
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Organization - Create one */}
        <div className={styles.empty}>
          <Icon name="building" />
          <h3>No Organization</h3>
          <p>Create an organization to start collaborating with your team.</p>

          {!showCreateForm ? (
            <button
              className={styles.createOrgButton}
              onClick={() => setShowCreateForm(true)}
            >
              <Icon name="plus" />
              Create Organization
            </button>
          ) : (
            <form onSubmit={handleCreateOrganization} className={styles.createOrgForm}>
              <input
                type="text"
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                placeholder="Organization name"
                required
                disabled={creating}
                autoFocus
              />
              <div className={styles.formActions}>
                <button type="submit" disabled={creating}>
                  {creating ? 'Creating...' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false)
                    setOrgName('')
                  }}
                  disabled={creating}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
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

      {/* Incoming Invitations - Show at top if user has any */}
      {myInvitations.length > 0 && (
        <div className={styles.incomingSection}>
          <h3>Incoming Invitations</h3>
          <p className={styles.incomingSectionSubtitle}>
            You have been invited to join {myInvitations.length === 1 ? 'an organization' : 'organizations'}
          </p>
          <div className={styles.list}>
            {myInvitations.map((invitation: any) => (
              <div key={invitation.id} className={styles.incomingInvitationCard}>
                <div className={styles.invitationInfo}>
                  <Icon name="building" />
                  <div>
                    <div className={styles.invitationOrgName}>
                      {invitation.organizations?.name || 'Organization'}
                    </div>
                    <div className={styles.invitationDetails}>
                      As {invitation.role} · Expires {new Date(invitation.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className={styles.incomingActions}>
                  <button
                    onClick={() => handleAcceptInvitation(invitation.token)}
                    className={styles.acceptButton}
                  >
                    <Icon name="check-circle" />
                    Accept
                  </button>
                  <button
                    onClick={() => handleDeclineInvitation(invitation.id)}
                    className={styles.declineButton}
                  >
                    <Icon name="times" />
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className={styles.header}>
        <div>
          <h3>Team Members</h3>
          <p>{members.length} of {organization.max_users} members</p>
        </div>
        <div className={styles.headerActions}>
          {canManageTeam && (
            <button
              className={styles.inviteButton}
              onClick={() => setShowInviteForm(!showInviteForm)}
            >
              <Icon name="user-plus" />
              Invite Member
            </button>
          )}
          {userRole !== 'owner' && (
            <button
              className={styles.leaveButton}
              onClick={handleLeaveOrganization}
              title="Leave organization"
            >
              <Icon name="sign-out-alt" />
              Leave Organization
            </button>
          )}
        </div>
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
