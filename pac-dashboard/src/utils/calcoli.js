import { differenceInMonths, differenceInCalendarDays, parseISO, addMonths, format } from 'date-fns'

// ── Helpers ────────────────────────────────────────────────────────────────

export function totaleInvestito(acquisti) {
  return acquisti.reduce((s, a) => s + a.importoInvestito + a.fee, 0)
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
      importo: -(acq.importoInvestito + acq.fee),
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

/**
 * Serie storica aggregata per più ETF con timeline unificata.
 * Risolve il problema dei cali artificiali quando gli ETF hanno date di acquisto diverse.
 * Per ogni data della timeline unificata, ogni ETF contribuisce con carry-forward
 * del proprio ultimo prezzo noto.
 */
export function serieStoricaAggregata(etfList) {
  if (!etfList || etfList.length === 0) return []

  // Fase 1: raccogliere tutte le date di acquisto (deduplicate)
  const dateSet = new Set()
  for (const etf of etfList) {
    for (const acq of (etf.acquisti || [])) {
      if (acq.data) dateSet.add(acq.data)
    }
  }

  const timeline = Array.from(dateSet).sort()
  if (timeline.length === 0) return []

  // Fase 2: per ogni data, sommare il contributo di tutti gli ETF (carry-forward)
  const punti = []
  for (const data of timeline) {
    let valoreGiorno = 0
    for (const etf of etfList) {
      let quoteAcc = 0
      let ultimoPrezzo = null
      for (const acq of (etf.acquisti || [])) {
        if (acq.data <= data) {
          quoteAcc += acq.quoteFrazionate
          ultimoPrezzo = acq.prezzoUnitario
        }
      }
      if (quoteAcc > 0 && ultimoPrezzo !== null) {
        valoreGiorno += quoteAcc * ultimoPrezzo
      }
    }
    if (valoreGiorno > 0) {
      punti.push({ data, valore: Math.round(valoreGiorno * 100) / 100 })
    }
  }

  // Fase 3: punto "oggi" con prezzoCorrente
  const oggi = format(new Date(), 'yyyy-MM-dd')
  if (!dateSet.has(oggi)) {
    let valoreOggi = 0
    for (const etf of etfList) {
      const quoteAcc = (etf.acquisti || []).reduce((s, a) => s + a.quoteFrazionate, 0)
      valoreOggi += quoteAcc * (etf.prezzoCorrente || 0)
    }
    if (valoreOggi > 0) {
      punti.push({ data: oggi, valore: Math.round(valoreOggi * 100) / 100 })
    }
  }

  return punti
}

/**
 * Serie storica mensile basata su etf_prezzi_storici.
 * Per ogni mese dalla data del primo acquisto ad oggi:
 *   - quote accumulate di ogni ETF fino a fine mese
 *   - prezzo con fallback a 3 livelli:
 *       1. prezzo esatto in etf_prezzi_storici per (isin, anno, mese)
 *       2. carry-forward: ultimo prezzo storico disponibile con chiave ≤ mese
 *       3. prezzoUnitario dell'acquisto più recente ≤ fine mese
 *   - contributo 0 solo se l'ETF non ha ancora acquisti in quel mese
 *
 * @param {Array}  etfList       - lista ETF con acquisti e prezzoCorrente
 * @param {Array}  prezziStorici - array di { isin, anno, mese, prezzo }
 * @returns array di { data: 'yyyy-MM-dd', valore }
 */
export function serieStoricaDaPrezziStorici(etfList, prezziStorici) {
  if (!etfList || etfList.length === 0) return []

  // Costruisce mappa prezziMap[isin]['yyyy-MM'] = prezzo
  const prezziMap = {}
  for (const p of (prezziStorici || [])) {
    if (!prezziMap[p.isin]) prezziMap[p.isin] = {}
    const key = `${p.anno}-${String(p.mese).padStart(2, '0')}`
    prezziMap[p.isin][key] = Number(p.prezzo)
  }

  // Trova la data del primo acquisto fra tutti gli ETF
  let minData = null
  for (const etf of etfList) {
    for (const acq of (etf.acquisti || [])) {
      if (!minData || acq.data < minData) minData = acq.data
    }
  }
  if (!minData) return []

  const oggi = new Date()
  const oggiStr = format(oggi, 'yyyy-MM-dd')
  const oggiMese = format(oggi, 'yyyy-MM')

  // Timeline mensile dal mese del primo acquisto al mese corrente
  const timeline = []
  let cur = parseISO(minData.slice(0, 7) + '-01')
  while (format(cur, 'yyyy-MM') <= oggiMese) {
    timeline.push(format(cur, 'yyyy-MM'))
    cur = addMonths(cur, 1)
  }

  const punti = []
  for (const meseKey of timeline) {
    // Il mese corrente viene aggiunto separatamente con prezzoCorrente
    if (meseKey === oggiMese) continue

    let valore = 0
    for (const etf of etfList) {
      let quoteAcc = 0
      let ultimoPrezzoAcquisto = null
      for (const acq of (etf.acquisti || [])) {
        if (acq.data.slice(0, 7) <= meseKey) {
          quoteAcc += acq.quoteFrazionate
          ultimoPrezzoAcquisto = acq.prezzoUnitario
        }
      }
      if (quoteAcc === 0) continue

      // Livello 1: prezzo esatto
      let prezzo = prezziMap[etf.isin]?.[meseKey] ?? null
      // Livello 2: carry-forward dal più recente prezzo storico ≤ mese
      if (prezzo === null && prezziMap[etf.isin]) {
        const chiavi = Object.keys(prezziMap[etf.isin]).filter(k => k <= meseKey).sort()
        if (chiavi.length > 0) prezzo = prezziMap[etf.isin][chiavi[chiavi.length - 1]]
      }
      // Livello 3: prezzoUnitario acquisto più recente
      if (prezzo === null) prezzo = ultimoPrezzoAcquisto

      if (prezzo !== null) valore += quoteAcc * prezzo
    }

    if (valore > 0) {
      punti.push({ data: meseKey + '-01', valore: Math.round(valore * 100) / 100 })
    }
  }

  // Punto oggi con prezzoCorrente (tutti gli ETF, inclusi archiviati)
  let valoreOggi = 0
  for (const etf of etfList) {
    const quoteAcc = (etf.acquisti || []).reduce((s, a) => s + a.quoteFrazionate, 0)
    valoreOggi += quoteAcc * (etf.prezzoCorrente || 0)
  }
  if (valoreOggi > 0) {
    punti.push({ data: oggiStr, valore: Math.round(valoreOggi * 100) / 100 })
  }

  return punti
}

// ── Indicatori di rischio ───────────────────────────────────────────────────

/**
 * Max Drawdown: massima perdita percentuale dal picco.
 * @param {Array} serie - array di { data, valore }
 * @returns numero in % (negativo), es. -23.5 per -23.5%, o null se dati insufficienti
 */
export function calcolaMaxDrawdown(serie) {
  if (!serie || serie.length < 2) return null
  let picco = -Infinity
  let maxDrawdown = 0
  for (const { valore } of serie) {
    if (valore > picco) picco = valore
    const dd = (valore - picco) / picco
    if (dd < maxDrawdown) maxDrawdown = dd
  }
  return maxDrawdown * 100
}

/**
 * Volatilità mensile annualizzata (deviazione standard dei rendimenti mensili * sqrt(12)).
 * @param {Array} serie - array di { data, valore } ordinato per data
 * @returns numero in % (es. 12.3 per 12.3%), o null se dati insufficienti (< 3 punti)
 */
export function calcolaVolatilita(serie) {
  if (!serie || serie.length < 3) return null
  const rendimenti = []
  for (let i = 1; i < serie.length; i++) {
    if (serie[i - 1].valore > 0) {
      rendimenti.push((serie[i].valore - serie[i - 1].valore) / serie[i - 1].valore)
    }
  }
  if (rendimenti.length < 2) return null
  const media = rendimenti.reduce((s, r) => s + r, 0) / rendimenti.length
  const varianza = rendimenti.reduce((s, r) => s + (r - media) ** 2, 0) / (rendimenti.length - 1)
  return Math.sqrt(varianza) * Math.sqrt(12) * 100
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
  let totFee = 0

  for (const etf of etfList) {
    totInvestito += totaleInvestito(etf.acquisti)
    totValore += valoreAttuale(etf.acquisti, etf.prezzoCorrente)
    totFee += etf.acquisti.reduce((s, a) => s + a.fee, 0)
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

  return { totInvestito, totValore, roi, netto, durataM, cagr, totFee }
}
