import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { indicatoriPortafoglio, calcolaIRR, calcolaTWRR, calcolaATWRR, serieStoricaDaPrezziStorici, calcolaMaxDrawdown, calcolaVolatilita, distribuzioneAssetClass } from '../utils/calcoli'
import { useLocale } from '../hooks/useLocale'

const ETF_PALETTE = ['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#f97316','#ec4899','#84cc16']

const ASSET_CLASS_COLOR_MAP = {
  'Azioni':            '#3b82f6',
  'Obbligazioni':      '#10b981',
  'Materie prime':     '#f59e0b',
  'Mercato monetario': '#8b5cf6',
  'Portafogli di ETF': '#06b6d4',
  'Immobili':          '#ef4444',
  'Criptovalute':      '#f97316',
}
function assetColor(nome) {
  return ASSET_CLASS_COLOR_MAP[nome] ?? '#94a3b8'
}

function fmt(n, dec = 2) {
  return n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function Kpi({ label, valore, sub, positivo, neutro }) {
  const color = neutro
    ? 'text-slate-900 dark:text-white'
    : positivo == null
      ? 'text-slate-900 dark:text-white'
      : positivo
        ? 'text-green-600 dark:text-green-400'
        : 'text-red-500 dark:text-red-400'

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-xs text-slate-500 dark:text-slate-400">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{valore}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export default function Indicatori({ etfList, prezziStorici = [], privacyMode = false, brokerFiltro = [] }) {
  const { t } = useLocale()
  const pv = (f) => privacyMode ? '••••' : f
  if (etfList.length === 0) return null

  const { totInvestito, totValore, roi, netto, durataM, cagr } = indicatoriPortafoglio(etfList)

  // XIRR: aggreghiamo tutti gli acquisti e usiamo un prezzo equivalente
  // tale che valoreAttuale(tuttiAcquisti, prezzoEq) == totValore
  const tuttiAcquisti = etfList.flatMap(e => e.acquisti)
  const totQuote = tuttiAcquisti.reduce((s, a) => s + a.quoteFrazionate, 0)
  const prezzoEq = totQuote > 0 ? totValore / totQuote : 0
  const irr = calcolaIRR(tuttiAcquisti, prezzoEq)

  // TWRR aggregato: combiniamo tutti gli acquisti di tutti gli ETF con prezzoCorrente medio ponderato
  // Usiamo la media dei TWRR ponderata per investimento
  const twrrPonderato = etfList.reduce((acc, e) => {
    const inv = e.acquisti.reduce((s, a) => s + a.importoInvestito, 0)
    return acc + calcolaTWRR(e.acquisti, e.prezzoCorrente) * inv
  }, 0)
  const twrr = totInvestito > 0 ? twrrPonderato / totInvestito : 0

  const atwrrPonderato = etfList.reduce((acc, e) => {
    const inv = e.acquisti.reduce((s, a) => s + a.importoInvestito, 0)
    return acc + calcolaATWRR(e.acquisti, e.prezzoCorrente) * inv
  }, 0)
  const atwrr = totInvestito > 0 ? atwrrPonderato / totInvestito : 0

  // Max Drawdown e Volatilità (serie mensile da prezzi storici)
  const serie = serieStoricaDaPrezziStorici(etfList, prezziStorici)
  const maxDrawdown = calcolaMaxDrawdown(serie)
  const volatilita = calcolaVolatilita(serie)

  const anni = Math.floor(durataM / 12)
  const mesiRest = durataM % 12
  const durataStr = anni > 0
    ? `${anni} ${anni === 1 ? t('dur_anno_s') : t('dur_anno_p')} ${t('dur_e')} ${mesiRest} ${mesiRest === 1 ? t('dur_mese_s') : t('dur_mese_p')}`
    : `${mesiRest} ${mesiRest === 1 ? t('dur_mese_s') : t('dur_mese_p')}`

  return (
    <div>
      <h2 className="text-base font-bold text-slate-900 dark:text-white mb-3">{t('indicatori_titolo')}</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {/* Rendimento */}
        <Kpi
          label={t('roi')}
          valore={`${roi >= 0 ? '+' : ''}${fmt(roi)}%`}
          sub={t('rendimento_totale')}
          positivo={roi >= 0}
        />
        <Kpi
          label={t('rendimento_netto')}
          valore={pv(`${netto >= 0 ? '+' : ''}€${fmt(netto, 0)}`)}
          sub={pv(`${t('su')} €${fmt(totInvestito, 0)}`) + ` ${t('investiti')}`}
          positivo={netto >= 0}
        />
        <Kpi
          label="CAGR"
          valore={durataM >= 1 ? `${cagr >= 0 ? '+' : ''}${fmt(cagr)}%` : t('nd')}
          sub={t('rendimento_annualizzato')}
          positivo={durataM >= 1 ? cagr >= 0 : null}
        />
        <Kpi
          label={t('xirr')}
          valore={irr != null ? `${irr >= 0 ? '+' : ''}${fmt(irr)}%` : t('nd')}
          sub={t('crescita_annua')}
          positivo={irr != null ? irr >= 0 : null}
        />
        {/* Contesto */}
        <Kpi
          label={t('valore_portafoglio')}
          valore={pv(`€${fmt(totValore, 0)}`)}
          neutro
        />
        <Kpi
          label={t('durata')}
          valore={durataStr}
          sub={`${durataM} ${t('mesi_totali')}`}
          neutro
        />
        {/* Qualità */}
        <Kpi
          label={t('twrr')}
          valore={`${fmt(twrr)}%`}
          sub={`${t('annualizzato')}: ${fmt(atwrr)}%`}
          positivo={twrr >= 0}
        />
        {maxDrawdown != null && (
          <Kpi
            label={t('max_drawdown')}
            valore={`${fmt(maxDrawdown)}%`}
            sub={t('perdita_picco')}
            positivo={false}
          />
        )}
        {volatilita != null && (
          <Kpi
            label={t('volatilita')}
            valore={`${fmt(volatilita)}%`}
            sub={t('dev_std')}
            neutro
          />
        )}
      </div>

      {/* Distribuzione */}
      {(() => {
        const distAC = distribuzioneAssetClass(etfList, brokerFiltro)

        // Distribuzione per ETF (rispetta filtro broker)
        const totalePerETF = []
        let totETF = 0
        for (const etf of etfList) {
          const acqFiltered = brokerFiltro.length > 0
            ? etf.acquisti.filter(a => brokerFiltro.includes(a.brokerId))
            : etf.acquisti
          const quote = acqFiltered.reduce((s, a) => s + a.quoteFrazionate, 0)
          if (quote === 0) continue
          const valore = quote * etf.prezzoCorrente
          totalePerETF.push({ nome: etf.nome, valore })
          totETF += valore
        }
        const distETF = totETF > 0
          ? totalePerETF
              .map(e => ({ nome: e.nome, percentuale: (e.valore / totETF) * 100 }))
              .sort((a, b) => b.percentuale - a.percentuale)
          : []

        if (distAC.length === 0 && distETF.length === 0) return null

        const tooltipStyle = {
          fontSize: '12px',
          backgroundColor: 'var(--tooltip-bg, #1e293b)',
          border: '1px solid #334155',
          borderRadius: '8px',
          color: '#f1f5f9',
        }

        function Donut({ data, colorFn }) {
          return (
            <div className="w-36 h-36 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data}
                    dataKey="percentuale"
                    nameKey="nome"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={64}
                    paddingAngle={2}
                    startAngle={90}
                    endAngle={-270}
                  >
                    {data.map((entry, i) => (
                      <Cell key={entry.nome} fill={colorFn(entry.nome, i)} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value, name) => [`${fmt(value, 1)}%`, name]}
                    contentStyle={tooltipStyle}
                    itemStyle={{ color: '#f1f5f9' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )
        }

        return (
          <div className="mt-6 pt-5 border-t border-slate-200 dark:border-slate-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
              {distAC.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t('distribuzione_asset_class')}</h3>
                  <div className="flex items-center gap-4">
                    <Donut data={distAC} colorFn={(nome) => assetColor(nome)} />
                    <div className="flex-1 space-y-2">
                      {distAC.map(({ nome, percentuale }) => (
                        <div key={nome} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: assetColor(nome) }} />
                          <span className="text-xs text-slate-600 dark:text-slate-400 flex-1">{nome}</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{fmt(percentuale, 1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
              {distETF.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-4">{t('distribuzione_etf')}</h3>
                  <div className="flex items-center gap-4">
                    <Donut data={distETF} colorFn={(_, i) => ETF_PALETTE[i % ETF_PALETTE.length]} />
                    <div className="flex-1 min-w-0 space-y-2">
                      {distETF.map(({ nome, percentuale }, i) => (
                        <div key={nome} className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: ETF_PALETTE[i % ETF_PALETTE.length] }} />
                          <span className="text-xs text-slate-600 dark:text-slate-400 flex-1 min-w-0 truncate" title={nome}>{nome}</span>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{fmt(percentuale, 1)}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}
    </div>
  )
}
