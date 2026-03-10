import { differenceInMonths, differenceInCalendarDays, parseISO, addMonths, format } from 'date-fns'

// ── Helpers ────────────────────────────────────────────────────────────────

export function totaleInvestito(acquisti) {
  return acquisti.reduce((s, a) => s + a.importoInvestito, 0)
}

export function totaleQuote(acquisti) {
  return acquisti.reduce((s, a) => s + a.quoteFrazionate, 0)
}

export function valoreAttuale(acquisti, prezzoCorrente) {
  return totaleQuote(acquisti) * prezzoCorrente
}

// ── Indicatori ─────────────────────────────────────────────────────────────

/**
 * ROI = (ValoreAttuale - Investito) / Investito * 100
 */
export function calcolaROI(acquisti, prezzoCorrente) {
  const inv = totaleInvestito(acquisti)
  if (inv === 0) return 0
  const val = valoreAttuale(acquisti, prezzoCorrente)
  return ((val - inv) / inv) * 100
}

/**
 * Rendimento netto in €
 */
export function calcolaRendimentoNetto(acquisti, prezzoCorrente) {
  return valoreAttuale(acquisti, prezzoCorrente) - totaleInvestito(acquisti)
}

/**
 * Durata in mesi dal primo acquisto ad oggi
 */
export function calcolaDurataM(acquisti) {
  if (acquisti.length === 0) return 0
  const sorted = [...acquisti].sort((a, b) => a.data.localeCompare(b.data))
  const prima = parseISO(sorted[0].data)
  return differenceInMonths(new Date(), prima)
}

/**
 * CAGR = (ValoreAttuale / TotaleInvestito)^(1 / anni) - 1
 */
export function calcolaCAGR(acquisti, prezzoCorrente) {
  const inv = totaleInvestito(acquisti)
  if (inv === 0) return 0
  const val = valoreAttuale(acquisti, prezzoCorrente)
  const mesi = calcolaDurataM(acquisti)
  if (mesi < 1) return 0
  const anni = mesi / 12
  return (Math.pow(val / inv, 1 / anni) - 1) * 100
}

/**
 * TWRR approssimato sui giorni di acquisto PAC.
 * Per ogni sotto-periodo: (V_fine / V_inizio_dopo_flusso) - 1
 */
export function calcolaTWRR(acquisti, prezzoCorrente) {
  if (acquisti.length === 0) return 0
  const sorted = [...acquisti].sort((a, b) => a.data.localeCompare(b.data))

  let prodotto = 1
  let quoteAccumulate = 0

  for (let i = 0; i < sorted.length; i++) {
    const acq = sorted[i]
    const valoreInizio = quoteAccumulate * acq.prezzoUnitario
    const nuoveQuote = acq.quoteFrazionate
    const valoreDopoFlusso = valoreInizio + acq.importoInvestito

    quoteAccumulate += nuoveQuote

    // Prezzo fine: prossimo acquisto o prezzo corrente
    const prezzoFine = i + 1 < sorted.length ? sorted[i + 1].prezzoUnitario : prezzoCorrente
    const valoreFine = quoteAccumulate * prezzoFine

    if (valoreDopoFlusso > 0) {
      prodotto *= valoreFine / valoreDopoFlusso
    }
  }

  return (prodotto - 1) * 100
}

/**
 * ATWRR = media geometrica annualizzata del TWRR
 */
export function calcolaATWRR(acquisti, prezzoCorrente) {
  if (acquisti.length === 0) return 0
  const twrr = calcolaTWRR(acquisti, prezzoCorrente) / 100 + 1
  const mesi = calcolaDurataM(acquisti)
  if (mesi < 1) return 0
  return (Math.pow(twrr, 12 / mesi) - 1) * 100
}

/**
 * XIRR — Tasso Interno di Rendimento per flussi di cassa a date irregolari.
 *
 * Per un PAC ogni acquisto è un'uscita (flusso negativo) e il valore corrente
 * del portafoglio è un'entrata finale (flusso positivo). Restituisce l'IRR
 * annualizzato in % (es. 7.5 per 7.5%), oppure null se non converge o i dati
 * sono insufficienti.
 *
 * Algoritmo: Newton-Raphson sul NPV con convenzione gg/365.
 *
 * @param {Array}  acquisti    - array di acquisti { data: 'yyyy-MM-dd', importoInvestito }
 * @param {number} prezzoCorrente - valore attuale del portafoglio (€)
 */
