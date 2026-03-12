import { useEffect, useRef, useState } from 'react'
import { usePortafoglio } from '../hooks/usePortafoglio'
import ETFCard from './ETFCard'
import AcquistoForm from './AcquistoForm'
import GraficoPortafoglio from './GraficoPortafoglio'
import Indicatori from './Indicatori'
import TabellaProiezione from './TabellaProiezione'

// ── Componenti base ────────────────────────────────────────────────

function Modal({ titolo, onChiudi, children, wide }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className={`bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full shadow-2xl ${wide ? 'max-w-lg' : 'max-w-md'}`}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">{titolo}</h2>
          <button onClick={onChiudi} className="text-slate-400 hover:text-white transition-colors text-xl">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

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

// ── Modal modifica ETF ─────────────────────────────────────────────

function ModificaETFModal({ etf, onSalva, onChiudi }) {
  const [nome, setNome] = useState(etf.nome)
  const [emittente, setEmittente] = useState(etf.emittente || '')
  const [importoFisso, setImportoFisso] = useState(String(etf.importoFisso))
  const [prezzoCorrente, setPrezzoCorrente] = useState(String(etf.prezzoCorrente))

  function handleSubmit(e) {
    e.preventDefault()
    if (!nome.trim()) return
    onSalva(etf.id, {
      nome: nome.trim(),
      emittente: emittente.trim(),
      importoFisso: Number(importoFisso) || 0,
      prezzoCorrente: parseFloat(prezzoCorrente.replace(',', '.')) || 0,
    })
    onChiudi()
  }

  return (
    <Modal titolo="Modifica ETF" onChiudi={onChiudi}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* ISIN in sola lettura */}
        <div>
          <p className="text-xs text-slate-400 mb-1">ISIN</p>
          <p className="text-sm font-mono text-slate-300 bg-slate-900/50 rounded-lg px-3 py-2">{etf.isin}</p>
        </div>
        <Input label="Nome ETF" value={nome} onChange={e => setNome(e.target.value)} required />
        <Input label="Emittente" value={emittente} onChange={e => setEmittente(e.target.value)} placeholder="iShares, Vanguard, Amundi…" />
        <Input label="Importo PAC mensile (€)" type="number" step="0.01" min="0" value={importoFisso} onChange={e => setImportoFisso(e.target.value)} />
        <Input label="Prezzo corrente (€)" type="number" step="0.0001" min="0" value={prezzoCorrente} onChange={e => setPrezzoCorrente(e.target.value)} />
        <div className="flex gap-3 pt-2">
          <button type="button" onClick={onChiudi} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2.5 text-sm transition-colors">Annulla</button>
          <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">Salva</button>
        </div>
      </form>
    </Modal>
  )
}

// ── Chip scenario con rendimento editabile ─────────────────────────

function ScenarioChip({ scenario, onAggiorna, onRimuovi }) {
  const [editRend, setEditRend] = useState(false)
  const [nuovoRend, setNuovoRend] = useState('')

  function apriEdit() {
    setNuovoRend(String((scenario.rendimentoAnnuo * 100).toFixed(1)))
    setEditRend(true)
  }

  function salvaRend() {
    const r = parseFloat(nuovoRend.replace(',', '.'))
    if (!isNaN(r) && r > 0) onAggiorna(scenario.id, { rendimentoAnnuo: r / 100 })
    setEditRend(false)
  }

  return (
    <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2">
      <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: scenario.colore }} />
      <span className="text-sm text-white">{scenario.nome}</span>

      {editRend ? (
        <div className="flex items-center gap-1">
          <input
            type="number"
            step="0.1"
            min="0"
            max="100"
            value={nuovoRend}
            onChange={e => setNuovoRend(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') salvaRend()
              if (e.key === 'Escape') setEditRend(false)
            }}
            className="w-16 bg-slate-700 border border-slate-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-blue-400"
            autoFocus
          />
          <span className="text-xs text-slate-400">%</span>
          <button onClick={salvaRend} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">✓</button>
          <button onClick={() => setEditRend(false)} className="text-xs text-slate-500 hover:text-white transition-colors">✕</button>
        </div>
      ) : (
        <button
          onClick={apriEdit}
          className="text-xs text-slate-400 hover:text-white transition-colors underline decoration-dotted underline-offset-2"
          title="Modifica rendimento"
        >
          {(scenario.rendimentoAnnuo * 100).toFixed(1)}%/anno
        </button>
      )}

      <button
        onClick={() => onRimuovi(scenario.id)}
        className="text-slate-600 hover:text-red-400 transition-colors text-sm ml-1"
      >✕</button>
    </div>
  )
}

