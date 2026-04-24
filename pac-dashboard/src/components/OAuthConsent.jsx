import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { useLocale } from '../hooks/useLocale'
import AuthForm from './AuthForm'

export default function OAuthConsent() {
  const { t } = useLocale()
  const params = new URLSearchParams(window.location.search)
  const clientId = params.get('client_id') ?? ''
  const redirectUri = params.get('redirect_uri') ?? ''
  const codeChallenge = params.get('code_challenge') ?? ''
  const codeChallengeMethod = params.get('code_challenge_method') ?? 'S256'
  const state = params.get('state') ?? ''
  const scope = params.get('scope') ?? 'portfolio:read'

  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function authorize() {
    setSubmitting(true)
    setError('')
    try {
      const res = await fetch('/api/oauth/authorize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          redirect_uri: redirectUri,
          code_challenge: codeChallenge,
          code_challenge_method: codeChallengeMethod,
          state: state || undefined,
          scope,
          access_token: session.access_token,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? t('oauth_error_generic'))
        return
      }
      window.location.href = data.redirect_to
    } catch {
      setError(t('oauth_error_generic'))
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!session) {
    const currentUrl = window.location.href
    return (
      <AuthForm
        defaultTab="login"
        onSignIn={async (email, password) => {
          const { error: err } = await supabase.auth.signInWithPassword({ email, password })
          if (err) throw err
        }}
        onSignUp={async (email, password) => {
          const { data, error: err } = await supabase.auth.signUp({ email, password })
          if (err) throw err
          return data
        }}
        onSignInGoogle={async () => {
          const { error: err } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: { redirectTo: currentUrl },
          })
          if (err) throw err
        }}
      />
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg p-8 max-w-md w-full">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100 mb-6">
          {t('oauth_consent_title')}
        </h1>

        <div className="space-y-4 mb-8">
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('oauth_consent_client')}</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">{clientId}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('oauth_scope_label')}</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">{scope}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('oauth_consent_logged_as')}</p>
            <p className="font-medium text-slate-800 dark:text-slate-100">{session.user.email}</p>
          </div>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-600 dark:text-red-400">{error}</p>
        )}

        <button
          onClick={authorize}
          disabled={submitting}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-medium transition-colors"
        >
          {submitting ? t('oauth_authorizing') : t('oauth_authorize_btn')}
        </button>
      </div>
    </div>
  )
}
