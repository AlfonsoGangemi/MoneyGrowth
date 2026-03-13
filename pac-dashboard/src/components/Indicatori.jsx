import { indicatoriPortafoglio, calcolaIRR, calcolaTWRR, calcolaATWRR, serieStoricaDaPrezziStorici, calcolaMaxDrawdown, calcolaVolatilita } from '../utils/calcoli'

function fmt(n, dec = 2) {
  return n.toLocaleString('it-IT', { minimumFractionDigits: dec, maximumFractionDigits: dec })
}

function Kpi({ label, valore, sub, positivo, neutro }) {
  const color = neutro
    ? 'text-white'
    : positivo == null
      ? 'text-white'
      : positivo
        ? 'text-green-400'
        : 'text-red-400'

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 flex flex-col gap-1">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`text-xl font-bold ${color}`}>{valore}</p>
      {sub && <p className="text-xs text-slate-500">{sub}</p>}
    </div>
  )
}

export default function Indicatori({ etfList, prezziStorici = [], privacyMode = false }) {
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
    ? `${anni} ann${anni === 1 ? 'o' : 'i'} e ${mesiRest} mes${mesiRest === 1 ? 'e' : 'i'}`
    : `${mesiRest} mes${mesiRest === 1 ? 'e' : 'i'}`

  return (
    <div>
      <h2 className="text-base font-bold text-white mb-3">Indicatori portafoglio</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {/* Rendimento */}
        <Kpi
          label="ROI"
          valore={`${roi >= 0 ? '+' : ''}${fmt(roi)}%`}
          sub="Rendimento totale"
          positivo={roi >= 0}
        />
        <Kpi
          label="Rendimento netto"
          valore={pv(`${netto >= 0 ? '+' : ''}€${fmt(netto, 0)}`)}
          sub={pv(`su €${fmt(totInvestito, 0)}`)+` investiti`}
          positivo={netto >= 0}
        />
        <Kpi
          label="CAGR"
          valore={durataM >= 1 ? `${cagr >= 0 ? '+' : ''}${fmt(cagr)}%` : 'n/d'}
          sub="Rendimento annualizzato"
          positivo={durataM >= 1 ? cagr >= 0 : null}
        />
        <Kpi
          label="XIRR"
          valore={irr != null ? `${irr >= 0 ? '+' : ''}${fmt(irr)}%` : 'n/d'}
          sub="Crescita annua composta"
          positivo={irr != null ? irr >= 0 : null}
        />
        {/* Contesto */}
        <Kpi
          label="Valore portafoglio"
          valore={pv(`€${fmt(totValore, 0)}`)}
          neutro
        />
        <Kpi
          label="Durata"
          valore={durataStr}
          sub={`${durataM} mesi totali`}
          neutro
        />
        {/* Qualità */}
        <Kpi
          label="TWRR / ATWRR"
          valore={`${fmt(twrr)}%`}
          sub={`Annualizzato: ${fmt(atwrr)}%`}
          positivo={twrr >= 0}
        />
        {maxDrawdown != null && (
          <Kpi
            label="Max Drawdown"
            valore={`${fmt(maxDrawdown)}%`}
            sub="Perdita massima dal picco"
            positivo={false}
          />
        )}
        {volatilita != null && (
          <Kpi
            label="Volatilità"
            valore={`${fmt(volatilita)}%`}
            sub="Deviazione std. annualizzata"
            neutro
          />
        )}
      </div>
    </div>
  )
}
