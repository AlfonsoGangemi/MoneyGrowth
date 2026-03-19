import { useMemo, useState } from 'react'
import { valoreAttuale } from '../utils/calcoli'
import { useLocale } from '../hooks/useLocale'

function fmt(val) {
  return new Intl.NumberFormat('it-IT', {
    style: 'currency',
    currency: 'EUR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(val)
}

function fmtPct(val) {
  return (val >= 0 ? '+' : '') + val.toFixed(1) + '%'
}

// ── Intestazione colonna scenario con controlli inline ──────────────

function ScenarioTh({ sc, idx, scenarioIdx, onAggiorna, onRimuovi }) {
  const { t } = useLocale()
  const [editRend, setEditRend] = useState(false)
  const [nuovoRend, setNuovoRend] = useState('')
  const [conferma, setConferma] = useState(false)

  function apriEdit() {
    setNuovoRend(String((sc.rendimentoAnnuo * 100).toFixed(1)))
    setEditRend(true)
  }

  function salvaRend() {
    const r = parseFloat(nuovoRend.replace(',', '.'))
    if (Number.isFinite(r) && r !== 0) onAggiorna(sc.id, { rendimentoAnnuo: r / 100 })
    setEditRend(false)
  }

  return (
    <th className={`px-4 py-3 text-right font-medium whitespace-nowrap ${idx !== scenarioIdx ? 'hidden sm:table-cell' : ''}`}>
      <div className="flex items-center justify-end gap-1.5 flex-wrap">
        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: sc.colore }} />
        <span style={{ color: sc.colore }}>{sc.nome}</span>

        {editRend ? (
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.1"
              min="-100"
              max="100"
              value={nuovoRend}
              onChange={e => setNuovoRend(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') salvaRend()
                if (e.key === 'Escape') setEditRend(false)
              }}
              className="w-14 bg-slate-700 border border-slate-500 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-blue-400"
              autoFocus
            />
            <span className="text-xs text-slate-400">%</span>
            <button onClick={salvaRend} className="text-xs text-blue-400 hover:text-blue-300 transition-colors">✓</button>
            <button onClick={() => setEditRend(false)} className="text-xs text-slate-500 hover:text-white transition-colors">✕</button>
          </div>
        ) : (
          <button
            onClick={apriEdit}
            className="text-slate-500 font-normal text-xs hover:text-white transition-colors underline decoration-dotted underline-offset-2"
            title={t('modifica_rendimento')}
          >
            {(sc.rendimentoAnnuo * 100).toFixed(1)}%/a
          </button>
        )}

        {conferma ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onRimuovi(sc.id)}
              className="text-xs text-red-400 hover:text-red-300 transition-colors font-medium"
            >{t('elimina')}</button>
            <button
              onClick={() => setConferma(false)}
              className="text-xs text-slate-500 hover:text-white transition-colors"
            >✕</button>
          </div>
        ) : (
          <button
            onClick={() => setConferma(true)}
            className="text-slate-600 hover:text-red-400 transition-colors text-xs"
          >✕</button>
        )}
      </div>
    </th>
  )
}