export function calcolaIRR(acquisti, prezzoCorrente) {
  const valoreFinale = valoreAttuale(acquisti, prezzoCorrente)
  
  if (acquisti.length === 0 || valoreFinale <= 0) return null

  const sorted = [...acquisti].sort((a, b) => a.data.localeCompare(b.data))
  const dataRif = parseISO(sorted[0].data)
  const oggi = new Date()

  // Flussi: uscite negative agli acquisti, entrata positiva oggi
  const flussi = [
    ...sorted.map(acq => ({
      giorni: differenceInCalendarDays(parseISO(acq.data), dataRif),
      importo: -acq.importoInvestito,
    })),
    {
      giorni: differenceInCalendarDays(oggi, dataRif),
      importo: valoreFinale,
    },
  ]

  // NPV(r) = Σ [ importo_i / (1+r)^(giorni_i/365) ]
  const npv  = r => flussi.reduce((acc, f) => acc + f.importo / Math.pow(1 + r, f.giorni / 365), 0)
  // dNPV/dr
  const dnpv = r => flussi.reduce((acc, f) => acc - (f.giorni / 365) * f.importo / Math.pow(1 + r, f.giorni / 365 + 1), 0)

  let r = 0.1 // stima iniziale: 10%
  for (let i = 0; i < 200; i++) {
    const df = dnpv(r)
    if (Math.abs(df) < 1e-14) break
    const rNew = r - npv(r) / df
    if (rNew <= -1) return null
    if (Math.abs(rNew - r) < 1e-8) return rNew * 100
    r = rNew
  }

  return null // non converge
}

// ── Serie storiche ─────────────────────────────────────────────────────────

/**
 * Restituisce array di punti { data, valore } con valore reale del portafoglio
 * (basato sul prezzo di ogni acquisto come proxy del NAV a quella data)
 */
export function serieStorica(acquisti, prezzoCorrente) {
  if (acquisti.length === 0) return []
  const sorted = [...acquisti].sort((a, b) => a.data.localeCompare(b.data))

  const punti = []
  let quoteAcc = 0

  for (let i = 0; i < sorted.length; i++) {
    const acq = sorted[i]
    quoteAcc += acq.quoteFrazionate
    // Prezzo fine periodo = prossimo acquisto o prezzo corrente
    const prezzoFine = i + 1 < sorted.length ? sorted[i + 1].prezzoUnitario : prezzoCorrente
    punti.push({
      data: acq.data,
      valore: Math.round(quoteAcc * prezzoFine * 100) / 100,
    })
  }

  // Punto oggi con prezzo corrente
  punti.push({
    data: format(new Date(), 'yyyy-MM-dd'),
    valore: Math.round(quoteAcc * prezzoCorrente * 100) / 100,
  })

  return punti
}

// ── Proiezione ─────────────────────────────────────────────────────────────

/**
 * Proiezione con capitalizzazione composta mensile.
 * @param {number} valoreIniziale  - valore portafoglio oggi
 * @param {number} versamentoMensile - importo PAC mensile
 * @param {number} rendimentoAnnuo  - es. 0.07
 * @param {number} orizzonteAnni
 * @param {string} dataInizio - formato 'yyyy-MM-dd'
 * @returns array di { data, valore }
 */
export function calcolaProiezione(valoreIniziale, versamentoMensile, rendimentoAnnuo, orizzonteAnni, dataInizio) {
  const r = rendimentoAnnuo / 12
  const mesi = orizzonteAnni * 12
  const start = parseISO(dataInizio)
  const punti = []

  let valore = valoreIniziale

  for (let m = 1; m <= mesi; m++) {
    valore = valore * (1 + r) + versamentoMensile
    punti.push({
      data: format(addMonths(start, m), 'yyyy-MM-dd'),
      valore: Math.round(valore * 100) / 100,
    })
  }

  return punti
}

// ── Aggregati portafoglio ──────────────────────────────────────────────────

export function indicatoriPortafoglio(etfList) {
  let totInvestito = 0
  let totValore = 0

  for (const etf of etfList) {
    totInvestito += totaleInvestito(etf.acquisti)
    totValore += valoreAttuale(etf.acquisti, etf.prezzoCorrente)
  }

  const roi = totInvestito > 0 ? ((totValore - totInvestito) / totInvestito) * 100 : 0
  const netto = totValore - totInvestito

  // Durata: primo acquisto fra tutti gli ETF
  const tuttiAcquisti = etfList.flatMap(e => e.acquisti)
  const durataM = calcolaDurataM(tuttiAcquisti)

  // CAGR aggregato
  let cagr = 0
  if (totInvestito > 0 && durataM >= 1) {
    const anni = durataM / 12
    cagr = (Math.pow(totValore / totInvestito, 1 / anni) - 1) * 100
  }

  return { totInvestito, totValore, roi, netto, durataM, cagr }
}
