import { indicatoriPortafoglio, calcolaIRR, calcolaTWRR, calcolaATWRR, serieStoricaDaPrezziStorici, calcolaMaxDrawdown, calcolaVolatilita } from '../utils/calcoli'
import { useLocale } from '../hooks/useLocale'

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

export default function Indicatori({ etfList, prezziStorici = [], privacyMode = false }) {
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
    </div>
  )
}
