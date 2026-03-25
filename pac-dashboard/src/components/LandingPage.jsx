import { useState, useEffect, useRef } from 'react'
import { useLocale } from '../hooks/useLocale'
import LinguaToggle from './LinguaToggle'

const GITHUB_URL = 'https://github.com/AlfonsoGangemi/MoneyGrowth'

const POSIZIONI = [
  { top: 56, left: 80, opacity: 1,    zIndex: 3, border: '1px solid rgba(148,163,184,0.5)', shadow: '0 10px 30px rgba(0,0,0,0.5)' },
  { top: 28, left: 40, opacity: 0.65, zIndex: 2, border: '1px solid rgba(148,163,184,0.2)', shadow: '0 4px 12px rgba(0,0,0,0.3)' },
  { top: 0,  left: 0,  opacity: 0.35, zIndex: 1, border: '1px solid rgba(148,163,184,0.1)', shadow: '0 2px 6px rgba(0,0,0,0.2)'  },
]

function StackCardsAnimated({ kpiCards }) {
  const [activeIdx, setActiveIdx] = useState(0)
  const pausedRef = useRef(false)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    const id = setInterval(() => {
      if (!pausedRef.current) setActiveIdx(i => (i + 1) % 3)
    }, 3000)
    return () => clearInterval(id)
  }, [])

  return (
    <div
      className="relative mx-auto"
      style={{ width: '280px', height: '160px' }}
      onMouseEnter={() => { pausedRef.current = true }}
      onMouseLeave={() => { pausedRef.current = false }}
    >
      {kpiCards.map((card, i) => {
        const pos = POSIZIONI[(i - activeIdx + 3) % 3]
        return (
          <div
            key={card.label}
            className="absolute rounded-xl p-4 bg-slate-900"
            style={{
              width: '200px',
              top: pos.top,
              left: pos.left,
              opacity: pos.opacity,
              zIndex: pos.zIndex,
              border: pos.border,
              boxShadow: pos.shadow,
              transition: 'top 0.6s ease, left 0.6s ease, opacity 0.6s ease',
            }}
          >
            <p className="text-xs text-slate-500">{card.label}</p>
            <p className="text-xl font-bold tabular-nums mt-0.5" style={{ color: card.color }}>{card.valore}</p>
            <p className="text-xs text-slate-500 mt-0.5">{card.sub}</p>
          </div>
        )
      })}
    </div>
  )
}

function GraficoDecorativo() {
  return (
    <div className="w-full max-w-2xl mx-auto mt-10 opacity-60">
      <svg viewBox="0 0 800 200" xmlns="http://www.w3.org/2000/svg" className="w-full">
        <defs>
          <linearGradient id="lg-blue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
          </linearGradient>
          <linearGradient id="lg-green" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#22c55e" stopOpacity="0.18" />
            <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
          </linearGradient>
        </defs>
        {/* Area ottimistica */}
        <path d="M 0,170 C 150,165 350,110 800,28 L 800,200 L 0,200 Z" fill="url(#lg-green)" />
        {/* Area conservativa */}
        <path d="M 0,170 C 150,166 350,132 800,82 L 800,200 L 0,200 Z" fill="url(#lg-blue)" />
        {/* Linea capitale investito (tratteggiata) */}
        <line x1="0" y1="170" x2="800" y2="150" stroke="#334155" strokeWidth="1.5" strokeDasharray="6,4" />
        {/* Linea conservativa */}
        <path d="M 0,170 C 150,166 350,132 800,82" stroke="#3b82f6" strokeWidth="2" fill="none" />
        {/* Linea ottimistica */}
        <path d="M 0,170 C 150,165 350,110 800,28" stroke="#22c55e" strokeWidth="2" fill="none" />
      </svg>
    </div>
  )
}

