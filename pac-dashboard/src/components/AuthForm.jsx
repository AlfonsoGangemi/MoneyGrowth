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

export default function AuthForm({ onSignIn, onSignUp, defaultTab = 'login', onBack }) {
  const { t } = useLocale()
  const [tab, setTab] = useState(defaultTab)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
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
                <a href="/termini" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300 transition-colors">{t('auth_terms_link')}</a>
                {' '}{t('auth_terms_mid')}{' '}
                <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-slate-300 transition-colors">{t('auth_privacy_link')}</a>.
              </p>
            )}
          </form>

        </div>
      </div>
    </div>
  )
}
