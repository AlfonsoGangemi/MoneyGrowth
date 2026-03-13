import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { it } from 'date-fns/locale'
import { serieStorica, serieStoricaDaPrezziStorici } from '../utils/calcoli'

function fmtEur(n) {
  return '€' + Math.round(n / 1000) + 'K'
}

function fmtData(d) {
  try { return format(parseISO(d), 'MMM yy', { locale: it }) } catch { return d }
}

const CustomTooltip = ({ active, payload, label, privacyMode }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-900 border border-slate-700 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="text-slate-400 mb-2">{fmtData(label)}</p>
      {payload.map(p => (
        <p key={p.name} style={{ color: p.color }} className="font-semibold">
          {p.name}: {privacyMode ? '••••' : `€${(p.value / 1000).toFixed(1)}K`}
        </p>
      ))}
    </div>
  )
}

export default function GraficoPortafoglio({ etfList, etfAttivi, prezziStorici = [], privacyMode = false }) {
  const [vista, setVista] = useState('aggregato') // 'aggregato' | etfId
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 640)

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 640)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [])

  useEffect(() => {
    if (vista !== 'aggregato' && !etfAttivi.some(e => e.id === vista)) {
      setVista('aggregato')
    }
  }, [etfAttivi, vista])

  const { datiGrafico, oggiStr } = useMemo(() => {
    const oggiStr = format(new Date(), 'yyyy-MM-dd')
    const etfDaUsare = vista === 'aggregato' ? etfList : etfList.filter(e => e.id === vista)

    if (etfDaUsare.length === 0) return { datiGrafico: [], oggiStr }

    let serie
    if (vista === 'aggregato') {
      serie = serieStoricaDaPrezziStorici(etfDaUsare, prezziStorici)
    } else {
      const etf = etfDaUsare[0]
      serie = serieStorica(etf.acquisti, etf.prezzoCorrente)
    }

    const datiGrafico = serie.map(p => ({ data: p.data, storico: p.valore }))

    return { datiGrafico, oggiStr }
  }, [etfList, etfAttivi, prezziStorici, vista])

  if (etfList.length === 0) return null

  const hasStorico = datiGrafico.some(d => d.storico != null)

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-5">
      <div className="flex items-center justify-between mb-3 gap-3">
        <h2 className="text-base font-bold text-white flex-shrink-0">Grafico portafoglio</h2>

        {/* Selettore vista — scroll orizzontale su mobile */}
        <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button
            onClick={() => setVista('aggregato')}
            className={`flex-shrink-0 text-xs px-3 py-1 rounded-full transition-colors ${vista === 'aggregato' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
          >
            Aggregato
          </button>
          {etfAttivi.map(e => (
            <button
              key={e.id}
              onClick={() => setVista(e.id)}
              className={`flex-shrink-0 text-xs px-3 py-1 rounded-full transition-colors ${vista === e.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
            >
              {e.nome.split(' ').slice(0, 2).join(' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="h-52 sm:h-[360px]">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datiGrafico} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            dataKey="data"
            tickFormatter={fmtData}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            minTickGap={40}
          />
          <YAxis
            tickFormatter={privacyMode ? () => '••••' : fmtEur}
            tick={{ fill: '#94a3b8', fontSize: 11 }}
            width={isMobile ? 0 : 50}
            mirror={isMobile}
          />
          <Tooltip content={<CustomTooltip privacyMode={privacyMode} />} />

          {/* Linea oggi */}
          <ReferenceLine x={oggiStr} stroke="#475569" strokeDasharray="4 4" />

          {/* Serie storica */}
          {hasStorico && (
            <Line
              type="monotone"
              dataKey="storico"
              name="Totale"
              stroke="#60a5fa"
              strokeWidth={2}
              dot={false}
              connectNulls
            />
          )}
        </LineChart>
      </ResponsiveContainer>
      </div>
    </div>
  )
}
