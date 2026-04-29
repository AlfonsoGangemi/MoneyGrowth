import { useState, useEffect } from 'react'
import { useLocale } from '../hooks/useLocale'
import { useTheme } from '../hooks/useTheme'
import { useTrustStats } from '../hooks/useTrustStats'
import { formatStatValue } from '../utils/formatStat'
import LinguaToggle from './LinguaToggle'
import ThemeToggle from './ThemeToggle'

const GITHUB_URL = 'https://github.com/AlfonsoGangemi/MoneyGrowth'

const BROKERS = [
  'ExtraETF', 'JustETF', 'Degiro', 'Fineco', 'Directa', 'Trade Republic',
  'IBKR', 'BG Saxo', 'Binck', 'Unicredit', 'Intesa', 'Sella',
]

// ── SVG icons ──────────────────────────────────────────────────────────────

function IconCheck() {
  return (
    <svg className="w-4 h-4 text-emerald-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
    </svg>
  )
}

function IconX() {
  return (
    <svg className="w-4 h-4 text-rose-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function IconChevron({ open }) {
  return (
    <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
    </svg>
  )
}

function GithubIcon() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  )
}

function GoogleMark() {
  return (
    <svg className="w-4 h-4" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.6-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.2 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.2-.1-2.3-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.6 16 18.9 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.2 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.2 26.7 36 24 36c-5.3 0-9.7-3.4-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4.1 5.5l6.2 5.2C40.9 35.2 44 30 44 24c0-1.2-.1-2.3-.4-3.5z" />
    </svg>
  )
}

// ── Chart helpers ───────────────────────────────────────────────────────────

function Sparkline({ color = '#22c55e', data, h = 36, w = 110 }) {
  const max = Math.max(...data)
  const min = Math.min(...data)
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * w
    const y = h - ((v - min) / (max - min || 1)) * h
    return [x, y]
  })
  const d = pts.map((p, i) => (i === 0 ? `M ${p[0]},${p[1]}` : `L ${p[0]},${p[1]}`)).join(' ')
  const area = `${d} L ${w},${h} L 0,${h} Z`
  const gId = `sg-${color.replace('#', '')}`
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
      <defs>
        <linearGradient id={gId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill={`url(#${gId})`} />
      <path d={d} stroke={color} strokeWidth="1.5" fill="none" />
    </svg>
  )
}

function BigChart() {
  const months = 28
  const w = 640; const h = 220
  const investito = Array.from({ length: months }, (_, i) => 200 + i * 250)
  const valore = investito.map((v, i) => v * (1 + Math.sin(i / 3) * 0.04 + i * 0.012))
  const maxY = Math.max(...valore) * 1.05
  const toXY = (arr) => arr.map((v, i) => [
    (i / (arr.length - 1)) * w,
    h - (v / maxY) * h,
  ])
  const line = (arr) => toXY(arr).map((p, i) => (i === 0 ? `M ${p[0]},${p[1]}` : `L ${p[0]},${p[1]}`)).join(' ')
  const area = (arr) => `${line(arr)} L ${w},${h} L 0,${h} Z`
  const lastY = h - (valore[valore.length - 1] / maxY) * h
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-auto" preserveAspectRatio="none">
      <defs>
        <linearGradient id="bc-v" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.28" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2, 3].map((i) => (
        <line key={i} x1="0" x2={w} y1={h / 4 * i + 0.5} y2={h / 4 * i + 0.5}
          stroke="currentColor" className="text-slate-200 dark:text-slate-800" strokeWidth="1" />
      ))}
      <path d={area(valore)} fill="url(#bc-v)" />
      <path d={line(valore)} stroke="#3b82f6" strokeWidth="2" fill="none" />
      <path d={line(investito)} stroke="currentColor"
        className="text-slate-400 dark:text-slate-600" strokeWidth="1.5" strokeDasharray="4 4" fill="none" />
      <circle cx={w - 1} cy={lastY} r="4" fill="#3b82f6" />
      <circle cx={w - 1} cy={lastY} r="9" fill="#3b82f6" fillOpacity="0.18" />
    </svg>
  )
}

function KPI({ label, val, delta, pos = true }) {
  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
      <div className="text-[10px] uppercase tracking-wider text-slate-400 dark:text-slate-500 font-medium">{label}</div>
      <div className="mt-0.5 flex items-baseline gap-1.5">
        <span className="text-lg font-bold tabular-nums text-slate-900 dark:text-white">{val}</span>
        {delta && (
          <span className={`text-[11px] font-semibold tabular-nums ${pos ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}`}>
            {delta}
          </span>
        )}
      </div>
    </div>
  )
}

