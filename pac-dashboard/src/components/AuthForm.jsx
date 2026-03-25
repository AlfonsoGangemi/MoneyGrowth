import { useState } from 'react'
import { isTempmail } from '../utils/tempmail'
import { useLocale } from '../hooks/useLocale'

function Input({ label, ...props }) {
  return (
    <div>
      <label className="block text-xs text-slate-400 mb-1">{label}</label>
      <input
        className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
        {...props}
      />
    </div>
  )
}

function tradErrore(msg, t) {
  if (msg.includes('Invalid login credentials')) return t('auth_err_credentials')
  if (msg.includes('Email not confirmed'))       return t('auth_err_credentials')
  if (msg.includes('User already registered'))   return t('auth_err_registered')
  if (msg.includes('Password should be'))        return t('auth_err_password')
  return 'Errore: ' + msg
}

export default function AuthForm({ onSignIn, onSignUp, onSignInGoogle, defaultTab = 'login', onBack, onTornaAllaLanding }) {
  const { t } = useLocale()
  const [tab, setTab] = useState(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingGoogle, setLoadingGoogle] = useState(false)
  const [errore, setErrore] = useState('')
  const [messaggio, setMessaggio] = useState('')

  function cambiaTab(nuovoTab) {
    setTab(nuovoTab)
    setErrore('')
    setMessaggio('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setErrore('')
    setMessaggio('')
    setLoading(true)
    try {
      if (tab === 'login') {
        await onSignIn(email, password)
      } else {
        if (isTempmail(email)) {
          setErrore(t('auth_err_tempmail'))
          return
        }
        const data = await onSignUp(email, password)
        if (!data.session) {
          setMessaggio(t('auth_registered_ok'))
          setEmail('')
          setPassword('')
        }
      }
    } catch (err) {
      setErrore(tradErrore(err.message, t))
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setErrore('')
    setLoadingGoogle(true)
    try {
      await onSignInGoogle()
    } catch (err) {
      setErrore(tradErrore(err.message, t))
    } finally {
      setLoadingGoogle(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        <div className="text-center mb-8">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors mb-4 flex items-center gap-1 mx-auto"
            >
              {t('auth_back')}
            </button>
          )}
          <h1 className="text-2xl font-bold text-white tracking-tight">ETF Lens</h1>
          <p className="text-sm text-slate-500 mt-1">{t('auth_subtitle')}</p>
        </div>

        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 shadow-2xl">

          {/* Tab login / registrati */}
          <div className="flex bg-slate-900/60 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => cambiaTab('login')}
              className={`flex-1 text-sm py-2 rounded-lg transition-colors font-medium ${tab === 'login' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {t('auth_tab_login')}
            </button>
            <button
              type="button"
              onClick={() => cambiaTab('register')}
              className={`flex-1 text-sm py-2 rounded-lg transition-colors font-medium ${tab === 'register' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {t('auth_tab_register')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="nome@email.com"
              required
              autoComplete="email"
            />
            <Input
              label="Password"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
            />

            {errore && (
              <p className="text-xs text-red-400 bg-red-400/10 rounded-lg px-3 py-2">{errore}</p>
            )}
            {messaggio && (
              <p className="text-xs text-green-400 bg-green-400/10 rounded-lg px-3 py-2">{messaggio}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              {loading ? '…' : tab === 'login' ? t('auth_submit_login') : t('auth_submit_register')}
            </button>

            {tab === 'register' && (
              <p className="text-xs text-slate-500 text-center">
                {t('auth_terms_prefix')}{' '}
                <a href="/termini" onClick={(e) => { e.preventDefault(); window.open('/termini', '_blank') }} className="underline hover:text-slate-300 transition-colors cursor-pointer">{t('auth_terms_link')}</a>
                {' '}{t('auth_terms_mid')}{' '}
                <a href="/privacy" onClick={(e) => { e.preventDefault(); window.open('/privacy', '_blank') }} className="underline hover:text-slate-300 transition-colors cursor-pointer">{t('auth_privacy_link')}</a>.
              </p>
            )}
          </form>

          {onSignInGoogle && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-4">
                <div className="flex-1 h-px bg-slate-700" />
                <span className="text-xs text-slate-500">{t('auth_or')}</span>
                <div className="flex-1 h-px bg-slate-700" />
              </div>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loadingGoogle || loading}
                className="w-full flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl py-2.5 text-sm font-medium transition-colors border border-slate-600"
              >
                {!loadingGoogle && (
                  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.35-8.16 2.35-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                    <path fill="none" d="M0 0h48v48H0z"/>
                  </svg>
                )}
                {loadingGoogle ? '…' : t('auth_google')}
              </button>
            </div>
          )}

        </div>

        {onTornaAllaLanding && (
          <div className="mt-5 text-center">
            <button
              type="button"
              onClick={onTornaAllaLanding}
              className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              {t('torna_alla_landing')}
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
