import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { LocaleProvider } from './hooks/useLocale'
import AuthForm from './components/AuthForm'
import Dashboard from './components/Dashboard'
import LandingPage from './components/LandingPage'
import Termini from './components/Termini'
import Privacy from './components/Privacy'

const path = window.location.pathname

export default function App() {
  if (path === '/termini') return <LocaleProvider><Termini /></LocaleProvider>
  if (path === '/privacy') return <LocaleProvider><Privacy /></LocaleProvider>

  return (
    <LocaleProvider>
      <AppInner />
    </LocaleProvider>
  )
}

function AppInner() {
  const { user, loading, signIn, signUp, signOut } = useAuth()
  const [mostraAuth, setMostraAuth] = useState(false)
  const [defaultTab, setDefaultTab] = useState('login')

  useEffect(() => {
    if (user) localStorage.setItem('pac_returning', '1')
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    const isReturning = !!localStorage.getItem('pac_returning')
    if (mostraAuth || isReturning) {
      return (
        <AuthForm
          key={defaultTab}
          defaultTab={defaultTab}
          onSignIn={signIn}
          onSignUp={signUp}
          onBack={isReturning ? undefined : () => setMostraAuth(false)}
        />
      )
    }
    return (
      <LandingPage
        onCTA={(tab) => { setDefaultTab(tab); setMostraAuth(true) }}
      />
    )
  }

  async function handleSignOut() {
    await signOut()
    setDefaultTab('login')
    setMostraAuth(true)
  }

  return <Dashboard user={user} onSignOut={handleSignOut} />
}
