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

// Create organization
export async function createOrganization(userId: string, name: string) {
  const supabase = createClient()

  // Generate subdomain from organization name (lowercase, no spaces, alphanumeric only)
  const subdomain = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 63) // Max subdomain length

  // Create organization
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({
      name,
      subdomain,
      tier: 'small',
      max_users: 5,
    })
    .select()
    .single()

  if (orgError) throw orgError

  // Update user's profile to be owner of this organization
  const { error: profileError } = await supabase
    .from('profiles')
    .update({
      organization_id: org.id,
      role: 'owner',
    })
    .eq('id', userId)

  if (profileError) throw profileError

  return org
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

// Get invitations for organization (sent by this org)
export async function getInvitations(orgId: string): Promise<Invitation[]> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('invitations')
    .select('*')
    .eq('organization_id', orgId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching invitations:', error)
    throw error
  }

  return data || []
}

// Get invitations for current user (received invitations)
export async function getMyInvitations(): Promise<Invitation[]> {
  const supabase = createClient()

  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return []

    // Get user's email from profiles table instead of auth.users
    const { data: profile } = await supabase
      .from('profiles')
      .select('email')
      .eq('id', user.id)
      .single()

    if (!profile?.email) return []

    const { data, error } = await supabase
      .from('invitations')
      .select('*, organizations(name)')
      .eq('email', profile.email)
      .eq('status', 'pending')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching my invitations:', error)
      return [] // Return empty array instead of throwing
    }

    return data || []
  } catch (err) {
    console.error('Error in getMyInvitations:', err)
    return [] // Return empty array on any error
  }
}

// Create invitation
export async function createInvitation(orgId: string, email: string, role: UserRole) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const token = crypto.randomUUID()
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + 7) // 7 days

  console.log('Creating invitation:', { orgId, email, role, userId: user.id })

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

  if (error) {
    console.error('Error creating invitation:', error)
    throw error
  }
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