function Tooltip({ label, desc }) {
  return (
    <span className="relative group cursor-default inline-block">
      <span className="text-slate-400 underline decoration-dotted decoration-slate-600 underline-offset-2 hover:text-slate-200 transition-colors">
        {label}
      </span>
      <span className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-56 bg-slate-800 border border-slate-600 rounded-xl px-3 py-2.5 text-xs text-slate-300 leading-relaxed opacity-0 group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-xl text-left">
        <span className="font-semibold text-white block mb-1">{label}</span>
        {desc}
      </span>
    </span>
  )
}

function WordArt() {
  return (
    <div className="mb-6 select-none">
      <span
        className="font-black tracking-tight leading-none"
        style={{
          fontSize: 'clamp(2.8rem, 9vw, 5.5rem)',
          background: 'linear-gradient(135deg, #60a5fa 0%, #34d399 55%, #4ade80 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          filter: 'drop-shadow(0 0 32px rgba(96,165,250,0.35)) drop-shadow(0 0 12px rgba(52,211,153,0.2))',
        }}
      >
        ETF Lens
      </span>
    </div>
  )
}

function IconCheck() {
  return (
    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function IconChevron({ open }) {
  return (
    <svg
      className={`w-4 h-4 text-slate-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
      fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

const FEATURE_CARDS = [
  {
    id: 'storico',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
      </svg>
    ),
    titolo: (t) => t('feat_storico_titolo'),
    sub: (t) => t('feat_storico_sub'),
    dettaglio: (t) => (
      <div className="mt-4 border-t border-slate-700 pt-4">
        <p className="text-xs text-slate-500 mb-2">{t('feat_storico_esempio')}</p>
        <table className="w-full text-xs text-slate-300">
          <thead>
            <tr className="text-slate-500 border-b border-slate-700">
              <th className="text-left pb-1.5 font-medium">{t('feat_storico_col_data')}</th>
              <th className="text-left pb-1.5 font-medium">{t('feat_storico_col_etf')}</th>
              <th className="text-right pb-1.5 font-medium">{t('feat_storico_col_prezzo')}</th>
              <th className="text-right pb-1.5 font-medium">{t('feat_storico_col_quote')}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/60">
            <tr>
              <td className="py-1.5 text-slate-400">15/01/2025</td>
              <td className="py-1.5">VWCE</td>
              <td className="py-1.5 text-right tabular-nums">€128,40</td>
              <td className="py-1.5 text-right tabular-nums">2,338</td>
            </tr>
            <tr>
              <td className="py-1.5 text-slate-400">15/02/2025</td>
              <td className="py-1.5">VWCE</td>
              <td className="py-1.5 text-right tabular-nums">€131,20</td>
              <td className="py-1.5 text-right tabular-nums">2,287</td>
            </tr>
            <tr>
              <td className="py-1.5 text-slate-400">15/03/2025</td>
              <td className="py-1.5">VWCE</td>
              <td className="py-1.5 text-right tabular-nums">€134,60</td>
              <td className="py-1.5 text-right tabular-nums">2,229</td>
            </tr>
          </tbody>
        </table>
        <p className="text-xs text-slate-500 mt-3">{t('feat_storico_note')}</p>
      </div>
    ),
  },
  {
    id: 'scenari',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
      </svg>
    ),
    titolo: (t) => t('feat_scenari_titolo'),
    sub: (t) => t('feat_scenari_sub'),
    dettaglio: (t) => (
      <div className="mt-4 border-t border-slate-700 pt-4 space-y-2.5">
        <p className="text-xs text-slate-500 mb-3">{t('feat_scenari_intro')}</p>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{t('feat_scenari_conservativo')}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-blue-400 font-medium">5% / anno</span>
            <span className="text-xs tabular-nums text-slate-400">→ €41.200 in 10 anni</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{t('feat_scenari_moderato')}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-blue-400 font-medium">7% / anno</span>
            <span className="text-xs tabular-nums text-slate-400">→ €48.600 in 10 anni</span>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">{t('feat_scenari_ottimistico')}</span>
          <div className="flex items-center gap-2">
            <span className="text-xs tabular-nums text-green-400 font-medium">10% / anno</span>
            <span className="text-xs tabular-nums text-slate-400">→ €61.500 in 10 anni</span>
          </div>
        </div>
        <p className="text-xs text-slate-500 pt-1">{t('feat_scenari_note')}</p>
      </div>
    ),
  },
  {
    id: 'dati',
    icon: (
      <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
      </svg>
    ),
    titolo: (t) => t('feat_dati_titolo'),
    sub: (t) => t('feat_dati_sub'),
    dettaglio: (t) => (
      <div className="mt-4 border-t border-slate-700 pt-4 space-y-3">
        <div className="flex items-start gap-2">
          <IconCheck />
          <p className="text-xs text-slate-400">{t('feat_dati_1')}</p>
        </div>
        <div className="flex items-start gap-2">
          <IconCheck />
          <p className="text-xs text-slate-400">{t('feat_dati_2')}</p>
        </div>
        <div className="flex items-start gap-2">
          <IconCheck />
          <p className="text-xs text-slate-400">{t('feat_dati_3')}</p>
        </div>
        <div className="flex items-start gap-2">
          <IconCheck />
          <p className="text-xs text-slate-400">{t('feat_dati_4')}</p>
        </div>
      </div>
    ),
  },
]

export default function LandingPage({ onCTA }) {
  const { t } = useLocale()
  const [aperta, setAperta] = useState(null)
  const [faqAperta, setFaqAperta] = useState(null)

  const kpiCards = [
    { label: 'ROI',               valore: '+18,4%',  sub: t('kpi_roi_sub'),   color: '#4ade80' },
    { label: 'CAGR',              valore: '+9,2%',   sub: t('kpi_cagr_sub'),  color: '#4ade80' },
    { label: t('valore_portafoglio'), valore: '€27.720', sub: t('kpi_valore_sub'), color: '#f1f5f9' },
  ]

  const altriIndicatori = [
    { label: 'XIRR',         desc: t('altri_xirr_desc') },
    { label: 'TWRR',         desc: t('altri_twrr_desc') },
    { label: 'Max Drawdown', desc: t('altri_drawdown_desc') },
    { label: t('volatilita'),    desc: t('altri_volatilita_desc') },
  ]

  function toggleCard(id) {
    setAperta(prev => prev === id ? null : id)
  }

  const faqs = [
    { q: t('faq_1_q'), a: t('faq_1_a') },
    { q: t('faq_2_q'), a: t('faq_2_a') },
    { q: t('faq_3_q'), a: t('faq_3_a') },
    { q: t('faq_4_q'), a: t('faq_4_a') },
    { q: t('faq_5_q'), a: t('faq_5_a') },
    { q: t('faq_6_q'), a: t('faq_6_a') },
    { q: t('faq_7_q'), a: t('faq_7_a') },
  ]

  return (
    <div className="min-h-screen bg-slate-900 text-slate-300">

      {/* ── Header sticky ─────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm tracking-tight">ETF Lens</span>
            <LinguaToggle />
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => onCTA('login')}
              className="text-sm text-slate-300 hover:text-white px-3 py-1.5 transition-colors"
            >
              {t('accedi')}
            </button>
            <button
              onClick={() => onCTA('register')}
              className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-1.5 rounded-lg font-medium transition-colors"
            >
              {t('inizia_gratis')}
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="bg-slate-950 pt-20 pb-16 px-4 sm:px-6 text-center">
        <div className="max-w-2xl mx-auto">
          <WordArt />
          <h1 className="text-4xl sm:text-5xl font-bold text-white tracking-tight leading-tight mb-4">
            {t('hero_title')}
          </h1>
          <p className="text-lg text-slate-400 mb-8 leading-relaxed">
            {t('hero_sub')}
          </p>
          <div className="flex items-center justify-center gap-6 text-sm text-slate-500">
            <span className="flex items-center gap-1.5"><IconCheck /> {t('badge_gratuito')}</span>
            <span className="flex items-center gap-1.5"><IconCheck /> {t('badge_open_source')}</span>
            <span className="flex items-center gap-1.5"><IconCheck /> {t('badge_dati')}</span>
          </div>
          <GraficoDecorativo />
        </div>
      </section>

      {/* ── Feature cards ─────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16 space-y-4">
        <h2 className="text-xl font-bold text-white mb-2">{t('feat_section_title')}</h2>

        {/* Card featured: Analisi realtime */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6">
          <div className="flex items-start gap-3 mb-6">
            <span className="text-blue-400 mt-0.5 flex-shrink-0">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            </span>
            <div>
              <p className="text-white font-semibold">{t('analisi_title')}</p>
              <p className="text-sm text-slate-400 mt-0.5">{t('analisi_sub')}</p>
            </div>
          </div>

          <StackCardsAnimated kpiCards={kpiCards} />

          {/* Altri indicatori disponibili */}
          <p className="text-center text-xs text-slate-500 mt-4 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1">
            <span>{t('e_ancora')}</span>
            {altriIndicatori.map((ind, i) => (
              <span key={ind.label} className="inline-flex items-center gap-1.5">
                <Tooltip label={ind.label} desc={ind.desc} />
                {i < altriIndicatori.length - 1 && <span className="text-slate-600">·</span>}
              </span>
            ))}
          </p>
        </div>

        {/* 3 card supporto — cliccabili */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-start">
          {FEATURE_CARDS.map(card => {
            const isOpen = aperta === card.id
            return (
              <button
                key={card.id}
                type="button"
                onClick={() => toggleCard(card.id)}
                className={`bg-slate-800 border rounded-2xl p-5 text-left transition-colors w-full ${isOpen ? 'border-blue-500/60' : 'border-slate-700 hover:border-slate-600'}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-blue-400 flex-shrink-0 mt-0.5">{card.icon}</span>
                  <IconChevron open={isOpen} />
                </div>
                <p className="text-white font-semibold mt-3 mb-1">{card.titolo(t)}</p>
                <p className="text-sm text-slate-400">{card.sub(t)}</p>
                {isOpen && card.dettaglio(t)}
              </button>
            )
          })}
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 py-16" itemScope itemType="https://schema.org/FAQPage">
        <h2 className="text-xl font-bold text-white mb-6">{t('faq_titolo')}</h2>
        <div className="space-y-2">
          {faqs.map((faq, i) => {
            const isOpen = faqAperta === i
            return (
              <div key={i} itemScope itemProp="mainEntity" itemType="https://schema.org/Question">
                <button
                  type="button"
                  onClick={() => setFaqAperta(prev => prev === i ? null : i)}
                  className={`w-full bg-slate-800 border rounded-xl px-5 py-4 text-left flex items-center justify-between gap-3 transition-colors ${isOpen ? 'border-blue-500/60 rounded-b-none' : 'border-slate-700 hover:border-slate-600'}`}
                >
                  <span className="text-sm font-medium text-white" itemProp="name">{faq.q}</span>
                  <IconChevron open={isOpen} />
                </button>
                {isOpen && (
                  <div
                    className="bg-slate-800/50 border border-t-0 border-blue-500/60 rounded-b-xl px-5 py-4"
                    itemScope itemProp="acceptedAnswer" itemType="https://schema.org/Answer"
                  >
                    <p className="text-sm text-slate-400 leading-relaxed" itemProp="text">{faq.a}</p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 py-6 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
          <span>ETF Lens</span>
          <div className="flex items-center gap-4">
            <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">{t('footer_privacy')}</a>
            <a href="/termini" target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors">{t('footer_termini')}</a>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className="hover:text-slate-300 transition-colors flex items-center gap-1">
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
              {t('footer_github')}
            </a>
          </div>
        </div>
      </footer>

    </div>
  )
}
