import { useState } from 'react'
import {
  totaleInvestito,
  valoreAttuale,
  calcolaROI,
  calcolaRendimentoNetto,
  calcolaDurataM,
  calcolaCAGR,
} from '../utils/calcoli'

function fmt(n, dec = 2) {
  return n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function Badge({ val }) {
  const pos = val >= 0
  return (
    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${pos ? 'bg-green-900/50 text-green-400' : 'bg-red-900/50 text-red-400'}`}>
      {pos ? '+' : ''}{fmt(val)}%
    </span>
  )
}


export default function ETFCard({ etf, onModifica, onArchivia, onAggiornaPrezzo, onRimuoviAcquisto }) {
  const [espanso, setEspanso] = useState(false)
  const [syncStato, setSyncStato] = useState('idle') // 'idle' | 'loading' | 'error'

  async function aggiornaPrezzoAPI() {
    if (!etf.isin) return
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
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-4">
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

        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            onClick={() => onModifica(etf.id)}
            className="text-slate-500 hover:text-blue-400 transition-colors p-1.5 rounded-lg hover:bg-slate-700"
            title="Modifica ETF"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={() => onArchivia(etf.id)}
            className="text-slate-500 hover:text-amber-400 transition-colors p-1.5 rounded-lg hover:bg-slate-700"
            title="Archivia ETF"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </button>
        </div>
      </div>

      {/* Prezzo + PAC */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-slate-400">Prezzo corrente</p>
          <div className="flex items-center gap-1.5">
            <p className="text-xl font-semibold text-white">€{fmt(etf.prezzoCorrente)}</p>
            <button
              onClick={aggiornaPrezzoAPI}
              disabled={syncStato === 'loading' || !etf.isin}
              title={
                !etf.isin
                  ? 'ISIN non impostato'
                  : syncStato === 'error'
                    ? 'Aggiornamento fallito'
                    : 'Aggiorna prezzo da JustETF'
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
              <span className="text-xs text-red-400">Errore</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs text-slate-400">PAC mensile</p>
          <p className="text-lg font-semibold text-white">€{fmt(etf.importoFisso, 0)}</p>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="bg-slate-900/50 rounded-xl p-3">
          <p className="text-xs text-slate-400">Investito</p>
          <p className="font-semibold text-white">€{fmt(inv, 0)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-3">
          <p className="text-xs text-slate-400">Valore</p>
          <p className="font-semibold text-white">€{fmt(val, 0)}</p>
        </div>
        <div className="bg-slate-900/50 rounded-xl p-3">
          <p className="text-xs text-slate-400">Quote</p>
          <p className="font-semibold text-white">{fmt(etf.acquisti.reduce((s, a) => s + a.quoteFrazionate, 0), 4)}</p>
        </div>
      </div>

      {/* Badge ROI + CAGR */}
      <div className="flex items-center gap-2 flex-wrap">
        <Badge val={roi} />
        <span className="text-xs text-slate-400">ROI</span>
        <span className="text-xs text-slate-500">|</span>
        <span className="text-xs text-slate-300">
          Netto: <span className={netto >= 0 ? 'text-green-400' : 'text-red-400'}>
            {netto >= 0 ? '+' : ''}€{fmt(netto, 0)}
          </span>
        </span>
        {durataM >= 1 && (
          <>
            <span className="text-xs text-slate-500">|</span>
            <span className="text-xs text-slate-300">CAGR: <span className="text-blue-300">{fmt(cagr)}%</span></span>
          </>
        )}
      </div>

      {/* Lista acquisti */}
      <div>
        <button
          onClick={() => setEspanso(e => !e)}
          className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
        >
          {espanso ? '▲' : '▼'} {etf.acquisti.length} acquist{etf.acquisti.length === 1 ? 'o' : 'i'} · {durataM} mes{durataM === 1 ? 'e' : 'i'}
        </button>

        {espanso && (
          <div className="mt-2 space-y-1 max-h-48 overflow-y-auto">
            {[...etf.acquisti].sort((a, b) => b.data.localeCompare(a.data)).map(acq => (
              <div key={acq.id} className="flex items-center justify-between text-xs bg-slate-900/50 rounded-lg px-3 py-2">
                <span className="text-slate-400">{acq.data}</span>
                <span className="text-white">€{fmt(acq.importoInvestito, 0)}</span>
                <span className="text-slate-400">@ €{fmt(acq.prezzoUnitario)}</span>
                <span className="text-blue-300">{fmt(acq.quoteFrazionate, 4)} q.</span>
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
