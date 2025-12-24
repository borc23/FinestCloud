/**
 * Organization API - Simple and straightforward
 */

import { createClient } from '@/shared/lib/supabase/client'
import type { Organization, Invitation, OrganizationMember, ActivityLogEntry, UserRole } from '../types/organization'

// Get user's organization
export async function getUserOrganization(userId: string): Promise<Organization | null> {
  const supabase = createClient()

  const { data: profile } = await supabase
    .from('profiles')
    .select('organization_id')
    .eq('id', userId)
    .single()

  if (!profile?.organization_id) return null

  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', profile.organization_id)
    .single()

  return data
}

// Update organization
export async function updateOrganization(orgId: string, updates: any) {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('organizations')
    .update(updates)
    .eq('id', orgId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Get organization members
export async function getOrganizationMembers(orgId: string): Promise<OrganizationMember[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at')

  return data || []
}

// Update member role
export async function updateMemberRole(userId: string, role: UserRole) {
  const supabase = createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ role })
    .eq('id', userId)

  if (error) throw error
}

// Remove member
export async function removeMember(userId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('profiles')
    .update({ organization_id: null, role: 'designer' })
    .eq('id', userId)

  if (error) throw error
}

// Get invitations
export async function getInvitations(orgId: string): Promise<Invitation[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('invitations')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  return data || []
}

// Create invitation
export async function createInvitation(orgId: string, email: string, role: UserRole) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  const { data, error } = await supabase
    .from('invitations')
    .insert({
      organization_id: orgId,
      email,
      role,
      invited_by: user.id,
      token,
      expires_at: expiresAt.toISOString(),
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Cancel invitation
export async function cancelInvitation(invitationId: string) {
  const supabase = createClient()
  const { error } = await supabase
    .from('invitations')
    .update({ status: 'cancelled' })
    .eq('id', invitationId)

  if (error) throw error
}

// Get invitation by token
export async function getInvitationByToken(token: string) {
  const supabase = createClient()
  const { data } = await supabase
    .from('invitations')
    .select('*, organizations(name)')
    .eq('token', token)
    .single()

  return data
}

// Accept invitation
export async function acceptInvitation(token: string, userId: string) {
  const supabase = createClient()

  const { data: invitation } = await supabase
    .from('invitations')
    .select('*')
    .eq('token', token)
    .single()

  if (!invitation) throw new Error('Invalid invitation')
  if (new Date(invitation.expires_at) < new Date()) throw new Error('Invitation expired')
  if (invitation.status === 'accepted') throw new Error('Already accepted')

  // Update profile
  await supabase
    .from('profiles')
    .update({
      organization_id: invitation.organization_id,
      role: invitation.role,
    })
    .eq('id', userId)

  // Mark as accepted
  await supabase
    .from('invitations')
    .update({ status: 'accepted' })
    .eq('id', invitation.id)
}

// Get activity log
export async function getActivityLog(orgId: string, limit = 50): Promise<ActivityLogEntry[]> {
  const supabase = createClient()
  const { data } = await supabase
    .from('activity_log')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })
    .limit(limit)

  return data || []
}