// ── Riga broker con nome e colore editabili inline ─────────────────

function BrokerRow({ broker: b, onAggiorna, onElimina }) {
  const [editing, setEditing] = useState(false)
  const [nomeTemp, setNomeTemp] = useState(b.nome)

  function iniziaEdit() {
    setNomeTemp(b.nome)
    setEditing(true)
  }

  function salva() {
    const nome = nomeTemp.trim()
    if (nome && nome !== b.nome) onAggiorna(b.id, { nome })
    setEditing(false)
  }

  function annulla() {
    setNomeTemp(b.nome)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2 py-1">
      {/* Pallino cliccabile per cambiare colore */}
      <label
        className="flex-shrink-0 w-4 h-4 rounded-full cursor-pointer relative overflow-hidden"
        style={{ backgroundColor: b.colore }}
        title="Cambia colore"
      >
        <input
          type="color"
          value={b.colore}
          onChange={e => onAggiorna(b.id, { colore: e.target.value })}
          className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
        />
      </label>

      {/* Nome editabile inline */}
      {editing ? (
        <input
          value={nomeTemp}
          onChange={e => setNomeTemp(e.target.value)}
          onBlur={salva}
          onKeyDown={e => {
            if (e.key === 'Enter') salva()
            if (e.key === 'Escape') annulla()
          }}
          className="flex-1 bg-slate-700 border border-slate-500 rounded px-2 py-0.5 text-sm text-white focus:outline-none focus:border-blue-400"
          autoFocus
        />
      ) : (
        <span
          onClick={iniziaEdit}
          className={`flex-1 text-sm cursor-pointer hover:text-blue-300 transition-colors ${b.archiviato ? 'text-white/50' : 'text-white'}`}
          title="Clicca per rinominare"
        >
          {b.nome}
          {b.archiviato && <span className="ml-1 text-xs text-amber-400">(archiviato)</span>}
        </span>
      )}

      <button
        onClick={() => onAggiorna(b.id, { archiviato: !b.archiviato })}
        className="text-xs text-slate-400 hover:text-white transition-colors flex-shrink-0"
      >
        {b.archiviato ? 'Ripristina' : 'Archivia'}
      </button>
      <button
        onClick={() => onElimina(b.id)}
        className="text-xs text-red-500 hover:text-red-300 transition-colors flex-shrink-0"
      >
        Elimina
      </button>
    </div>
  )
}

// ── Gestore Broker Modal ───────────────────────────────────────────

function GestoreBrokerModal({ broker, onAggiungi, onAggiorna, onElimina, onChiudi }) {
  const [nomeBroker, setNomeBroker] = useState('')
  const [coloreBroker, setColoreBroker] = useState('#6366f1')

  async function handleAggiungi(e) {
    e.preventDefault()
    if (!nomeBroker.trim()) return
    await onAggiungi(nomeBroker.trim(), coloreBroker)
    setNomeBroker('')
    setColoreBroker('#6366f1')
  }

  return (
    <Modal titolo="Gestione broker" onChiudi={onChiudi} wide>
      <div className="space-y-4">
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {broker.map(b => (
            <BrokerRow
              key={b.id}
              broker={b}
              onAggiorna={onAggiorna}
              onElimina={onElimina}
            />
          ))}
        </div>
        <form onSubmit={handleAggiungi} className="border-t border-slate-700 pt-4 space-y-3">
          <p className="text-xs text-slate-400 font-medium">Nuovo broker</p>
          <div className="flex gap-2">
            <input
              value={nomeBroker}
              onChange={e => setNomeBroker(e.target.value)}
              placeholder="Degiro, Trade Republic…"
              className="flex-1 bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
            />
            <input
              type="color"
              value={coloreBroker}
              onChange={e => setColoreBroker(e.target.value)}
              className="h-9 w-12 rounded-lg border border-slate-600 bg-slate-700 cursor-pointer"
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2 text-sm font-medium transition-colors"
          >
            Aggiungi broker
          </button>
        </form>
      </div>
    </Modal>
  )
}

// ── Helpers ────────────────────────────────────────────────────────

function ultimaDataAcquisto(etf) {
  if (!etf.acquisti.length) return ''
  return etf.acquisti.reduce((max, a) => a.data > max ? a.data : max, '')
}

