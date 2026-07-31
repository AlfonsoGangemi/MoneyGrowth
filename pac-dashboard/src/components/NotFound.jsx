import { useEffect } from 'react'
import { useLocale } from '../hooks/useLocale'
import LinguaToggle from './LinguaToggle'

export default function NotFound() {
  const { lingua } = useLocale()

  useEffect(() => {
    const isLight = localStorage.getItem('lightMode') === 'true'
    document.documentElement.classList.toggle('dark', !isLight)
  }, [])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100">
      <header className="border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-sm text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">← ETF Lens</a>
          <LinguaToggle />
        </div>
      </header>
      <main className="max-w-3xl mx-auto px-4 py-24 text-center">
        <p className="text-6xl sm:text-7xl font-extrabold text-slate-200 dark:text-slate-700 tracking-tight">404</p>
        <h1 className="mt-4 text-2xl font-bold text-slate-900 dark:text-white">
          {lingua === 'it' ? 'Pagina non trovata' : 'Page not found'}
        </h1>
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400 leading-relaxed max-w-md mx-auto">
          {lingua === 'it'
            ? 'La pagina che stai cercando non esiste o è stata spostata.'
            : 'The page you are looking for does not exist or has been moved.'}
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href="/" className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            {lingua === 'it' ? 'Torna alla home' : 'Back to home'}
          </a>
          <a href="/privacy" className="inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            Privacy
          </a>
          <a href="/termini" className="inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors">
            {lingua === 'it' ? 'Termini' : 'Terms'}
          </a>
        </div>
      </main>
    </div>
  )
}
