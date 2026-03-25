import { useState, useEffect } from 'react'
import * as Sentry from '@sentry/react'
import { supabase } from '../utils/supabase'

export function useAuth() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(typeof window !== 'undefined')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session }, error }) => {
      if (error) Sentry.captureException(error, { tags: { operation: 'get_session' } })
      setUser(session?.user ?? null)
      setLoading(false)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user ?? null
      setUser(u)
      if (u) {
        Sentry.setUser({ id: u.id })
      } else {
        Sentry.setUser(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  async function signIn(email, password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { Sentry.captureException(error, { tags: { operation: 'sign_in' } }); throw error }
  }

  async function signUp(email, password) {
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) { Sentry.captureException(error, { tags: { operation: 'sign_up' } }); throw error }
    return data // data.session è null se la conferma email è richiesta
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut()
    if (error) Sentry.captureException(error, { tags: { operation: 'sign_out' } })
  }

  return { user, loading, signIn, signUp, signOut }
}
