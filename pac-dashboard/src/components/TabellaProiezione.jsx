import { useMemo } from 'react'
import { format } from 'date-fns'
import { calcolaProiezione, valoreAttuale } from '../utils/calcoli'

function fmt(val) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(val)
}

export default function TabellaProiezione({ etfList, scenari, orizzonteAnni }) {
  const dati = useMemo(() => {
    if (etfList.length === 0 || scenari.length === 0) return null

    const valoreOggi = etfList.reduce((s, e) => s + valoreAttuale(e.acquisti, e.prezzoCorrente), 0)
    const versamentoMensile = etfList.reduce((s, e) => s + e.importoFisso, 0)
    const oggiStr = format(new Date(), 'yyyy-MM-dd')

    // Per ogni scenario calcola tutti i punti mensili
    const proiezioniPerScenario = scenari.map(sc => ({
      scenario: sc,
      punti: calcolaProiezione(valoreOggi, versamentoMensile, sc.rendimentoAnnuo, orizzonteAnni, oggiStr),
    }))

    // Una riga per anno
    const righe = []
    for (let anno = 1; anno <= orizzonteAnni; anno++) {
      const idx = anno * 12 - 1  // indice 0-based dell'ultimo mese dell'anno
      const totaleVersato = versamentoMensile * anno * 12

      const valoriScenari = proiezioniPerScenario.map(({ scenario, punti }) => {
        const valore = punti[idx]?.valore ?? 0
        return {
          scenarioId: scenario.id,
          valore,
          guadagno: valore - totaleVersato,
        }
      })
      righe.push({ anno, totaleVersato, valoriScenari })
    }

    return {
      righe,
      scenari: proiezioniPerScenario.map(p => p.scenario),
      versamentoMensile,
      valoreOggi,
    }
  }, [etfList, scenari, orizzonteAnni])

  if (!dati || dati.righe.length === 0) return null

  return (
    <div>
      <h2 className="text-base font-bold text-white mb-4">Proiezione per anno</h2>
      <div className="overflow-x-auto rounded-xl border border-slate-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-800 border-b border-slate-700">
              <th className="px-4 py-3 text-left text-slate-400 font-medium whitespace-nowrap">Anno</th>
              <th className="px-4 py-3 text-right text-slate-400 font-medium whitespace-nowrap">Totale versato</th>
              {dati.scenari.map(sc => (
                <th key={sc.id} className="px-4 py-3 text-right font-medium whitespace-nowrap">
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
            {dati.righe.map((riga, i) => (
              <tr
                key={riga.anno}
                className={`border-b border-slate-800 transition-colors hover:bg-slate-800/60 ${
                  i % 2 === 0 ? 'bg-slate-900/40' : 'bg-slate-900'
                }`}
              >
                <td className="px-4 py-3 text-slate-300 font-semibold">Anno {riga.anno}</td>
                <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{fmt(riga.totaleVersato)}</td>
                {riga.valoriScenari.map(vs => (
                  <td key={vs.scenarioId} className="px-4 py-3 text-right">
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
      <p className="mt-2 text-xs text-slate-500">
        Versamento mensile: {fmt(dati.versamentoMensile)} · Portafoglio attuale: {fmt(dati.valoreOggi)}
      </p>
    </div>
  )
}
