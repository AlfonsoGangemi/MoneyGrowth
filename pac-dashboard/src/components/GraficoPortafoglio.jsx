import { useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { serieStorica, calcolaProiezione, totaleInvestito, valoreAttuale } from '../utils/calcoli'

function fmtEur(n) {
  return '€' + n.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })
}

function fmtData(d) {
  try { return format(parseISO(d), 'MMM yy', { locale: it }) } catch { return d }
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-slate-400 mb-2">{fmtData(label)}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {fmtEur(p.value)}
        </p>
      ))}
    </div>
  )
}

export default function GraficoPortafoglio({ etfList, scenari, orizzonteAnni, mostraProiezione, etfSelezionato }) {
  const [vista, setVista] = useState('aggregato') // 'aggregato' | etfId

  const { datiGrafico, oggiStr } = useMemo(() => {
    const oggiStr = format(new Date(), 'yyyy-MM-dd')
    const etfDaUsare = vista === 'aggregato' ? etfList : etfList.filter(e => e.id === vista)

    if (etfDaUsare.length === 0) return { datiGrafico: [], oggiStr }

    // ── Serie storica aggregata ──────────────────────────────────────
    const mapStorico = new Map()

    for (const etf of etfDaUsare) {
      const serie = serieStorica(etf.acquisti, etf.prezzoCorrente)
      for (const punto of serie) {
        mapStorico.set(punto.data, (mapStorico.get(punto.data) ?? 0) + punto.valore)
      }
    }

    const punteStorici = [...mapStorico.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([data, valore]) => ({ data, storico: valore }))

    // ── Merge in unico array ─────────────────────────────────────────
    const tutte = new Map()

    for (const p of punteStorici) {
      tutte.set(p.data, { data: p.data, storico: p.storico })
    }

    const datiGrafico = [...tutte.values()].sort((a, b) => a.data.localeCompare(b.data))

    return { datiGrafico, oggiStr }
  }, [etfList, scenari, orizzonteAnni, mostraProiezione, vista])

  if (etfList.length === 0) return null

  const hasStorico = datiGrafico.some(d => d.storico != null)

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <h2 className="text-base font-bold text-white">Grafico portafoglio</h2>

        {/* Selettore vista */}
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setVista('aggregato')}
            className={`text-xs px-3 py-1 rounded-full transition-colors ${vista === 'aggregato' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            Aggregato
          </button>
          {etfList.map(e => (
            <button
              key={e.id}
              onClick={() => setVista(e.id)}
              className={`text-xs px-3 py-1 rounded-full transition-colors ${vista === e.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {e.nome.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={datiGrafico} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="data"
            tickFormatter={fmtData}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={fmtEur}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            width={80}
          />
          <Tooltip content={<CustomTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 12 }}
          />

          {/* Linea oggi */}
          <ReferenceLine x={oggiStr} stroke="#475569" strokeDasharray="4 4" label={{ value: 'Oggi', fill: '#64748b', fontSize: 11 }} />

          {/* Serie storica */}
          {hasStorico && (
            <Line
              type="monotone"
              dataKey="storico"
              name="Storico"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