export default function TabellaProiezione({
  etfList, scenari, orizzonteAnni, storicoAnnuale = [],
  onSetOrizzonteAnni, onNuovoScenario, onAggiornaScenario, onRimuoviScenario,
  privacyMode = false,
}) {
  const { t } = useLocale()
  const pv = (f) => privacyMode ? '••••' : f
  const [scenarioIdx, setScenarioIdx] = useState(0)

  const scenariOrdinati = useMemo(
    () => [...scenari].sort((a, b) => a.rendimentoAnnuo - b.rendimentoAnnuo),
    [scenari]
  )

  const dati = useMemo(() => {
    if (etfList.length === 0 || scenariOrdinati.length === 0) return null

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
    const storicoOrdinato = [...storicoAnnuale].sort((a, b) => a.anno - b.anno)
    const ultimoStorico = storicoOrdinato.length > 0 ? storicoOrdinato[storicoOrdinato.length - 1] : null
    const annoBaseVersato = ultimoStorico?.anno ?? (annoCorrente - 1)
    const baseVersato = ultimoStorico?.totaleVersato ?? 0

    // Proiezioni anno per anno: ogni anno parte dal valore dell'anno precedente
    // valoreAnnoN = (valoreAnnoN-1 + versamentoAnnuo) * (1 + rendimento)
    const valoreBase = ultimoStorico?.valore ?? valoreOggi
    const versamentoAnnuo = versamentoMensile * 12

    const proiezioniPerScenario = scenariOrdinati.map(sc => {
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
      if (annoCalendario < annoCorrente && !storico) continue

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
  }, [etfList, scenariOrdinati, orizzonteAnni, storicoAnnuale])

  const righeReali = dati ? dati.righe.filter(r => r.tipo === 'reale') : []
  const righeProiezione = dati ? dati.righe.filter(r => r.tipo === 'proiezione') : []
  const scAttivo = dati ? dati.scenari[scenarioIdx] : null

  return (
    <div className="space-y-6">

      {/* ── Sezione storica ─────────────────────────────────────────── */}
      {righeReali.length > 0 && (
        <div>
          <h3 className="text-base font-bold text-white mb-3">{t('storico')}</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-700">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-800 border-b border-slate-700">
                  <th className="px-4 py-3 text-left text-slate-400 font-medium whitespace-nowrap w-20">{t('col_anno')}</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium whitespace-nowrap w-36">{t('totale_versato')}</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium whitespace-nowrap">{t('valore_reale')}</th>
                </tr>
              </thead>
              <tbody>
                {righeReali.map(riga => (
                  <tr
                    key={riga.key}
                    className="border-b border-slate-800 transition-colors hover:bg-slate-800/60"
                  >
                    <td className="px-4 py-3 text-slate-300 font-semibold">{riga.label}</td>
                    <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{pv(fmt(riga.totaleVersato))}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      <div className="text-white font-medium">{pv(fmt(riga.valore))}</div>
                      <div className={`text-xs ${riga.rendimentoEur >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                        {pv(`${riga.rendimentoEur >= 0 ? '+' : ''}${fmt(riga.rendimentoEur)} (${fmtPct(riga.rendimentoPct)})`)}
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
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <h2 className="text-base font-bold text-white">{t('proiezione')}</h2>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <span>{t('orizzonte')}</span>
            <input
              type="number"
              step="1"
              min="1"
              max="20"
              value={orizzonteAnni}
              onChange={e => onSetOrizzonteAnni(e.target.value)}
              className="w-16 bg-slate-700 border border-slate-600 rounded-lg px-2 py-1 text-white text-xs focus:outline-none focus:border-blue-400"
            />
            <span>{t('anni_label')}</span>
          </div>
        </div>
        {scenari.length < 3 && (
          <button
            onClick={onNuovoScenario}
            className="text-sm bg-slate-700 hover:bg-slate-600 text-white px-3 py-1.5 rounded-xl transition-colors"
          >
            {t('aggiungi_scenario')}
          </button>
        )}
      </div>

      {righeProiezione.length > 0 && (
        <div>
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
                  <th className="px-4 py-3 text-left text-slate-400 font-medium whitespace-nowrap w-20">{t('col_anno')}</th>
                  <th className="px-4 py-3 text-right text-slate-400 font-medium whitespace-nowrap w-36">{t('totale_versato')}</th>
                  {dati.scenari.map((sc, idx) => (
                    <ScenarioTh
                      key={sc.id}
                      sc={sc}
                      idx={idx}
                      scenarioIdx={scenarioIdx}
                      onAggiorna={onAggiornaScenario}
                      onRimuovi={onRimuoviScenario}
                    />
                  ))}
                </tr>
              </thead>
              <tbody>
                {righeProiezione.map((riga) => (
                  <tr
                    key={riga.key}
                    className="border-b border-slate-800 transition-colors hover:bg-slate-800/60"
                  >
                    <td className="px-4 py-3 text-slate-300 font-semibold">{riga.label}</td>
                    <td className="px-4 py-3 text-right text-slate-400 tabular-nums">{pv(fmt(riga.totaleVersato))}</td>
                    {riga.valoriScenari.map((vs, idx) => (
                      <td
                        key={vs.scenarioId}
                        className={`px-4 py-3 text-right ${idx !== scenarioIdx ? 'hidden sm:table-cell' : ''}`}
                      >
                        <div className="font-medium tabular-nums text-white">
                          {pv(fmt(vs.valore))}
                        </div>
                        <div className={`text-xs tabular-nums ${vs.guadagno >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {pv(`${vs.guadagno >= 0 ? '+' : ''}${fmt(vs.guadagno)}`)}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {dati && (
        <p className="text-xs text-slate-500">
          {t('versamento_mensile')}: {pv(fmt(dati.versamentoMensile))} · {t('portafoglio_attuale')}: {pv(fmt(dati.valoreOggi))}
        </p>
      )}
    </div>
  )
}
