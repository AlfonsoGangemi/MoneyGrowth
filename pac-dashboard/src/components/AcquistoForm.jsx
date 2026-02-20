import { useState } from 'react'
import { format } from 'date-fns'

export default function AcquistoForm({ etfList, onAggiungi, onChiudi }) {
  const oggi = format(new Date(), 'yyyy-MM-dd')
  const [data, setData] = useState(oggi)

  // Per ogni ETF attivo: stato riga { selezionato, importo, prezzo }
  const [righe, setRighe] = useState(() =>
    etfList.map(etf => {
      const ultimo = etf.acquisti.length > 0
        ? [...etf.acquisti].sort((a, b) => b.data.localeCompare(a.data))[0]
        : null
      return {
        etfId: etf.id,
        selezionato: false,
        importo: String(ultimo ? ultimo.importoInvestito : (etf.importoFisso || '')),
        prezzo: etf.prezzoCorrente > 0 ? String(etf.prezzoCorrente) : '',
      }
    })
  )

  function toggleEtf(etfId) {
    setRighe(r => r.map(riga => riga.etfId === etfId ? { ...riga, selezionato: !riga.selezionato } : riga))
  }

  function setRigaVal(etfId, campo, valore) {
    setRighe(r => r.map(riga => riga.etfId === etfId ? { ...riga, [campo]: valore } : riga))
  }

  function calcolaQuote(riga) {
    const imp = parseFloat(riga.importo)
    const pr = parseFloat(riga.prezzo.replace(',', '.'))
    return !isNaN(imp) && imp > 0 && !isNaN(pr) && pr > 0
      ? (imp / pr).toFixed(6)
      : '—'
  }

  function handleSubmit(e) {
    e.preventDefault()
    const items = righe
      .filter(r => r.selezionato)
      .map(r => ({
        etfId: r.etfId,
        data,
        importoInvestito: parseFloat(r.importo),
        prezzoUnitario: parseFloat(r.prezzo.replace(',', '.')),
      }))
      .filter(item =>
        !isNaN(item.importoInvestito) && item.importoInvestito > 0 &&
        !isNaN(item.prezzoUnitario) && item.prezzoUnitario > 0
      )
    if (items.length === 0) return
    onAggiungi(items)
    onChiudi()
  }

  const almenaUna = righe.some(r => r.selezionato)

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-white">Nuovo acquisto PAC</h2>
          <button onClick={onChiudi} className="text-slate-400 hover:text-white transition-colors text-xl">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 min-h-0">
          {/* Data unica */}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Data acquisto</label>
            <input
              type="date"
              value={data}
              onChange={e => setData(e.target.value)}
              max={oggi}
              className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
            />
          </div>

          {/* Lista ETF con checkbox */}
          <div className="flex-1 min-h-0 overflow-y-auto space-y-2">
            <p className="text-xs text-slate-400 sticky top-0 bg-slate-800 pb-1">Seleziona gli ETF da acquistare</p>
            {righe.map(riga => {
              const etf = etfList.find(e => e.id === riga.etfId)
              return (
                <div
                  key={riga.etfId}
                  className={`rounded-xl border transition-colors ${riga.selezionato ? 'border-blue-500 bg-blue-950/30' : 'border-slate-700 bg-slate-900/30'}`}
                >
                  {/* Riga checkbox */}
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer select-none"
                    onClick={() => toggleEtf(riga.etfId)}
                  >
                    <input
                      type="checkbox"
                      checked={riga.selezionato}
                      onChange={() => toggleEtf(riga.etfId)}
                      onClick={e => e.stopPropagation()}
                      className="w-4 h-4 accent-blue-500 flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-white truncate">{etf.nome}</p>
                      {etf.emittente && <p className="text-xs text-slate-500">{etf.emittente}</p>}
                    </div>
                    <span className="text-xs text-slate-500 font-mono flex-shrink-0">{etf.isin}</span>
                  </div>

                  {/* Dettagli importo/prezzo/quote (visibili solo se selezionato) */}
                  {riga.selezionato && (
                    <div className="px-4 pb-3 grid grid-cols-3 gap-2 items-end">
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Importo (€)</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0.01"
                          value={riga.importo}
                          onChange={e => setRigaVal(riga.etfId, 'importo', e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-slate-400 mb-1">Prezzo (€)</label>
                        <input
                          type="number"
                          step="0.0001"
                          min="0.0001"
                          value={riga.prezzo}
                          onChange={e => setRigaVal(riga.etfId, 'prezzo', e.target.value)}
                          onClick={e => e.stopPropagation()}
                          className="w-full bg-slate-700 border border-slate-600 rounded-lg px-2 py-1.5 text-white text-sm focus:outline-none focus:border-blue-400"
                        />
                      </div>
                      <div>
                        <p className="text-xs text-slate-400 mb-1">Quote</p>
                        <p className="text-sm font-semibold text-blue-300 py-1.5 px-2 bg-slate-900/50 rounded-lg">
                          {calcolaQuote(riga)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onChiudi}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              Annulla
            </button>
            <button
              type="submit"
              disabled={!almenaUna}
              className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-xl py-2.5 text-sm font-medium transition-colors"
            >
              Aggiungi {almenaUna ? `(${righe.filter(r => r.selezionato).length})` : ''}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