function ETFRow({ name, isin, broker, invest, val, delta, spark, color }) {
  return (
    <div className="grid grid-cols-12 gap-2 items-center px-3 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <div className="col-span-5">
        <div className="text-[13px] font-semibold text-slate-900 dark:text-white leading-tight">{name}</div>
        <div className="text-[10px] text-slate-400 font-mono mt-0.5">{isin} · {broker}</div>
      </div>
      <div className="col-span-2 hidden sm:block">
        <Sparkline color={color} data={spark} w={70} h={22} />
      </div>
      <div className="col-span-2 text-right text-[12px] tabular-nums text-slate-500 dark:text-slate-400">€{invest}</div>
      <div className="col-span-2 text-right text-[12px] tabular-nums font-semibold text-slate-900 dark:text-white">€{val}</div>
      <div className="col-span-1 text-right text-[11px] tabular-nums font-semibold text-emerald-600 dark:text-emerald-400">{delta}</div>
    </div>
  )
}

function ProductPreview({ dark: forceDark }) {
  return (
    <div className={`relative rounded-2xl shadow-2xl shadow-slate-900/20 dark:shadow-black/50 overflow-hidden border border-slate-200 dark:border-slate-800 ${forceDark ? 'dark' : ''}`}>
      <div className="bg-white dark:bg-slate-900">
        {/* Chrome bar */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <div className="flex gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          </div>
          <div className="flex-1 flex justify-center">
            <div className="text-[10px] font-mono text-slate-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-0.5 rounded-md">
              etflens.app / dashboard
            </div>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-400">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" /> live
          </div>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-5 grid grid-cols-12 gap-4 bg-slate-50 dark:bg-slate-950">
          {/* Sidebar */}
          <div className="hidden md:flex col-span-2 flex-col gap-1">
            {[
              { l: 'Dashboard', a: true },
              { l: 'ETF', a: false },
              { l: 'Acquisti', a: false },
              { l: 'Scenari', a: false },
              { l: 'MCP / AI', a: false },
              { l: 'Impostazioni', a: false },
            ].map((it) => (
              <div key={it.l}
                className={`text-[11px] px-2.5 py-1.5 rounded-lg ${it.a ? 'bg-blue-600 text-white font-medium' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {it.l}
              </div>
            ))}
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 dark:border-slate-800 p-2 text-[10px] text-slate-400">
              <div className="font-mono">Broker</div>
              <div className="mt-1 flex flex-wrap gap-1">
                {['Degiro', 'Fineco', 'Directa'].map((b) => (
                  <span key={b} className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400">{b}</span>
                ))}
              </div>
            </div>
          </div>

          {/* Main */}
          <div className="col-span-12 md:col-span-10 space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <KPI label="Valore" val="€27.720" delta="+18,4%" />
              <KPI label="Investito" val="€23.400" />
              <KPI label="CAGR" val="+9,2%" delta="2y" />
              <KPI label="XIRR" val="+11,1%" delta="real" />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="text-[11px] text-slate-400 dark:text-slate-500">Portafoglio vs investito</div>
                  <div className="flex items-center gap-3 mt-0.5">
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="w-2.5 h-0.5 bg-blue-500" />Valore
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400">
                      <span className="w-2.5 border-t border-dashed border-slate-400" />Investito
                    </span>
                  </div>
                </div>
                <div className="flex gap-1 text-[10px]">
                  {['1M', '3M', '1Y', 'Tutto'].map((r, i) => (
                    <button key={r}
                      className={`px-2 py-0.5 rounded-md ${i === 3 ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900' : 'text-slate-500 dark:text-slate-400'}`}>
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <BigChart />
            </div>

            <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
              <div className="grid grid-cols-12 gap-2 px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-[10px] uppercase tracking-wider text-slate-400 font-medium">
                <div className="col-span-5">ETF</div>
                <div className="col-span-2 hidden sm:block">30d</div>
                <div className="col-span-2 text-right">Invest.</div>
                <div className="col-span-2 text-right">Valore</div>
                <div className="col-span-1 text-right">ROI</div>
              </div>
              <ETFRow name="Vanguard FTSE All-World" isin="IE00BK5BQT80" broker="Degiro" invest="12.800" val="15.420" delta="+20,5%" color="#22c55e" spark={[10,12,11,13,14,13,15,16,15,17,18]} />
              <ETFRow name="iShares Core MSCI EM" isin="IE00BKM4GZ66" broker="Fineco" invest="5.400" val="5.980" delta="+10,7%" color="#3b82f6" spark={[10,11,10,12,11,13,12,13,13,14,14]} />
              <ETFRow name="iShares €-Aggregate Bond" isin="IE00B3F81R35" broker="Directa" invest="3.200" val="3.180" delta="−0,6%" color="#94a3b8" spark={[12,11,12,11,10,11,10,11,10,11,10]} />
              <ETFRow name="Invesco Nasdaq-100" isin="IE00BFZXGZ54" broker="Degiro" invest="2.000" val="3.140" delta="+57,0%" color="#a855f7" spark={[8,9,10,11,13,12,14,15,17,18,20]} />
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Header ──────────────────────────────────────────────────────────────────

function Header({ onCTA, t }) {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <header className={`sticky top-0 z-40 transition-all ${scrolled ? 'bg-white/85 dark:bg-slate-950/85 backdrop-blur border-b border-slate-200 dark:border-slate-800' : 'bg-transparent'}`}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white font-black text-sm">E</div>
          <span className="font-bold text-slate-900 dark:text-white tracking-tight">ETF Lens</span>
        </div>
        <nav className="hidden md:flex items-center gap-6 text-[13px] text-slate-600 dark:text-slate-300">
          <a href="#features" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t('lp_nav_funzioni')}</a>
          <a href="#ai" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t('lp_nav_ai')}</a>
          <a href="#pricing" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t('lp_nav_prezzo')}</a>
          <a href="#faq" className="hover:text-slate-900 dark:hover:text-white transition-colors">{t('lp_nav_faq')}</a>
          <a href={GITHUB_URL} target="_blank" rel="noreferrer" className="hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
            <GithubIcon /> GitHub
          </a>
        </nav>
        <div className="flex items-center gap-2">
          <LinguaToggle />
          <ThemeToggle />
          <button onClick={() => onCTA('login')} className="hidden sm:block text-[13px] text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white px-2 py-1.5 transition-colors">
            Accedi
          </button>
          <button onClick={() => onCTA('register')} className="text-[13px] bg-blue-600 hover:bg-blue-500 text-white px-3.5 py-1.5 rounded-lg font-semibold shadow-sm transition-colors">
            {t('lp_hero_badge1')}
          </button>
        </div>
      </div>
    </header>
  )
}

// ── Hero ────────────────────────────────────────────────────────────────────

function Hero({ onCTA, t, tema }) {
  const [live, setLive] = useState(27720)
  useEffect(() => {
    const id = setInterval(() => setLive((v) => v + Math.round((Math.random() - 0.3) * 6)), 1800)
    return () => clearInterval(id)
  }, [])

  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[900px] h-[500px] rounded-full pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at center, rgba(59,130,246,0.25), transparent 60%)', filter: 'blur(30px)' }} />

      <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 pb-10 sm:pt-20 sm:pb-16">
        <div className="text-center max-w-3xl mx-auto">
          {/* Announcement pill */}
          <a href="#ai" className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/70 backdrop-blur px-3 py-1 text-[11px] text-slate-600 dark:text-slate-300 hover:border-blue-300 dark:hover:border-blue-500/40 transition-colors">
            <span className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 pulse-dot" />
              {t('lp_hero_novita')}
            </span>
            <span>{t('lp_hero_pill')}</span>
            <span className="text-slate-400">→</span>
          </a>

          <h1 className="mt-6 text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight leading-[1.05] title-grad text-balance">
            {t('lp_hero_title')}
          </h1>
          <p className="mt-5 text-[17px] sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed max-w-2xl mx-auto text-balance">
            {t('lp_hero_sub')}
          </p>

          {/* CTA cluster */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button onClick={() => onCTA('register')}
              className="group w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-6 py-3.5 rounded-xl shadow-lg shadow-blue-600/25 transition-all text-[15px]">
              {t('lp_hero_cta')}
              <svg className="w-4 h-4 transition-transform group-hover:translate-x-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7M5 12h15" />
              </svg>
            </button>
            <button onClick={() => onCTA('register')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 text-slate-700 dark:text-slate-200 font-medium px-5 py-3.5 rounded-xl text-[14px] transition-colors">
              <GoogleMark /> {t('lp_hero_google')}
            </button>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[12px] text-slate-500 dark:text-slate-500">
            {['lp_hero_badge1', 'lp_hero_badge2', 'lp_hero_badge3', 'lp_hero_badge4'].map((k) => (
              <span key={k} className="inline-flex items-center gap-1"><IconCheck /> {t(k)}</span>
            ))}
          </div>
        </div>

        {/* Product preview */}
        <div className="relative mt-12 sm:mt-16 max-w-5xl mx-auto">
          {/* Floating badge left */}
          <div className="hidden md:flex absolute -left-6 top-10 z-10 items-center gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 shadow-xl rise">
            <span className="w-2 h-2 rounded-full bg-emerald-500 pulse-dot" />
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">{t('lp_live_label')}</div>
              <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">€{live.toLocaleString('it-IT')}</div>
            </div>
          </div>
          {/* Floating badge right */}
          <div className="hidden md:flex absolute -right-4 top-24 z-10 items-start gap-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 shadow-xl rise" style={{ animationDelay: '.2s' }}>
            <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
              <svg className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 17l5-5-5-5M5 12h13" />
              </svg>
            </div>
            <div>
              <div className="text-[10px] text-slate-400 uppercase tracking-wider">CAGR 2y</div>
              <div className="text-sm font-bold tabular-nums text-slate-900 dark:text-white">+9,2%</div>
            </div>
          </div>

          <ProductPreview dark={tema === 'dark'} />
        </div>

        {/* Trust marquee */}
        <div className="mt-10 text-center">
          <p className="text-[11px] uppercase tracking-[0.18em] text-slate-400 mb-4">{t('lp_trust_label')}</p>
          <div className="relative overflow-hidden">
            <div className="flex gap-10 marquee-track" style={{ width: '200%' }}>
              {[...BROKERS, ...BROKERS].map((b, i) => (
                <span key={i} className="text-slate-400 dark:text-slate-600 font-semibold text-sm whitespace-nowrap">{b}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── TrustStats ───────────────────────────────────────────────────────────────

const TRUST_THRESHOLDS = {
  acquisti:        100,
  utenti:          50,
  stelle_github:   10,
  portafogli:      30,
  capitale_gestito: 100_000,
}

const STATS_CONFIG = [
  { key: 'capitale_gestito', labelKey: 'lp_trust_capitale_label', prefix: '€' },
  { key: 'utenti',           labelKey: 'lp_trust_investitori_label' },
  { key: 'acquisti',         labelKey: 'lp_trust_acquisti_label' },
  { key: 'portafogli',       labelKey: 'lp_trust_portafogli_label' },
  { key: 'stelle_github',    labelKey: 'lp_trust_stelle_label' },
]

function TrustStats({ t }) {
  const apiStats = useTrustStats()

  if (!apiStats) return null

  const visible = STATS_CONFIG
    .filter(({ key }) => apiStats[key] != null && apiStats[key] >= TRUST_THRESHOLDS[key])
    .map(({ key, labelKey, prefix = '' }) => ({
      val:   `${prefix}${formatStatValue(apiStats[key])}`,
      label: t(labelKey),
    }))

  if (visible.length === 0) return null

  return (
    <section className="border-y border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-10 flex flex-wrap justify-center gap-8 sm:gap-14">
        {visible.map((s) => (
          <div key={s.label} className="text-center">
            <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tabular-nums">{s.val}</div>
            <div className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">{s.label}</div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ── ProblemSection ───────────────────────────────────────────────────────────

function ProblemSection({ t }) {
  const before = ['lp_problem_before_1', 'lp_problem_before_2', 'lp_problem_before_3', 'lp_problem_before_4']
  const after  = ['lp_problem_after_1',  'lp_problem_after_2',  'lp_problem_after_3',  'lp_problem_after_4']
  return (
    <section className="py-20 sm:py-24 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-block text-[11px] font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{t('lp_problem_eyebrow')}</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white text-balance">{t('lp_problem_title')}</h2>
          <p className="mt-4 text-[16px] text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-balance">{t('lp_problem_sub')}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {/* Before */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xl">😵</span>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('lp_problem_before_title')}</h3>
            </div>
            <ul className="space-y-3">
              {before.map((k) => (
                <li key={k} className="flex items-start gap-2.5 text-[14px] text-slate-600 dark:text-slate-400">
                  <IconX /> {t(k)}
                </li>
              ))}
            </ul>
          </div>
          {/* After */}
          <div className="rounded-2xl border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-6">
            <div className="flex items-center gap-2 mb-5">
              <span className="text-xl">✨</span>
              <h3 className="font-bold text-slate-900 dark:text-white">{t('lp_problem_after_title')}</h3>
            </div>
            <ul className="space-y-3">
              {after.map((k) => (
                <li key={k} className="flex items-start gap-2.5 text-[14px] text-slate-700 dark:text-slate-300">
                  <IconCheck /> {t(k)}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── Features ─────────────────────────────────────────────────────────────────

function Features({ t }) {
  return (
    <section id="features" className="py-20 sm:py-24 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-block text-[11px] font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{t('lp_feat_eyebrow')}</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white text-balance">{t('lp_feat_title')}</h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {/* Big KPI card — spans 2 cols on lg */}
          <div className="lg:col-span-2 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 flex flex-col gap-4">
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{t('lp_feat_kpi_title')}</div>
              <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">{t('lp_feat_kpi_desc')}</p>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-auto">
              {[
                { l: 'ROI', v: '+18,4%', c: 'text-emerald-600 dark:text-emerald-400' },
                { l: 'CAGR', v: '+9,2%', c: 'text-blue-600 dark:text-blue-400' },
                { l: 'XIRR', v: '+11,1%', c: 'text-violet-600 dark:text-violet-400' },
                { l: 'Max DD', v: '−4,2%', c: 'text-rose-500' },
              ].map((it) => (
                <div key={it.l} className="rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-3">
                  <div className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">{it.l}</div>
                  <div className={`mt-0.5 text-xl font-extrabold tabular-nums ${it.c}`}>{it.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Scenari */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/10 dark:bg-blue-500/20 flex items-center justify-center text-xl">📈</div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{t('lp_feat_scenari_title')}</div>
              <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">{t('lp_feat_scenari_desc')}</p>
            </div>
            <div className="flex flex-col gap-2 mt-auto">
              {[
                { k: 'lp_feat_s_conservativo', pct: '4%', w: '40%', c: 'bg-slate-400' },
                { k: 'lp_feat_s_moderato',    pct: '7%', w: '65%', c: 'bg-blue-500' },
                { k: 'lp_feat_s_ottimistico', pct: '10%', w: '100%', c: 'bg-emerald-500' },
              ].map((it) => (
                <div key={it.k} className="flex items-center gap-2">
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 w-24 shrink-0">{t(it.k)}</div>
                  <div className="flex-1 h-1.5 rounded-full bg-slate-200 dark:bg-slate-800">
                    <div className={`h-1.5 rounded-full ${it.c}`} style={{ width: it.w }} />
                  </div>
                  <div className="text-[11px] font-semibold text-slate-600 dark:text-slate-300 w-8 text-right">{it.pct}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Storico */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600/10 dark:bg-emerald-500/20 flex items-center justify-center text-xl">🏦</div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{t('lp_feat_storico_title')}</div>
              <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">{t('lp_feat_storico_desc')}</p>
            </div>
            <div className="mt-auto flex gap-1.5">
              {['Degiro', 'Fineco', 'Directa'].map((b) => (
                <span key={b} className="px-2 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-medium">{b}</span>
              ))}
            </div>
          </div>

          {/* CSV */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 flex flex-col gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600/10 dark:bg-violet-500/20 flex items-center justify-center text-xl">🤖</div>
            <div>
              <div className="text-lg font-bold text-slate-900 dark:text-white">{t('lp_feat_csv_title')}</div>
              <p className="mt-1 text-[14px] text-slate-500 dark:text-slate-400">{t('lp_feat_csv_desc')}</p>
            </div>
            <div className="mt-auto flex items-center gap-2 text-[12px] text-slate-400">
              <span className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 font-mono text-[11px]">CSV → JSON</span>
              <span>in 2 min</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── AISection ────────────────────────────────────────────────────────────────

function AISection({ onCTA, t }) {
  const [typing, setTyping] = useState(true)
  useEffect(() => {
    const id = setTimeout(() => setTyping(false), 2000)
    return () => clearTimeout(id)
  }, [])

  const steps = [
    { n: '1', tk: 'lp_ai_step1', hk: 'lp_ai_step1_hint' },
    { n: '2', tk: 'lp_ai_step2', hk: 'lp_ai_step2_hint' },
    { n: '3', tk: 'lp_ai_step3', hk: 'lp_ai_step3_hint' },
  ]

  return (
    <section id="ai" className="py-20 sm:py-24 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left */}
          <div>
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 px-2.5 py-1 rounded-full mb-4">
              {t('lp_ai_pill')}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white leading-tight">
              {t('lp_ai_title1')}<br />{t('lp_ai_title2')}
            </h2>
            <p className="mt-4 text-[16px] text-slate-600 dark:text-slate-400 leading-relaxed">{t('lp_ai_sub')}</p>

            <ol className="mt-8 space-y-4">
              {steps.map((s) => (
                <li key={s.n} className="flex items-start gap-4">
                  <div className="w-8 h-8 rounded-full bg-blue-600 text-white font-bold text-sm flex items-center justify-center shrink-0">{s.n}</div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-white text-[15px]">{t(s.tk)}</div>
                    <div className="text-[12px] text-slate-400 mt-0.5">{t(s.hk)}</div>
                  </div>
                </li>
              ))}
            </ol>

            <p className="mt-6 text-[12px] text-slate-400 dark:text-slate-500">{t('lp_ai_privacy')}</p>

            <button onClick={() => onCTA('register')}
              className="mt-6 inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-5 py-3 rounded-xl text-[14px] transition-colors shadow-lg shadow-blue-600/25">
              {t('lp_ai_cta')}
            </button>
          </div>

          {/* Right — chat mock */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xl shadow-slate-900/10">
            {/* Chat header */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white text-xs font-bold">C</div>
              <div>
                <div className="text-[13px] font-semibold text-slate-900 dark:text-white">{t('lp_ai_chat_title')}</div>
                <div className="text-[10px] text-emerald-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 pulse-dot" /> {t('lp_ai_connected')}
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="p-4 space-y-3 min-h-[200px]">
              {/* User msg 1 */}
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white text-[13px] rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[80%]">
                  {t('lp_ai_msg1_user')}
                </div>
              </div>
              {/* AI reply 1 */}
              <div className="flex justify-start">
                <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[13px] rounded-2xl rounded-tl-sm px-3.5 py-2 max-w-[85%]">
                  {t('lp_ai_msg1_ai')}
                </div>
              </div>
              {/* User msg 2 */}
              <div className="flex justify-end">
                <div className="bg-blue-600 text-white text-[13px] rounded-2xl rounded-tr-sm px-3.5 py-2 max-w-[80%]">
                  {t('lp_ai_msg2_user')}
                </div>
              </div>
              {/* AI reply 2 or typing */}
              <div className="flex justify-start">
                {typing ? (
                  <div className="bg-slate-100 dark:bg-slate-800 rounded-2xl rounded-tl-sm px-4 py-3 flex gap-1">
                    <span className="dot w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span className="dot w-1.5 h-1.5 rounded-full bg-slate-400" />
                    <span className="dot w-1.5 h-1.5 rounded-full bg-slate-400" />
                  </div>
                ) : (
                  <div className="bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-[13px] rounded-2xl rounded-tl-sm px-3.5 py-2 max-w-[85%]">
                    {t('lp_ai_msg2_ai')}
                  </div>
                )}
              </div>
            </div>

            {/* Input area */}
            <div className="px-4 pb-4">
              <div className="flex items-center gap-2 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 bg-white dark:bg-slate-950">
                <span className="text-[13px] text-slate-400 flex-1">{t('lp_ai_placeholder')}</span>
                <div className="w-6 h-6 rounded-lg bg-blue-600 flex items-center justify-center">
                  <svg className="w-3 h-3 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

// ── HowItWorks ───────────────────────────────────────────────────────────────

function HowItWorks({ t }) {
  const steps = [
    { emoji: '🚀', n: '01', tk: 'lp_how_1_title', dk: 'lp_how_1_desc' },
    { emoji: '📊', n: '02', tk: 'lp_how_2_title', dk: 'lp_how_2_desc' },
    { emoji: '💡', n: '03', tk: 'lp_how_3_title', dk: 'lp_how_3_desc' },
  ]
  return (
    <section className="py-20 sm:py-24 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-block text-[11px] font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{t('lp_how_eyebrow')}</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white text-balance">{t('lp_how_title')}</h2>
        </div>
        <div className="grid sm:grid-cols-3 gap-6">
          {steps.map((s) => (
            <div key={s.n} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-6 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{s.emoji}</span>
                <span className="text-[11px] font-mono font-bold text-slate-300 dark:text-slate-700">{s.n}</span>
              </div>
              <div className="font-bold text-slate-900 dark:text-white text-[17px]">{t(s.tk)}</div>
              <p className="text-[14px] text-slate-500 dark:text-slate-400">{t(s.dk)}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Testimonials ─────────────────────────────────────────────────────────────

function Testimonials({ t }) {
  const items = [
    { qk: 'lp_testi_1', ak: 'lp_testi_1_author', rk: 'lp_testi_1_role', initials: 'MD' },
    { qk: 'lp_testi_2', ak: 'lp_testi_2_author', rk: 'lp_testi_2_role', initials: 'CP' },
    { qk: 'lp_testi_3', ak: 'lp_testi_3_author', rk: 'lp_testi_3_role', initials: 'LB' },
    { qk: 'lp_testi_4', ak: 'lp_testi_4_author', rk: 'lp_testi_4_role', initials: 'GM' },
  ]
  return (
    <section className="py-20 sm:py-24 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-block text-[11px] font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{t('lp_testi_eyebrow')}</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white text-balance">{t('lp_testi_title')}</h2>
        </div>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {items.map((item) => (
            <div key={item.initials} className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-5 flex flex-col gap-4">
              <div className="flex text-amber-400 text-sm">{'★★★★★'}</div>
              <p className="text-[14px] text-slate-600 dark:text-slate-400 leading-relaxed flex-1">"{t(item.qk)}"</p>
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white font-bold text-[11px]">
                  {item.initials}
                </div>
                <div>
                  <div className="text-[13px] font-semibold text-slate-900 dark:text-white">{t(item.ak)}</div>
                  <div className="text-[11px] text-slate-400">{t(item.rk)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Pricing ──────────────────────────────────────────────────────────────────

function Pricing({ onCTA, t }) {
  const freeFeats = [
    'lp_pricing_free_1', 'lp_pricing_free_2', 'lp_pricing_free_3',
    'lp_pricing_free_4', 'lp_pricing_free_5', 'lp_pricing_free_6', 'lp_pricing_free_7',
  ]
  const proFeats = [
    'lp_pricing_pro_1', 'lp_pricing_pro_2', 'lp_pricing_pro_3',
    'lp_pricing_pro_4', 'lp_pricing_pro_5', 'lp_pricing_pro_6',
  ]
  return (
    <section id="pricing" className="py-20 sm:py-24 bg-white dark:bg-slate-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-block text-[11px] font-semibold uppercase tracking-widest text-blue-600 dark:text-blue-400 mb-3">{t('lp_pricing_eyebrow')}</div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white text-balance">{t('lp_pricing_title')}</h2>
          <p className="mt-4 text-[16px] text-slate-600 dark:text-slate-400 max-w-2xl mx-auto text-balance">{t('lp_pricing_sub')}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Free */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-6 flex flex-col gap-5">
            <div>
              <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-slate-500 border border-slate-200 dark:border-slate-700 px-2.5 py-0.5 rounded-full mb-3">{t('lp_pricing_free_badge')}</span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">€0</div>
              <div className="text-[13px] text-slate-500 mt-1">{t('lp_pricing_free_note')}</div>
            </div>
            <ul className="space-y-2.5 flex-1">
              {freeFeats.map((k) => (
                <li key={k} className="flex items-start gap-2 text-[14px] text-slate-600 dark:text-slate-400">
                  <IconCheck /> {t(k)}
                </li>
              ))}
            </ul>
            <div>
              <button onClick={() => onCTA('register')}
                className="w-full bg-slate-900 dark:bg-white hover:bg-slate-700 dark:hover:bg-slate-100 text-white dark:text-slate-900 font-semibold py-3 rounded-xl text-[14px] transition-colors">
                {t('lp_pricing_free_cta')}
              </button>
              <p className="text-center text-[12px] text-slate-400 mt-2">{t('lp_pricing_free_no_card')}</p>
            </div>
          </div>

          {/* Pro */}
          <div className="rounded-2xl border border-blue-200 dark:border-blue-500/40 bg-blue-50 dark:bg-blue-500/10 p-6 flex flex-col gap-5 relative overflow-hidden">
            <div className="absolute top-3 right-3">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-500/20 px-2 py-0.5 rounded-full">{t('lp_pricing_pro_badge_top')}</span>
            </div>
            <div>
              <span className="inline-block text-[11px] font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-500/40 px-2.5 py-0.5 rounded-full mb-3">{t('lp_pricing_pro_badge')}</span>
              <div className="text-3xl font-extrabold text-slate-900 dark:text-white">€4,99<span className="text-lg font-normal text-slate-500">/mo</span></div>
              <div className="text-[13px] text-slate-500 mt-1">{t('lp_pricing_pro_note')}</div>
            </div>
            <ul className="space-y-2.5 flex-1">
              {proFeats.map((k) => (
                <li key={k} className="flex items-start gap-2 text-[14px] text-slate-700 dark:text-slate-300">
                  <IconCheck /> {t(k)}
                </li>
              ))}
            </ul>
            <div>
              <button disabled
                className="w-full bg-blue-600/40 text-white/70 font-semibold py-3 rounded-xl text-[14px] cursor-not-allowed">
                {t('lp_pricing_pro_cta')} — {t('lp_pricing_pro_soon')}
              </button>
              <p className="text-center text-[12px] text-slate-500 mt-2">{t('lp_pricing_pro_coming')}</p>
            </div>
          </div>
        </div>

        {/* Donate box */}
        <div className="mt-8 max-w-3xl mx-auto rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <span className="text-2xl">❤️</span>
          <div className="flex-1">
            <div className="font-semibold text-slate-900 dark:text-white text-[15px]">{t('lp_pricing_donate_title')}</div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 mt-0.5">{t('lp_pricing_donate_desc')}</p>
          </div>
          <a href={GITHUB_URL + '/../../sponsors/AlfonsoGangemi'} target="_blank" rel="noreferrer"
            className="shrink-0 inline-flex items-center gap-1.5 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600 px-4 py-2 rounded-xl text-[13px] font-medium transition-colors">
            <GithubIcon /> GitHub Sponsors
          </a>
        </div>
      </div>
    </section>
  )
}

// ── FAQ ──────────────────────────────────────────────────────────────────────

function FAQ({ t }) {
  const [open, setOpen] = useState(0)
  const items = [1, 2, 3, 4, 5, 6]
  return (
    <section id="faq" className="py-20 sm:py-24 bg-slate-50 dark:bg-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 dark:text-white text-center mb-10">{t('lp_faq_title')}</h2>
        <div className="space-y-2">
          {items.map((n) => {
            const isOpen = open === n
            return (
              <div key={n} className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
                <button
                  onClick={() => setOpen(isOpen ? null : n)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left">
                  <span className="font-semibold text-[15px] text-slate-900 dark:text-white">{t(`lp_faq_${n}_q`)}</span>
                  <IconChevron open={isOpen} />
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 text-[14px] text-slate-600 dark:text-slate-400 leading-relaxed">
                    {t(`lp_faq_${n}_a`)}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

// ── FinalCTA ─────────────────────────────────────────────────────────────────

function FinalCTA({ onCTA, t }) {
  return (
    <section className="py-20 sm:py-24 relative overflow-hidden bg-slate-900 dark:bg-slate-950">
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.25) 0%, transparent 65%)' }} />
      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white text-balance">{t('lp_final_title')}</h2>
        <p className="mt-4 text-[16px] text-slate-400 max-w-xl mx-auto text-balance">{t('lp_final_sub')}</p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button onClick={() => onCTA('register')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold px-7 py-3.5 rounded-xl shadow-lg shadow-blue-600/30 transition-colors text-[15px]">
            {t('lp_final_cta_register')}
          </button>
          <button onClick={() => onCTA('login')}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-white/10 hover:bg-white/15 text-white font-medium px-6 py-3.5 rounded-xl text-[14px] transition-colors border border-white/10">
            {t('lp_final_cta_login')}
          </button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[13px] text-slate-400">
          {['lp_final_badge1', 'lp_final_badge2', 'lp_final_badge3'].map((k) => (
            <span key={k} className="inline-flex items-center gap-1.5"><IconCheck /> {t(k)}</span>
          ))}
        </div>
      </div>
    </section>
  )
}

// ── Footer ───────────────────────────────────────────────────────────────────

function Footer({ onCTA, t }) {
  return (
    <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
          {/* Logo + tagline — spans 2 cols on sm */}
          <div className="col-span-2 sm:col-span-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-emerald-400 flex items-center justify-center text-white font-black text-sm">E</div>
              <span className="font-bold text-slate-900 dark:text-white tracking-tight">ETF Lens</span>
            </div>
            <p className="text-[13px] text-slate-500 dark:text-slate-400 max-w-xs">{t('lp_footer_tagline')}</p>
            <a href={GITHUB_URL} target="_blank" rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
              <GithubIcon /> GitHub
            </a>
          </div>

          {/* Prodotto */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">{t('lp_footer_prodotto')}</div>
            <ul className="space-y-2">
              {[
                { label: t('lp_footer_dashboard'), action: () => onCTA('register') },
                { label: t('lp_footer_ai_int'), href: '#ai' },
                { label: t('lp_footer_roadmap'), href: GITHUB_URL + '/projects' },
                { label: t('lp_footer_changelog'), href: GITHUB_URL + '/releases' },
              ].map((it) => (
                <li key={it.label}>
                  {it.href ? (
                    <a href={it.href} target={it.href.startsWith('http') ? '_blank' : undefined} rel="noreferrer"
                      className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                      {it.label}
                    </a>
                  ) : (
                    <button onClick={it.action}
                      className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                      {it.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>

          {/* Risorse */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-widest text-slate-400 mb-3">{t('lp_footer_risorse')}</div>
            <ul className="space-y-2">
              {[
                { label: t('lp_footer_docs'), href: GITHUB_URL + '/wiki' },
                { label: t('lp_footer_community'), href: GITHUB_URL + '/discussions' },
                { label: t('lp_footer_lnk_privacy'), action: () => onCTA('privacy') },
                { label: t('lp_footer_lnk_termini'), action: () => onCTA('termini') },
              ].map((it) => (
                <li key={it.label}>
                  {it.href ? (
                    <a href={it.href} target="_blank" rel="noreferrer"
                      className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                      {it.label}
                    </a>
                  ) : (
                    <button onClick={it.action}
                      className="text-[13px] text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors">
                      {it.label}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-200 dark:border-slate-800 text-center text-[12px] text-slate-400">
          {t('lp_footer_copyright')}
        </div>
      </div>
    </footer>
  )
}

// ── StickyMobileCTA ──────────────────────────────────────────────────────────

function StickyMobileCTA({ onCTA, t }) {
  const [show, setShow] = useState(false)
  useEffect(() => {
    const onScroll = () => setShow(window.scrollY > 600)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  return (
    <div className={`md:hidden fixed bottom-3 left-3 right-3 z-50 transition-all duration-300 ${show ? 'translate-y-0 opacity-100' : 'translate-y-24 opacity-0 pointer-events-none'}`}>
      <div className="rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-2xl p-3 flex items-center gap-3">
        <div className="flex-1">
          <div className="text-[13px] font-semibold">{t('lp_mobile_pronto')}</div>
          <div className="text-[11px] opacity-70">{t('lp_mobile_sub')}</div>
        </div>
        <button onClick={() => onCTA('register')}
          className="bg-blue-600 text-white font-semibold px-4 py-2 rounded-xl text-[13px]">
          {t('lp_mobile_btn')}
        </button>
      </div>
    </div>
  )
}

// ── LandingPage (root export) ────────────────────────────────────────────────

export default function LandingPage({ onCTA }) {
  const { t } = useLocale()
  const { tema } = useTheme()

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300">
      <Header onCTA={onCTA} t={t} />
      <Hero onCTA={onCTA} t={t} tema={tema} />
      <TrustStats t={t} />
      <ProblemSection t={t} />
      <Features t={t} />
      <AISection onCTA={onCTA} t={t} />
      <HowItWorks t={t} />
      <Testimonials t={t} />
      <Pricing onCTA={onCTA} t={t} />
      <FAQ t={t} />
      <FinalCTA onCTA={onCTA} t={t} />
      <Footer onCTA={onCTA} t={t} />
      <StickyMobileCTA onCTA={onCTA} t={t} />
    </div>
  )
}
