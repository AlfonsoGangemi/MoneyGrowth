import { useAuth } from './hooks/useAuth'
import AuthForm from './components/AuthForm'
import Dashboard from './components/Dashboard'

export default function App() {
  const { user, loading, signIn, signUp, signOut } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <AuthForm onSignIn={signIn} onSignUp={signUp} />
  }

  return <Dashboard user={user} onSignOut={signOut} />
}
