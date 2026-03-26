import { useState, useEffect } from 'react'
import { useAuth } from './hooks/useAuth'
import { LocaleProvider } from './hooks/useLocale'
import { ThemeProvider } from './hooks/useTheme'
import AuthForm from './components/AuthForm'
import Dashboard from './components/Dashboard'
import LandingPage from './components/LandingPage'
import Termini from './components/Termini'
import Privacy from './components/Privacy'

export default function App({ url }) {
  const path = url ?? (typeof window !== 'undefined' ? window.location.pathname : '/')
  if (path === '/termini') return <LocaleProvider><Termini /></LocaleProvider>
  if (path === '/privacy') return <LocaleProvider><Privacy /></LocaleProvider>

  return (
    <ThemeProvider>
      <LocaleProvider>
        <AppInner />
      </LocaleProvider>
    </ThemeProvider>
  )
}

function AppInner() {
  const { user, loading, signIn, signUp, signOut, signInWithGoogle } = useAuth()
  const [mostraAuth, setMostraAuth] = useState(false)
  const [defaultTab, setDefaultTab] = useState('login')

  useEffect(() => {
    if (user) localStorage.setItem('pac_returning', '1')
  }, [user])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    const isReturning = typeof window !== 'undefined' && !!localStorage.getItem('pac_returning')
    if (mostraAuth || isReturning) {
      return (
        <AuthForm
          key={defaultTab}
          defaultTab={defaultTab}
          onSignIn={signIn}
          onSignUp={signUp}
          onSignInGoogle={signInWithGoogle}
          onBack={isReturning ? undefined : () => setMostraAuth(false)}
          onTornaAllaLanding={isReturning ? () => {
            localStorage.removeItem('pac_returning')
            setMostraAuth(false)
          } : undefined}
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
