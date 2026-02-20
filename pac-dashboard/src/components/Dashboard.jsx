import { useState } from 'react'
import { usePortafoglio } from '../hooks/usePortafoglio'
import ETFCard from './ETFCard'
import AcquistoForm from './AcquistoForm'
import GraficoPortafoglio from './GraficoPortafoglio'
import Indicatori from './Indicatori'

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

// ── Dashboard principale ───────────────────────────────────────────

export default function Dashboard() {
  const port = usePortafoglio()

  const [modalNuovoETF, setModalNuovoETF] = useState(false)
  const [etfDaModificare, setEtfDaModificare] = useState(null)
  const [modalAcquisto, setModalAcquisto] = useState(false)
  const [modalScenario, setModalScenario] = useState(false)
  const [mostraArchiviati, setMostraArchiviati] = useState(false)
  const [errImport, setErrImport] = useState('')

  // Form nuovo ETF
  const [nomeETF, setNomeETF] = useState('')
  const [isinETF, setIsinETF] = useState('')
  const [emittenteETF, setEmittenteETF] = useState('')
  const [importoETF, setImportoETF] = useState('')

  // Form nuovo scenario
  const [nomeScen, setNomeScen] = useState('')
  const [rendScen, setRendScen] = useState('')
  const [coloreScen, setColoreScen] = useState('#6366f1')

  const etfAttivi = port.etf.filter(e => !e.archiviato)
  const etfArchiviati = port.etf.filter(e => e.archiviato)

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
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">PAC Dashboard</h1>
            <p className="text-xs text-slate-500">Piano di Accumulo Capitale</p>
          </div>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            <button
              onClick={port.exportJSON}
              className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors"
            >
              Export JSON
            </button>
            <label className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-200 px-3 py-1.5 rounded-lg transition-colors cursor-pointer">
              Import JSON
              <input type="file" accept=".json" onChange={handleImport} className="hidden" />
            </label>
          </div>
        </div>
        {errImport && (
          <div className="max-w-7xl mx-auto px-4 pb-2 text-xs text-red-400">{errImport}</div>
        )}
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        {/* Indicatori (solo ETF attivi) */}
        {etfAttivi.length > 0 && <Indicatori etfList={etfAttivi} />}

        {/* Grafico (solo ETF attivi) */}
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
                  <select
                    value={port.orizzonteAnni}
                    onChange={e => port.setOrizzonteAnni(e.target.value)}
                    className="bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                      <option key={n} value={n}>{n} ann{n === 1 ? 'o' : 'i'}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <GraficoPortafoglio
              etfList={etfAttivi}
              scenari={port.scenari}
              orizzonteAnni={port.orizzonteAnni}
              mostraProiezione={port.mostraProiezione}
            />
          </div>
        )}

        {/* ETF Grid */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-base font-bold text-white">
              ETF ({etfAttivi.length} attivi{etfArchiviati.length > 0 ? ` · ${etfArchiviati.length} archiviati` : ''})
            </h2>
            <div className="flex gap-2">
              {etfAttivi.length > 0 && (
                <button
                  onClick={() => setModalAcquisto(true)}
                  className="text-sm bg-green-700 hover:bg-green-600 text-white px-4 py-2 rounded-xl transition-colors font-medium"
                >
                  + Acquisto
                </button>
              )}
              {port.etf.length < 5 && (
                <button
                  onClick={() => setModalNuovoETF(true)}
                  className="text-sm bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-xl transition-colors font-medium"
                >
                  + ETF
                </button>
              )}
            </div>
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
                    onAggiornaPrezzo={(id, p) => port.aggiornaETF(id, { prezzoCorrente: p })}
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
                            onAggiornaPrezzo={(id, p) => port.aggiornaETF(id, { prezzoCorrente: p })}
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
          onSalva={port.aggiornaETF}
          onChiudi={() => setEtfDaModificare(null)}
        />
      )}

      {/* Modal: nuovo acquisto (multi-ETF, solo attivi) */}
      {modalAcquisto && etfAttivi.length > 0 && (
        <AcquistoForm
          etfList={etfAttivi}
          onAggiungi={port.aggiungiAcquistiMultipli}
          onChiudi={() => setModalAcquisto(false)}
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
