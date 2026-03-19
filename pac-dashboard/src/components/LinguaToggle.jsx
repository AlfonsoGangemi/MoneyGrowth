import { useEffect, useRef, useState } from 'react'
import { useLocale } from '../hooks/useLocale'

function FlagIT({ size = 20 }) {
  const h = Math.round(size * 0.75)
  return (
    <svg width={size} height={h} viewBox="0 0 3 2" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', borderRadius: 2 }}>
      <rect width="1" height="2" x="0" fill="#009246" />
      <rect width="1" height="2" x="1" fill="#ffffff" />
      <rect width="1" height="2" x="2" fill="#ce2b37" />
    </svg>
  )
}

function FlagGB({ size = 20 }) {
  const h = Math.round(size * 0.75)
  return (
    <svg width={size} height={h} viewBox="0 0 60 40" xmlns="http://www.w3.org/2000/svg" style={{ display: 'block', borderRadius: 2 }}>
      <rect width="60" height="40" fill="#012169" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#fff" strokeWidth="8" />
      <path d="M0,0 L60,40 M60,0 L0,40" stroke="#C8102E" strokeWidth="4" />
      <path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth="12" />
      <path d="M30,0 V40 M0,20 H60" stroke="#C8102E" strokeWidth="8" />
    </svg>
  )
}

const LINGUE = [
  { code: 'it', label: 'Italiano', Flag: FlagIT },
  { code: 'en', label: 'English',  Flag: FlagGB },
]

export default function LinguaToggle() {
  const { lingua, setLingua } = useLocale()
  const [aperto, setAperto] = useState(false)
  const ref = useRef(null)

  const corrente = LINGUE.find(l => l.code === lingua) || LINGUE[0]

  useEffect(() => {
    function chiudi(e) {
      if (ref.current && !ref.current.contains(e.target)) setAperto(false)
    }
    document.addEventListener('mousedown', chiudi)
    return () => document.removeEventListener('mousedown', chiudi)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setAperto(v => !v)}
        className="flex items-center gap-1 text-slate-300 hover:text-white transition-colors"
        title={corrente.label}
      >
        <corrente.Flag size={20} />
        <svg className={`w-3 h-3 transition-transform ${aperto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {aperto && (
        <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden min-w-[120px]">
          {LINGUE.map(l => (
            <button
              key={l.code}
              onClick={() => { setLingua(l.code); setAperto(false) }}
              className={`w-full text-left flex items-center gap-2 px-3 py-2 text-xs transition-colors
                ${lingua === l.code ? 'text-white bg-slate-700' : 'text-slate-300 hover:bg-slate-700'}`}
            >
              <l.Flag size={18} />
              {l.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
