import { useRef, useState } from 'react'
import { useLocale } from '../hooks/useLocale'
import {
  totaleInvestito,
  valoreAttuale,
  calcolaROI,
  calcolaRendimentoNetto,
  calcolaDurataM,
  calcolaCAGR,
} from '../utils/calcoli'

function fmt(n, dec = 2) {
  return new Intl.NumberFormat('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec }).format(n)
}

function Badge({ val }) {
  const pos = val >= 0
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pos ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
      {pos ? '+' : ''}{fmt(val)}%
    </span>
  )
}


const COOLDOWN_MS = 30_000

export default function ETFCard({ etf, onModifica, onArchivia, onAggiornaPrezzo, onRimuoviAcquisto, archivaDisabilitato, brokerAcquisti = [], attenuata = false, privacyMode = false }) {
  const { t } = useLocale()
  const pv = (f) => privacyMode ? '••••' : f
  const [espanso, setEspanso] = useState(false)
  const [syncStato, setSyncStato] = useState('idle') // 'idle' | 'loading' | 'error'
  const [cooldownAttivo, setCooldownAttivo] = useState(false)
  const lastSyncAt = useRef(0)

  async function aggiornaPrezzoAPI() {
    if (!etf.isin) return
    if (Date.now() - lastSyncAt.current < COOLDOWN_MS) return
    setSyncStato('loading')
    const params = new URLSearchParams({ proxyPath: `api/etfs/${etf.isin}/quote`, locale: 'it', currency: 'EUR', isin: etf.isin })
    const url = `/api/justetf-proxy?${params}`
    console.log('[proxy] → GET', url)
    try {
      const res = await fetch(url)
      console.log('[proxy] ← status:', res.status, '| ok:', res.ok)
      console.log('[proxy]    headers:', Object.fromEntries(res.headers.entries()))
      const text = await res.text()
      console.log('[proxy]    body (raw):', text.slice(0, 500))
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = JSON.parse(text)
      console.log('[proxy]    data:', data)
      const prezzo = data?.latestQuote?.raw
      if (!prezzo) throw new Error('latestQuote.raw assente')
      if (isNaN(prezzo) || prezzo <= 0) throw new Error(`prezzo non valido: ${prezzo}`)
      onAggiornaPrezzo(etf.id, prezzo)
      setSyncStato('idle')
    } catch (err) {
      console.error('[proxy] ERRORE:', err.message)
      setSyncStato('error')
      setTimeout(() => setSyncStato('idle'), 3000)
    } finally {
      lastSyncAt.current = Date.now()
      setCooldownAttivo(true)
      setTimeout(() => setCooldownAttivo(false), COOLDOWN_MS)
    }
  }

  const inv = totaleInvestito(etf.acquisti)
  const val = valoreAttuale(etf.acquisti, etf.prezzoCorrente)
  const roi = calcolaROI(etf.acquisti, etf.prezzoCorrente)
  const netto = calcolaRendimentoNetto(etf.acquisti, etf.prezzoCorrente)
  const durataM = calcolaDurataM(etf.acquisti)
  const cagr = calcolaCAGR(etf.acquisti, etf.prezzoCorrente)

  const justEtfUrl = `https://www.justetf.com/it/etf-profile.html?isin=${etf.isin}#panoramica`

  return (
    <div className={`border rounded-2xl p-5 flex flex-col gap-4 ${attenuata ? 'bg-slate-800/40 border-slate-800' : 'bg-slate-800 border-slate-700'}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-bold text-lg text-white leading-tight truncate">{etf.nome}</p>
          {etf.emittente && (
            <p className="text-xs text-slate-400 mt-0.5">{etf.emittente}</p>
          )}
          <a
            href={justEtfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300 font-mono transition-colors mt-0.5"
          >
            {etf.isin}
            <svg className="w-3 h-3 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>

        <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
          <div className="flex items-center gap-1">
            <button
              onClick={() => onModifica(etf.id)}
              className="text-slate-500 hover:text-blue-400 transition-colors p-1.5 rounded-lg hover:bg-slate-700"
              title={t('etf_modifica_title')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={() => !archivaDisabilitato && onArchivia(etf.id)}
              disabled={archivaDisabilitato}
              className={`transition-colors p-1.5 rounded-lg ${archivaDisabilitato ? 'text-slate-700 cursor-not-allowed' : 'text-slate-500 hover:text-amber-400 hover:bg-slate-700'}`}
              title={archivaDisabilitato ? t('etf_archivia_limite_title') : t('etf_archivia_title')}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </button>
          </div>
          {brokerAcquisti.length > 0 && (
            <div className="flex items-center gap-1.5 px-1.5">
              {brokerAcquisti.map(b => (
                <span
                  key={b.id}
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0 cursor-default"
                  style={{ backgroundColor: b.colore }}
                  title={b.nome}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Prezzo + PAC */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">{t('prezzo_corrente')}</p>
          <div className="flex items-center gap-1.5">
            <p className="text-xl font-semibold text-white">{pv(`€${fmt(etf.prezzoCorrente)}`)}</p>
            <button
              onClick={aggiornaPrezzoAPI}
              disabled={syncStato === 'loading' || !etf.isin || cooldownAttivo}
              title={
                !etf.isin
                  ? t('etf_isin_mancante')
                  : cooldownAttivo
                    ? t('etf_cooldown')
                    : syncStato === 'error'
                      ? t('etf_sync_error')
                      : t('etf_sync_update')
              }
              className={`p-1 rounded-md transition-colors disabled:cursor-not-allowed ${
                syncStato === 'error'
                  ? 'text-red-400'
                  : syncStato === 'loading'
                    ? 'text-blue-400'
                    : 'text-slate-500 hover:text-blue-400 hover:bg-slate-700'
              }`}
            >
              <svg
                className={`w-3.5 h-3.5 ${syncStato === 'loading' ? 'animate-spin' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            {syncStato === 'error' && (
              <span className="text-xs text-red-400">{t('etf_errore')}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">{t('pac_mensile')}</p>
          <p className="text-lg font-semibold text-white">{pv(`€${fmt(etf.importoFisso, 0)}`)}</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-slate-900/50 rounded-xl p-3">
          <p className="text-xs text-slate-400">{t('investito')}</p>
          <p className="font-semibold text-white">{pv(`€${fmt(inv, 0)}`)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-3">
          <p className="text-xs text-slate-400">{t('valore')}</p>
          <p className="font-semibold text-white">{pv(`€${fmt(val, 0)}`)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-3">
          <p className="text-xs text-slate-400">{t('quote')}</p>
          <p className="font-semibold text-white">{pv(fmt(etf.acquisti.reduce((s, a) => s + a.quoteFrazionate, 0), 4))}</p>
        </div>
      </div>

      {/* Badge ROI + CAGR */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge val={roi} />
        <span className="text-xs text-slate-400">ROI</span>
        <span className="text-xs text-slate-500">|</span>
        <span className="text-xs text-slate-300">
          {t('netto')}: <span className={netto >= 0 ? 'text-green-400' : 'text-red-400'}>
            {pv(`${netto >= 0 ? '+' : ''}€${fmt(netto, 0)}`)}
          </span>
        </span>
        {durataM >= 1 && (
          <>
            <span className="text-xs text-slate-500">|</span>
            <span className="text-xs text-slate-300">CAGR: <span className="text-blue-300">{`${fmt(cagr)}%`}</span></span>
          </>
        )}
      </div>

      {/* Lista acquisti */}
      <div>
        <button
          onClick={() => setEspanso(e => !e)}
          className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          {espanso ? '▲' : '▼'} {etf.acquisti.length} {etf.acquisti.length === 1 ? t('acq_s') : t('acq_p')} · {durataM} {durataM === 1 ? t('dur_mese_s') : t('dur_mese_p')}
        </button>

        {espanso && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {[...etf.acquisti].sort((a, b) => b.data.localeCompare(a.data)).map(acq => (
              <div key={acq.id} className="flex items-center justify-between text-xs bg-slate-900/50 rounded-lg px-3 py-2">
                <span className="text-slate-400">{acq.data}</span>
                <span className="text-white">{pv(`€${fmt(acq.importoInvestito, 0)}`)}</span>
                {acq.fee > 0 && (
                  <span className="text-amber-400">{pv(`+€${fmt(acq.fee, 2)} fee`)}</span>
                )}
                <span className="text-slate-400">{`@ €${fmt(acq.prezzoUnitario)}`}</span>
                <span className="text-blue-300">{pv(`${fmt(acq.quoteFrazionate, 4)} q.`)}</span>
                <button
                  onClick={() => onRimuoviAcquisto(etf.id, acq.id)}
                  className="text-slate-600 hover:text-red-400 transition-colors ml-2"
                >✕</button>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