// ── Dashboard principale ───────────────────────────────────────────

export default function Dashboard({ user, onSignOut }) {
  const port = usePortafoglio(user)

  const [modalNuovoETF, setModalNuovoETF] = useState(false)
  const [etfDaModificare, setEtfDaModificare] = useState(null)
  const [modalAcquisto, setModalAcquisto] = useState(false)
  const [modalScenario, setModalScenario] = useState(false)
  const [mostraArchiviati, setMostraArchiviati] = useState(false)
  const [errImport, setErrImport] = useState('')
  const [modalGestoreBroker, setModalGestoreBroker] = useState(false)
  const [dropdownAperto, setDropdownAperto] = useState(false)
  const dropdownRef = useRef(null)
  const [aggStato, setAggStato] = useState('idle') // 'idle' | 'running'
  const [aggErroriIsin, setAggErroriIsin] = useState([])
  const [globalCooldownSec, setGlobalCooldownSec] = useState(0)
  const lastSyncByEtf = useRef({})

  useEffect(() => {
    if (!dropdownAperto) return
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownAperto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [dropdownAperto])

  useEffect(() => {
    if (globalCooldownSec <= 0) return
    const t = setTimeout(() => setGlobalCooldownSec(s => s - 1), 1000)
    return () => clearTimeout(t)
  }, [globalCooldownSec])

  function handleAggiornaPrezzo(id, prezzo) {
    lastSyncByEtf.current[id] = Date.now()
    const etfItem = port.etf.find(e => e.id === id)
    port.aggiornaETF(id, etfItem?.isin, { prezzoCorrente: prezzo })
  }

  async function aggiornaTuttiIPrezzi() {
    if (aggStato === 'running' || globalCooldownSec > 0) return
    const daAggiornare = etfAttivi.filter(e => e.isin)
    if (daAggiornare.length === 0) return
    setAggStato('running')
    setAggErroriIsin([])
    const ora = Date.now()
    const SKIP_MS = 30_000
    const DELAY_MS = 1_500
    const errori = []
    for (let i = 0; i < daAggiornare.length; i++) {
      const etf = daAggiornare[i]
      if (ora - (lastSyncByEtf.current[etf.id] ?? 0) < SKIP_MS) continue
      try {
        const params = new URLSearchParams({ proxyPath: `api/etfs/${etf.isin}/quote`, locale: 'it', currency: 'EUR', isin: etf.isin })
        const res = await fetch(`/api/justetf-proxy?${params}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        const prezzo = data?.latestQuote?.raw
        if (!prezzo || isNaN(prezzo) || prezzo <= 0) throw new Error('prezzo non valido')
        handleAggiornaPrezzo(etf.id, prezzo)
      } catch {
        errori.push(etf.isin)
      }
      if (i < daAggiornare.length - 1) await new Promise(r => setTimeout(r, DELAY_MS))
    }
    setAggErroriIsin(errori)
    setAggStato('idle')
    setGlobalCooldownSec(60)
  }

  // Form nuovo ETF
  const [nomeETF, setNomeETF] = useState('')
  const [isinETF, setIsinETF] = useState('')
  const [emittenteETF, setEmittenteETF] = useState('')
  const [importoETF, setImportoETF] = useState('')

  // Form nuovo scenario
  const [nomeScen, setNomeScen] = useState('')
  const [rendScen, setRendScen] = useState('')
  const [coloreScen, setColoreScen] = useState('#6366f1')

  if (port.loading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  const brokerAttivi = port.broker.filter(b => !b.archiviato)

  const etfFiltrate = (port.brokerFiltro.length === 0
    ? port.etf
    : port.etf.map(e => ({
        ...e,
        acquisti: e.acquisti.filter(a => port.brokerFiltro.includes(a.brokerId)),
      }))
  ).sort((a, b) => {
    const d = ultimaDataAcquisto(b).localeCompare(ultimaDataAcquisto(a))
    return d !== 0 ? d : a.isin.localeCompare(b.isin)
  })
  const etfAttivi = etfFiltrate.filter(e => !e.archiviato)
  const etfArchiviati = etfFiltrate.filter(e => e.archiviato)

  function handleAggiungiETF(e) {
    e.preventDefault()
    if (!nomeETF.trim()) return
    port.aggiungiETF(nomeETF.trim(), isinETF.trim().toUpperCase(), emittenteETF.trim(), importoETF || 0)
    setNomeETF(''); setIsinETF(''); setEmittenteETF(''); setImportoETF('')
    setModalNuovoETF(false)
  }

  function handleAggiungiScenario(e) {
    e.preventDefault()
    const r = parseFloat(rendScen.replace(',', '.')) / 100
    if (!nomeScen.trim() || isNaN(r)) return
    port.aggiungiScenario(nomeScen.trim(), r, coloreScen)
    setNomeScen(''); setRendScen('')
    setModalScenario(false)
  }

  async function handleImport(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErrImport('')
    try {
      await port.importJSON(file)
    } catch {
      setErrImport('File non valido. Importazione annullata.')
    }
    e.target.value = ''
  }

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100">
      {/* Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-bold text-white tracking-tight">PAC Dashboard</h1>

          {/* Menu utente */}
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setDropdownAperto(v => !v)}
              className="text-xs text-slate-400 hover:text-white transition-colors flex items-center gap-1"
            >
              {user.email}
              <svg className={`w-3 h-3 transition-transform ${dropdownAperto ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {dropdownAperto && (
              <div className="absolute right-0 top-full mt-1 w-44 bg-slate-800 border border-slate-700 rounded-xl shadow-xl z-50 overflow-hidden">
                <button
                  onClick={() => { port.exportJSON(); setDropdownAperto(false) }}
                  className="w-full text-left text-xs text-slate-200 hover:bg-slate-700 px-4 py-2.5 transition-colors"
                >
                  Esporta dati
                </button>
                <label className="w-full text-left text-xs text-slate-200 hover:bg-slate-700 px-4 py-2.5 transition-colors cursor-pointer block">
                  Importa dati
                  <input type="file" accept=".json" onChange={e => { handleImport(e); setDropdownAperto(false) }} className="hidden" />
                </label>
                <button
                  onClick={onSignOut}
                  className="w-full text-left text-xs text-red-400 hover:bg-slate-700 px-4 py-2.5 transition-colors border-t border-slate-700"
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>
        {(errImport || port.errore) && (
          <div className="max-w-7xl mx-auto px-4 pb-2 flex items-center justify-between">
            <p className="text-xs text-red-400">{errImport || port.errore}</p>
            <button
              onClick={() => { setErrImport(''); port.setErrore('') }}
              className="text-slate-500 hover:text-white text-xs ml-4"
            >✕</button>
          </div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* Filtro broker + gestione */}
        {port.broker.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {port.broker.length > 1 && (
              <>
                <span className="text-xs text-slate-400">Broker:</span>
                <button
                  onClick={() => port.setBrokerFiltro([])}
                  className={`text-xs px-3 py-1 rounded-full border transition-colors ${
                    port.brokerFiltro.length === 0
                      ? 'bg-blue-600 border-blue-500 text-white'
                      : 'border-slate-600 text-slate-400 hover:text-white'
                  }`}
                >Tutti</button>
                {port.broker.map(b => (
                  <button
                    key={b.id}
                    onClick={() => {
                      const sel = port.brokerFiltro.includes(b.id)
                        ? port.brokerFiltro.filter(id => id !== b.id)
                        : [...port.brokerFiltro, b.id]
                      port.setBrokerFiltro(sel)
                    }}
                    className={`text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
                      port.brokerFiltro.includes(b.id)
                        ? 'border-transparent text-white'
                        : 'border-slate-600 text-slate-400 hover:text-white'
                    } ${b.archiviato ? 'opacity-50' : ''}`}
                    style={port.brokerFiltro.includes(b.id) ? { backgroundColor: b.colore } : {}}
                  >
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: b.colore }} />
                    {b.nome}
                    {b.archiviato && <span className="opacity-70">(arch.)</span>}
                  </button>
                ))}
              </>
            )}
            <button
              onClick={() => setModalGestoreBroker(true)}
              className="text-slate-500 hover:text-slate-300 transition-colors"
              title="Gestisci broker"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0a1.532 1.532 0 01-2.286.948c-1.372-.836-2.942.734-2.106 2.106.54.886.061 2.042-.947 2.287-1.561.379-1.561 2.6 0 2.978a1.532 1.532 0 01.947 2.287c-.836 1.372.734 2.942 2.106 2.106a1.532 1.532 0 012.287.947c.379 1.561 2.6 1.561 2.978 0a1.533 1.533 0 012.287-.947c1.372.836 2.942-.734 2.106-2.106a1.533 1.533 0 01.947-2.287c1.561-.379 1.561-2.6 0-2.978a1.532 1.532 0 01-.947-2.287c.836-1.372-.734-2.942-2.106-2.106a1.532 1.532 0 01-2.287-.947zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        )}

        {/* Indicatori (solo ETF attivi) */}
        {etfAttivi.length > 0 && <Indicatori etfList={etfAttivi} />}

        {/* Grafico (solo ETF attivi) */}
        {etfAttivi.length > 0 && (
          <div className="space-y-3">
            
            <GraficoPortafoglio
              etfList={etfFiltrate}
              etfAttivi={etfAttivi}
              prezziStorici={port.prezziStorici}
            />
          </div>
        )}

        {/* ETF Grid */}
        <div>
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white">
                ETF ({etfAttivi.length} attivi{etfArchiviati.length > 0 ? ` · ${etfArchiviati.length} archiviati` : ''})
              </h2>
              <div className="flex gap-2 items-center">
                {etfAttivi.filter(e => e.isin).length > 0 && (
                  <button
                    onClick={aggiornaTuttiIPrezzi}
                    disabled={aggStato === 'running' || globalCooldownSec > 0}
                    className="flex items-center gap-1.5 text-xs bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-slate-200 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <svg className={`w-3.5 h-3.5 ${aggStato === 'running' ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    {globalCooldownSec > 0 ? `Aggiorna tutti (${globalCooldownSec}s)` : 'Aggiorna tutti'}
                  </button>
                )}
                {etfAttivi.length > 0 && (
                  <button
                    onClick={() => setModalAcquisto(true)}
                    className="text-sm bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition-colors font-medium"
                  >
                    + Acquisto
                  </button>
                )}
                {port.etf.length < 9 && (
                  <button
                    onClick={() => setModalNuovoETF(true)}
                    className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-colors font-medium"
                  >
                    + ETF
                  </button>
                )}
              </div>
            </div>
            {aggErroriIsin.length > 0 && (
              <p className="text-xs text-red-400 mt-1.5">ISIN con errori: {aggErroriIsin.join(' · ')}</p>
            )}
          </div>

          {etfAttivi.length === 0 && etfArchiviati.length === 0 ? (
            <div className="text-center py-16 text-slate-500">
              <p className="text-3xl mb-3">📈</p>
              <p className="text-sm">Nessun ETF configurato.</p>
              <button
                onClick={() => setModalNuovoETF(true)}
                className="mt-4 text-sm bg-blue-600 hover:bg-blue-500 text-white px-5 py-2 rounded-xl transition-colors"
              >
                Aggiungi il primo ETF
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {etfAttivi.map(etf => (
                  <ETFCard
                    key={etf.id}
                    etf={etf}
                    onModifica={(id) => setEtfDaModificare(port.etf.find(e => e.id === id))}
                    onArchivia={port.archiviaETF}
                    onAggiornaPrezzo={handleAggiornaPrezzo}
                    onRimuoviAcquisto={port.rimuoviAcquisto}
                  />
                ))}
              </div>

              {/* ETF archiviati */}
              {etfArchiviati.length > 0 && (
                <div className="mt-6">
                  <button
                    onClick={() => setMostraArchiviati(v => !v)}
                    className="text-xs text-slate-500 hover:text-slate-300 transition-colors flex items-center gap-1 mb-3"
                  >
                    {mostraArchiviati ? '▲' : '▼'} ETF archiviati ({etfArchiviati.length})
                  </button>
                  {mostraArchiviati && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 opacity-50">
                      {etfArchiviati.map(etf => (
                        <div key={etf.id} className="relative">
                          <ETFCard
                            etf={etf}
                            onModifica={(id) => setEtfDaModificare(port.etf.find(e => e.id === id))}
                            onArchivia={port.archiviaETF}
                            onAggiornaPrezzo={handleAggiornaPrezzo}
                            onRimuoviAcquisto={port.rimuoviAcquisto}
                          />
                          <div className="absolute inset-0 flex items-start justify-end p-3 pointer-events-none">
                            <span className="text-xs bg-amber-800/80 text-amber-300 px-2 py-0.5 rounded-full">Archiviato</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Selettore Proiezione */}
        {etfAttivi.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-4 flex-wrap">
              <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-300">
                <span
                  onClick={() => port.setMostraProiezione(!port.mostraProiezione)}
                  className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${port.mostraProiezione ? 'bg-blue-600' : 'bg-slate-600'}`}
                >
                  <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${port.mostraProiezione ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </span>
                Mostra proiezione
              </label>
              {port.mostraProiezione && (
                <div className="flex items-center gap-2 text-sm text-slate-300">
                  <span>Orizzonte:</span>
                  <input
                    type="number"
                    step="1"
                    min="1"
                    max="20"
                    value={port.orizzonteAnni}
                    onChange={e => port.setOrizzonteAnni(e.target.value)}
                    className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-400"
                  />
                  <span>anni</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Scenari */}
        {port.mostraProiezione && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-white">Scenari proiezione</h2>
              <button
                onClick={() => setModalScenario(true)}
                className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-xl transition-colors"
              >
                + Scenario
              </button>
            </div>
            <div className="flex flex-wrap gap-3">
              {port.scenari.map(sc => (
                <ScenarioChip
                  key={sc.id}
                  scenario={sc}
                  onAggiorna={port.aggiornaScenario}
                  onRimuovi={port.rimuoviScenario}
                />
              ))}
            </div>
          </div>
        )}

        {/* Tabella proiezione per anno */}
        {port.mostraProiezione && etfAttivi.length > 0 && port.scenari.length > 0 && (
          <TabellaProiezione
            etfList={etfAttivi}
            scenari={port.scenari}
            orizzonteAnni={port.orizzonteAnni}
            storicoAnnuale={port.storicoAnnuale}
          />
        )}

      </main>

      {/* Modal: nuovo ETF */}
      {modalNuovoETF && (
        <Modal titolo="Nuovo ETF" onChiudi={() => setModalNuovoETF(false)}>
          <form onSubmit={handleAggiungiETF} className="space-y-4">
            <Input label="Nome ETF" value={nomeETF} onChange={e => setNomeETF(e.target.value)} placeholder="iShares Core MSCI World" required />
            <Input label="ISIN" value={isinETF} onChange={e => setIsinETF(e.target.value)} placeholder="IE00B4L5Y983" />
            <Input label="Emittente" value={emittenteETF} onChange={e => setEmittenteETF(e.target.value)} placeholder="iShares, Vanguard, Amundi…" />
            <Input label="Importo PAC mensile (€)" type="number" step="0.01" min="0" value={importoETF} onChange={e => setImportoETF(e.target.value)} placeholder="200" />
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModalNuovoETF(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2.5 text-sm transition-colors">Annulla</button>
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">Aggiungi</button>
            </div>
          </form>
        </Modal>
      )}

      {/* Modal: modifica ETF */}
      {etfDaModificare && (
        <ModificaETFModal
          etf={etfDaModificare}
          onSalva={(id, campi) => { const etf = port.etf.find(e => e.id === id); port.aggiornaETF(id, etf?.isin, campi) }}
          onChiudi={() => setEtfDaModificare(null)}
        />
      )}

      {/* Modal: nuovo acquisto (multi-ETF, solo attivi) */}
      {modalAcquisto && etfAttivi.length > 0 && (
        <AcquistoForm
          etfList={etfAttivi}
          brokerList={brokerAttivi}
          onAggiungi={port.aggiungiAcquistiMultipli}
          onChiudi={() => setModalAcquisto(false)}
        />
      )}

      {/* Modal: gestione broker */}
      {modalGestoreBroker && (
        <GestoreBrokerModal
          broker={port.broker}
          onAggiungi={port.aggiungiBroker}
          onAggiorna={port.aggiornaBroker}
          onElimina={port.eliminaBroker}
          onChiudi={() => setModalGestoreBroker(false)}
        />
      )}

      {/* Modal: nuovo scenario */}
      {modalScenario && (
        <Modal titolo="Nuovo scenario" onChiudi={() => setModalScenario(false)}>
          <form onSubmit={handleAggiungiScenario} className="space-y-4">
            <Input label="Nome scenario" value={nomeScen} onChange={e => setNomeScen(e.target.value)} placeholder="Ottimistico" required />
            <Input label="Rendimento annuo (%)" type="number" step="0.1" min="0" max="100" value={rendScen} onChange={e => setRendScen(e.target.value)} placeholder="10" required />
            <div>
              <label className="block text-xs text-slate-400 mb-1">Colore linea</label>
              <input type="color" value={coloreScen} onChange={e => setColoreScen(e.target.value)} className="h-9 w-full rounded-lg border border-slate-600 bg-slate-700 cursor-pointer" />
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => setModalScenario(false)} className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2.5 text-sm transition-colors">Annulla</button>
              <button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors">Aggiungi</button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}
