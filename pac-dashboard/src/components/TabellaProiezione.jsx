import { useMemo, useState } from 'react'
import { valoreAttuale } from '../utils/calcoli'

function fmt(val) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(val)
}

function fmtPct(val) {
  return (val >= 0 ? '+' : '') + val.toFixed(1) + '%'
}

export default function TabellaProiezione({ etfList, scenari, orizzonteAnni, storicoAnnuale = [] }) {
  const [scenarioIdx, setScenarioIdx] = useState(0)

  const dati = useMemo(() => {
    if (etfList.length === 0 || scenari.length === 0) return null

    const annoCorrente = new Date().getFullYear()
    const storicoMap = Object.fromEntries(storicoAnnuale.map(r => [r.anno, r]))

    // annoBase: primo anno con dati storici o acquisti, o annoCorrente se nessuno dei due
    const anniStorici = storicoAnnuale.map(r => r.anno).sort((a, b) => a - b)
    const primoAcquistoAnno = etfList
      .flatMap(e => e.acquisti)
      .map(a => Number(a.data.slice(0, 4)))
      .filter(Boolean)
      .reduce((min, a) => Math.min(min, a), Infinity)
    const annoBase = Math.min(
      anniStorici.length > 0 ? anniStorici[0] : annoCorrente,
      isFinite(primoAcquistoAnno) ? primoAcquistoAnno : annoCorrente
    )

    const valoreOggi = etfList.reduce((s, e) => s + valoreAttuale(e.acquisti, e.prezzoCorrente), 0)
    const versamentoMensile = etfList.filter(e => !e.archiviato).reduce((s, e) => s + e.importoFisso, 0)

    // Base per il calcolo del totale versato nelle proiezioni
    const ultimoStorico = storicoAnnuale.length > 0 ? storicoAnnuale[storicoAnnuale.length - 1] : null
    const annoBaseVersato = ultimoStorico?.anno ?? (annoCorrente - 1)
    const baseVersato = ultimoStorico?.totaleVersato ?? 0

    // Proiezioni anno per anno: ogni anno parte dal valore dell'anno precedente
    // valoreAnnoN = (valoreAnnoN-1 + versamentoAnnuo) * (1 + rendimento)
    const valoreBase = ultimoStorico?.valore ?? valoreOggi
    const versamentoAnnuo = versamentoMensile * 12

    const proiezioniPerScenario = scenari.map(sc => {
      const valori = []
      let val = valoreBase
      for (let y = 0; y < orizzonteAnni; y++) {
        val = (val + versamentoAnnuo) * (1 + sc.rendimentoAnnuo)
        valori.push(val)
      }
      return { scenario: sc, valori }
    })

    // Righe totali: anni passati con storico + orizzonteAnni di proiezione
    const anniPassati = anniStorici.filter(a => a < annoCorrente)
    const totaleRighe = anniPassati.length + orizzonteAnni

    const righe = []
    for (let i = 0; i < totaleRighe; i++) {
      const annoCalendario = annoBase + i
      const storico = storicoMap[annoCalendario]
      const isReale = annoCalendario < annoCorrente && !!storico

      if (isReale) {
        const rendimentoEur = storico.valore - storico.totaleVersato
        const rendimentoPct = storico.totaleVersato > 0
          ? (storico.valore / storico.totaleVersato - 1) * 100
          : 0
        righe.push({
          tipo: 'reale',
          key: `r-${annoCalendario}`,
          label: String(annoCalendario),
          totaleVersato: storico.totaleVersato,
          valore: storico.valore,
          rendimentoEur,
          rendimentoPct,
        })
      } else {
        // yIdx: 0 = primo anno di proiezione (annoCorrente)
        const annoProiezione = annoCalendario - annoCorrente + 1
        const yIdx = annoProiezione - 1
        const totaleVersato = baseVersato + versamentoAnnuo * (annoCalendario - annoBaseVersato)

        const valoriScenari = proiezioniPerScenario.map(({ scenario, valori }) => {
          const valore = valori[yIdx] ?? 0
          return {
            scenarioId: scenario.id,
            valore,
            guadagno: valore - totaleVersato,
          }
        })
        righe.push({
          tipo: 'proiezione',
          key: `p-${annoCalendario}`,
          label: String(annoCalendario),
          totaleVersato,
          valoriScenari,
        })
      }
    }

    return {
      righe,
      scenari: proiezioniPerScenario.map(p => p.scenario),
      versamentoMensile,
      valoreOggi,
    }
  }, [etfList, scenari, orizzonteAnni, storicoAnnuale])

  if (!dati || dati.righe.length === 0) return null

  const righeReali = dati.righe.filter(r => r.tipo === 'reale')
  const righeProiezione = dati.righe.filter(r => r.tipo === 'proiezione')
  const scAttivo = dati.scenari[scenarioIdx]

  return (
    <div className="space-y-6">

      {/* ── Sezione storica ─────────────────────────────────────────── */}
      {righeReali.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-white mb-3">Storico</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="px-4 py-3 text-left text-slate-400 font-medium whitespace-nowrap w-20">Anno</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium whitespace-nowrap w-36">Totale versato</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium whitespace-nowrap">Valore reale</th>
                </tr>
              </thead>
              <tbody>
                {righeReali.map(riga => (
                  <tr
                    key={riga.key}
                    className="border-b border-slate-800 border-l-2 border-l-emerald-700 bg-emerald-950/30"
                  >
                    <td className="px-4 py-3 text-slate-300 font-semibold">{riga.label}</td>
                    <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{fmt(riga.totaleVersato)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className="text-white font-medium">{fmt(riga.valore)}</div>
                      <div className={`text-xs ${riga.rendimentoEur >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {riga.rendimentoEur >= 0 ? '+' : ''}{fmt(riga.rendimentoEur)} ({fmtPct(riga.rendimentoPct)})
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Sezione previsionale ────────────────────────────────────── */}
      {righeProiezione.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-white mb-3">Proiezione</h3>

          {/* Navigazione scenario — solo mobile */}
          <div className="flex items-center justify-between mb-3 sm:hidden">
            <button
              onClick={() => setScenarioIdx(i => Math.max(0, i - 1))}
              disabled={scenarioIdx === 0}
              className="p-1.5 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              ←
            </button>
            <div className="flex items-center gap-2 text-sm">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: scAttivo.colore }} />
              <span style={{ color: scAttivo.colore }}>{scAttivo.nome}</span>
              <span className="text-slate-500">({(scAttivo.rendimentoAnnuo * 100).toFixed(1)}%/a)</span>
              <span className="text-slate-600 text-xs">{scenarioIdx + 1} / {dati.scenari.length}</span>
            </div>
            <button
              onClick={() => setScenarioIdx(i => Math.min(dati.scenari.length - 1, i + 1))}
              disabled={scenarioIdx === dati.scenari.length - 1}
              className="p-1.5 rounded text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed"
            >
              →
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="px-4 py-3 text-left text-slate-400 font-medium whitespace-nowrap w-20">Anno</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium whitespace-nowrap w-36">Totale versato</th>
                  {dati.scenari.map((sc, idx) => (
                    <th
                      key={sc.id}
                      className={`px-4 py-3 text-right font-medium whitespace-nowrap ${idx !== scenarioIdx ? 'hidden sm:table-cell' : ''}`}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc.colore }} />
                        <span style={{ color: sc.colore }}>{sc.nome}</span>
                        <span className="text-slate-500 font-normal text-xs">
                          ({(sc.rendimentoAnnuo * 100).toFixed(1)}%/a)
                        </span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {righeProiezione.map((riga, i) => (
                  <tr
                    key={riga.key}
                    className="border-b border-slate-800 transition-colors hover:bg-slate-800/60"
                  >
                    <td className="px-4 py-3 text-slate-300 font-semibold">{riga.label}</td>
                    <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{fmt(riga.totaleVersato)}</td>
                    {riga.valoriScenari.map((vs, idx) => (
                      <td
                        key={vs.scenarioId}
                        className={`px-4 py-3 text-right ${idx !== scenarioIdx ? 'hidden sm:table-cell' : ''}`}
                      >
                        <div className="text-white font-medium tabular-nums">{fmt(vs.valore)}</div>
                        <div className={`text-xs tabular-nums ${vs.guadagno >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {vs.guadagno >= 0 ? '+' : ''}{fmt(vs.guadagno)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500">
        Versamento mensile: {fmt(dati.versamentoMensile)} · Portafoglio attuale: {fmt(dati.valoreOggi)}
      </p>
    </div>
  )
}
