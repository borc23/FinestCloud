import { createClient } from '../../../shared/lib/supabase/client'
import type { Database } from '@/features/auth/types/database'

type Profile = Database['public']['Tables']['profiles']['Row']
type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()

  if (error) {
    console.error('Error fetching profile:', error)
    return null
  }

  return data
}

export async function updateProfile(
  userId: string,
  updates: ProfileUpdate
): Promise<Profile | null> {
  const supabase = createClient() as any

  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('email')
    .eq('id', userId)
    .maybeSingle()

  if (existingProfile) {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating profile:', error)
      throw error
    }

    return data
  } else {
    const { data: userData } = await supabase.auth.getUser()
    const email = userData.user?.email

    if (!email) {
      throw new Error('User email not found')
    }

    const insertData = {
      id: userId,
      email,
      display_name: updates.display_name,
      default_latitude: updates.default_latitude,
      default_longitude: updates.default_longitude
    }

    const { data, error } = await supabase
      .from('profiles')
      .insert(insertData as any)
      .select()
      .single()

    if (error) {
      console.error('Error creating profile:', error)
      throw error
    }

    return data
  }
}

export async function setDefaultLocation(
  userId: string,
  latitude: number,
  longitude: number
): Promise<void> {
  await updateProfile(userId, {
    default_latitude: latitude,
    default_longitude: longitude,
  })
}

export async function getDefaultLocation(
  userId: string
): Promise<{ lat: number; lng: number } | null> {
  const profile = await getProfile(userId)

  if (
    profile &&
    profile.default_latitude !== null &&
    profile.default_longitude !== null
  ) {
    return {
      lat: profile.default_latitude,
      lng: profile.default_longitude,
    }
  }

  return null
}
