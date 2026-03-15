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

// ── Modale informazioni ───────────────────────────────────────────

const GITHUB_URL = 'https://github.com/AlfonsoGangemi/MoneyGrowth'

function InfoModal({ onChiudi }) {
  const link = 'text-blue-400 hover:text-blue-300 underline underline-offset-2 transition-colors'
  return (
    <Modal titolo="Informazioni" onChiudi={onChiudi}>
      <div className="space-y-4 text-sm text-slate-300">
        <div className="flex items-start gap-3">
          <span className="text-slate-500 mt-0.5 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
          </span>
          <div>
            <p className="text-white font-medium mb-0.5">Progetto open source</p>
            <a href={GITHUB_URL} target="_blank" rel="noopener noreferrer" className={link}>
              Github
            </a>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-slate-500 mt-0.5 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
            </svg>
          </span>
          <div>
            <p className="text-white font-medium mb-0.5">Licenza</p>
            <a href={`${GITHUB_URL}/blob/main/LICENSE`} target="_blank" rel="noopener noreferrer" className={link}>
              MIT License
            </a>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <span className="text-slate-500 mt-0.5 flex-shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
            </svg>
          </span>
          <div>
            <p className="text-white font-medium mb-0.5">Dati di mercato</p>
            <a href="https://www.justetf.com" target="_blank" rel="noopener noreferrer" className={link}>
              JustETF
            </a>
          </div>
        </div>

        <div className="border-t border-slate-700 pt-4 flex gap-4">
          <a href="/privacy" target="_blank" rel="noopener noreferrer" className={link}>Privacy Policy</a>
          <a href="/termini" target="_blank" rel="noopener noreferrer" className={link}>Termini di Servizio</a>
        </div>
      </div>
    </Modal>
  )
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
  const [privacyMode, setPrivacyMode] = useState(() => localStorage.getItem('privacyMode') === 'true')
  const [modalCrediti, setModalCrediti] = useState(false)
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
  const etfAttiviReali = port.etf.filter(e => !e.archiviato).length
  const limitRaggiunto = etfAttiviReali >= 9

  // Per ogni ETF, lista dei broker con almeno un acquisto (dati non filtrati)
  const brokerPerETF = Object.fromEntries(
    port.etf.map(e => [
      e.id,
      [...new Set(e.acquisti.map(a => a.brokerId))]
        .map(id => port.broker.find(b => b.id === id))
        .filter(Boolean),
    ])
  )

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

          {/* Azioni navbar destra */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPrivacyMode(v => { const next = !v; localStorage.setItem('privacyMode', next); return next })}
              className={`transition-colors ${privacyMode ? 'text-amber-400' : 'text-slate-400 hover:text-white'}`}
              title={privacyMode ? 'Mostra importi' : 'Nascondi importi'}
            >
              {privacyMode ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>

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
                  onClick={() => { setModalCrediti(true); setDropdownAperto(false) }}
                  className="w-full text-left text-xs text-slate-200 hover:bg-slate-700 px-4 py-2.5 transition-colors"
                >
                  Info Prodotto
                </button>
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

        {/* Indicatori (tutti gli ETF, inclusi archiviati) */}
        {etfFiltrate.length > 0 && <Indicatori etfList={etfFiltrate} prezziStorici={port.prezziStorici} privacyMode={privacyMode} />}

        {/* Grafico (solo ETF attivi) */}
        {etfAttivi.length > 0 && (
          <div className="space-y-3">
            
            <GraficoPortafoglio
              etfList={etfFiltrate}
              etfAttivi={etfAttivi}
              prezziStorici={port.prezziStorici}
              privacyMode={privacyMode}
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
                    brokerAcquisti={brokerPerETF[etf.id] ?? []}
                    attenuata={port.brokerFiltro.length > 0 && etf.acquisti.length === 0}
                    privacyMode={privacyMode}
                  />
                ))}
              </div>

              {/* CTA aggiunta ETF in fondo alla lista */}
              {!limitRaggiunto ? (
                <button
                  onClick={() => setModalNuovoETF(true)}
                  className="mt-4 w-full text-sm border-2 border-dashed border-slate-700 hover:border-blue-500 text-slate-500 hover:text-blue-400 py-3 rounded-2xl transition-colors"
                >
                  + Aggiungi ETF
                </button>
              ) : (
                <p className="mt-4 text-center text-xs text-slate-500">
                  Limite di 9 ETF attivi raggiunto — archivia un ETF per aggiungerne un altro
                </p>
              )}

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
                            archivaDisabilitato={limitRaggiunto}
                            privacyMode={privacyMode}
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

        {/* Tabella proiezione */}
        {etfAttivi.length > 0 && (
          <TabellaProiezione
            etfList={etfAttivi}
            scenari={port.scenari}
            orizzonteAnni={port.orizzonteAnni}
            storicoAnnuale={port.storicoAnnuale}
            onSetOrizzonteAnni={port.setOrizzonteAnni}
            onNuovoScenario={() => setModalScenario(true)}
            onAggiornaScenario={port.aggiornaScenario}
            onRimuoviScenario={port.rimuoviScenario}
            privacyMode={privacyMode}
          />
        )}

      </main>

      {/* Modal: nuovo ETF */}
      {modalNuovoETF && (
        <Modal titolo="Nuovo ETF" onChiudi={() => setModalNuovoETF(false)}>
          <form onSubmit={handleAggiungiETF} className="space-y-4">
            <Input label="ISIN" value={isinETF} onChange={e => setIsinETF(e.target.value)} placeholder="IE00B4L5Y983" />
            <Input label="Nome ETF" value={nomeETF} onChange={e => setNomeETF(e.target.value)} placeholder="iShares Core MSCI World" required />
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

      {/* Modal: informazioni */}
      {modalCrediti && <InfoModal onChiudi={() => setModalCrediti(false)} />}

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
