'use client'

import { createContext, useContext, useEffect, useState, useMemo, useCallback } from 'react'
import { User, Session, AuthError } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client' // Changed from { supabase }

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  error: AuthError | null
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<AuthError | null>(null)
  
  const supabase = createClient() // Create client instance

  useEffect(() => {
    let isMounted = true 

    const initializeAuth = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()

        if (!isMounted) return

        if (error) {
          console.error("Failed to get session:", error)
          setError(error)
        } else {
          setSession(session)
        }
      } catch (err) {
        if (!isMounted) return

        console.error("Auth init error:", err)
        setError(err as AuthError)
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }

    initializeAuth()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return

      try {
        setSession(session)
        setError(null)
      } catch (err) {
        console.error("Auth state change error:", err)
      }
    })

    return () => {
      isMounted = false
      subscription.unsubscribe()
    }
  }, [supabase]) // Add supabase to dependencies

  const signOut = useCallback(async (): Promise<void> => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setSession(null)
      setError(null)
    } catch (err) {
      const authError = err as AuthError
      console.error('Sign out failed:', authError)
      setError(authError)
      throw authError
    }
  }, [supabase]) // Add supabase to dependencies

  const value = useMemo(() => ({
    user: session?.user ?? null,
    session,
    loading,
    error,
    signOut,
  }), [session, loading, error, signOut])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)

  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }

  return context
}
