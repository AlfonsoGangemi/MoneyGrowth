import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import {
  totaleInvestito,
  totaleQuote,
  valoreAttuale,
  calcolaROI,
  calcolaRendimentoNetto,
  calcolaDurataM,
  calcolaCAGR,
  calcolaTWRR,
  calcolaATWRR,
  calcolaIRR,
  serieStorica,
  serieStoricaAggregata,
  serieStoricaDaPrezziStorici,
  calcolaMaxDrawdown,
  calcolaVolatilita,
  calcolaProiezione,
  indicatoriPortafoglio,
} from './calcoli'

// ── Helpers ─────────────────────────────────────────────────────────────────

function acq(data, importoInvestito, prezzoUnitario, fee = 0) {
  return {
    data,
    importoInvestito,
    prezzoUnitario,
    quoteFrazionate: importoInvestito / prezzoUnitario,
    fee,
  }
}

// ── totaleInvestito / valoreAttuale (AC#5) ───────────────────────────────────

describe('totaleInvestito', () => {
  it('array vuoto → 0', () => {
    expect(totaleInvestito([])).toBe(0)
  })

  it('acquisto singolo senza fee', () => {
    expect(totaleInvestito([acq('2024-01-01', 100, 50)])).toBe(100)
  })

  it('acquisto singolo con fee', () => {
    expect(totaleInvestito([acq('2024-01-01', 100, 50, 2)])).toBe(102)
  })

  it('acquisti multipli con fee', () => {
    const acquisti = [
      acq('2024-01-01', 100, 50, 1),
      acq('2024-02-01', 200, 60, 2),
      acq('2024-03-01', 150, 55, 0),
    ]
    expect(totaleInvestito(acquisti)).toBe(453)
  })
})

describe('valoreAttuale', () => {
  it('array vuoto → 0', () => {
    expect(valoreAttuale([], 100)).toBe(0)
  })

  it('acquisto singolo: quote * prezzoCorrente', () => {
    // 100 / 50 = 2 quote, prezzoCorrente 60 → 120
    expect(valoreAttuale([acq('2024-01-01', 100, 50)], 60)).toBeCloseTo(120)
  })

  it('acquisti multipli', () => {
    const acquisti = [
      acq('2024-01-01', 100, 50), // 2 quote
      acq('2024-02-01', 150, 75), // 2 quote
    ] // 4 quote totali, prezzoCorrente 80 → 320
    expect(valoreAttuale(acquisti, 80)).toBeCloseTo(320)
  })
})

// ── calcolaROI ───────────────────────────────────────────────────────────────

describe('calcolaROI', () => {
  it('investito = 0 → 0', () => {
    expect(calcolaROI([], 100)).toBe(0)
  })

  it('prezzo invariato → ROI 0%', () => {
    const acquisti = [acq('2024-01-01', 100, 50)]
    expect(calcolaROI(acquisti, 50)).toBeCloseTo(0)
  })

  it('prezzo raddoppiato → ROI 100%', () => {
    const acquisti = [acq('2024-01-01', 100, 50)]
    expect(calcolaROI(acquisti, 100)).toBeCloseTo(100)
  })
})

describe('calcolaRendimentoNetto', () => {
  it('prezzo invariato → 0', () => {
    const acquisti = [acq('2024-01-01', 100, 50)]
    expect(calcolaRendimentoNetto(acquisti, 50)).toBeCloseTo(0)
  })

  it('guadagno netto corretto', () => {
    const acquisti = [acq('2024-01-01', 100, 50)] // 2 quote
    // valore 2*75=150, investito 100 → netto 50
    expect(calcolaRendimentoNetto(acquisti, 75)).toBeCloseTo(50)
  })
})

// ── calcolaCAGR (AC#3) ───────────────────────────────────────────────────────

describe('calcolaCAGR', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('inv = 0 → 0', () => {
    expect(calcolaCAGR([], 100)).toBe(0)
  })

  it('durata < 1 mese → 0', () => {
    vi.setSystemTime(new Date('2024-01-15'))
    const acquisti = [acq('2024-01-10', 100, 50)]
    expect(calcolaCAGR(acquisti, 60)).toBe(0)
  })

  it('esattamente 1 anno, val = 2 * inv → CAGR ≈ 100%', () => {
    vi.setSystemTime(new Date('2025-01-01'))
    const acquisti = [acq('2024-01-01', 100, 50)] // 2 quote
    // valoreAttuale = 2 * prezzoCorrente; vogliamo val = 200 → prezzo 100
    expect(calcolaCAGR(acquisti, 100)).toBeCloseTo(100, 0)
  })

  it('2 anni, val = 1.44 * inv → CAGR ≈ 20%', () => {
    vi.setSystemTime(new Date('2026-01-01'))
    const acquisti = [acq('2024-01-01', 100, 50)] // 2 quote
    // (1.2)^2 = 1.44 → prezzoCorrente tale che val = 144
    // val = 2 * p = 144 → p = 72
    expect(calcolaCAGR(acquisti, 72)).toBeCloseTo(20, 0)
  })
})

// ── calcolaTWRR / calcolaATWRR (AC#2) ───────────────────────────────────────

describe('calcolaTWRR', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('array vuoto → 0', () => {
    expect(calcolaTWRR([], 100)).toBe(0)
  })

  it('acquisto singolo, prezzo invariato → 0%', () => {
    vi.setSystemTime(new Date('2025-01-01'))
    const acquisti = [acq('2024-01-01', 100, 50)]
    expect(calcolaTWRR(acquisti, 50)).toBeCloseTo(0)
  })

  it('acquisto singolo, prezzo raddoppiato → 100%', () => {
    vi.setSystemTime(new Date('2025-01-01'))
    const acquisti = [acq('2024-01-01', 100, 50)]
    expect(calcolaTWRR(acquisti, 100)).toBeCloseTo(100)
  })

  it('due acquisti: verifica moltiplicazione sotto-periodi', () => {
    vi.setSystemTime(new Date('2025-03-01'))
    // Periodo 1: compra a 100, poi prezzo sale a 110 (+10%)
    // Periodo 2: compra a 110, poi prezzo finale 121 (+10%)
    // TWRR = (1.1 * 1.1 - 1) * 100 = 21%
    const acquisti = [
      acq('2024-01-01', 100, 100), // 1 quota
      acq('2024-06-01', 110, 110), // 1 quota
    ]
    expect(calcolaTWRR(acquisti, 121)).toBeCloseTo(21, 0)
  })
})

describe('calcolaATWRR', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('array vuoto → 0', () => {
    expect(calcolaATWRR([], 100)).toBe(0)
  })

  it('durata < 1 mese → 0', () => {
    vi.setSystemTime(new Date('2024-01-15'))
    const acquisti = [acq('2024-01-10', 100, 50)]
    expect(calcolaATWRR(acquisti, 60)).toBe(0)
  })

  it('TWRR 100% in 2 anni → ATWRR ≈ 41.4% (media geometrica)', () => {
    vi.setSystemTime(new Date('2026-01-01'))
    const acquisti = [acq('2024-01-01', 100, 50)] // 2 quote
    // prezzoCorrente 100 → val 200 → TWRR 100%
    // annualizzato su 24 mesi: (2)^(12/24) - 1 = sqrt(2) - 1 ≈ 41.4%
    expect(calcolaATWRR(acquisti, 100)).toBeCloseTo(41.4, 0)
  })
})

// ── calcolaIRR / XIRR (AC#1) ────────────────────────────────────────────────

describe('calcolaIRR', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('array vuoto → null', () => {
    expect(calcolaIRR([], 0)).toBeNull()
  })

  it('valoreFinale ≤ 0 → null', () => {
    const acquisti = [acq('2024-01-01', 100, 50)]
    // prezzoCorrente 0 → valoreAttuale = 0
    expect(calcolaIRR(acquisti, 0)).toBeNull()
  })

  it('acquisto singolo, prezzo invariato dopo 1 anno → IRR ≈ 0%', () => {
    vi.setSystemTime(new Date('2025-01-01'))
    const acquisti = [acq('2024-01-01', 100, 50)] // 2 quote
    // val = 2 * 50 = 100 = investito → IRR ≈ 0%
    const irr = calcolaIRR(acquisti, 50)
    expect(irr).not.toBeNull()
    expect(irr).toBeCloseTo(0, 1)
  })

  it('acquisto singolo, +10% dopo 1 anno → IRR ≈ 10%', () => {
    vi.setSystemTime(new Date('2025-01-01'))
    const acquisti = [acq('2024-01-01', 100, 50)] // 2 quote
    // val = 2 * 55 = 110 (investito 100) → IRR ≈ 10%
    const irr = calcolaIRR(acquisti, 55)
    expect(irr).not.toBeNull()
    expect(irr).toBeCloseTo(10, 0)
  })

  it('PAC mensile: 12 rate da 100 → IRR positivo se valore cresce', () => {
    vi.setSystemTime(new Date('2025-01-01'))
    const acquisti = Array.from({ length: 12 }, (_, i) => {
      const mese = String(i + 1).padStart(2, '0')
      return acq(`2024-${mese}-01`, 100, 50 + i) // prezzo cresce gradualmente
    })
    const irr = calcolaIRR(acquisti, 65)
    expect(irr).not.toBeNull()
    expect(irr).toBeGreaterThan(0)
  })
})

// ── serieStoricaDaPrezziStorici (AC#4) ───────────────────────────────────────

describe('serieStoricaDaPrezziStorici', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('lista ETF vuota → []', () => {
    expect(serieStoricaDaPrezziStorici([], [])).toEqual([])
  })

  it('ETF senza acquisti → []', () => {
    const etfList = [{ isin: 'IE001', acquisti: [], prezzoCorrente: 100 }]
    expect(serieStoricaDaPrezziStorici(etfList, [])).toEqual([])
  })

  it('prezzo esatto disponibile → valore corretto', () => {
    vi.setSystemTime(new Date('2024-03-15'))
    const etfList = [{
      isin: 'IE001',
      acquisti: [acq('2024-01-15', 100, 50)], // 2 quote
      prezzoCorrente: 60,
    }]
    const prezziStorici = [{ isin: 'IE001', anno: 2024, mese: 1, prezzo: 52 }]
    const serie = serieStoricaDaPrezziStorici(etfList, prezziStorici)
    // Il punto 2024-01 usa prezzo 52 → 2 * 52 = 104
    const punto2401 = serie.find(p => p.data === '2024-01-01')
    expect(punto2401).toBeDefined()
    expect(punto2401.valore).toBeCloseTo(104)
  })

  it('carry-forward: mese senza prezzo storico usa ultimo disponibile', () => {
    vi.setSystemTime(new Date('2024-04-15'))
    const etfList = [{
      isin: 'IE001',
      acquisti: [acq('2024-01-15', 100, 50)], // 2 quote
      prezzoCorrente: 60,
    }]
    // Prezzo disponibile solo per gennaio; febbraio deve fare carry-forward
    const prezziStorici = [{ isin: 'IE001', anno: 2024, mese: 1, prezzo: 52 }]
    const serie = serieStoricaDaPrezziStorici(etfList, prezziStorici)
    const punto2402 = serie.find(p => p.data === '2024-02-01')
    expect(punto2402).toBeDefined()
    expect(punto2402.valore).toBeCloseTo(104) // carry-forward da gennaio
  })

  it('livello 3 fallback: nessun prezzo storico → usa prezzoUnitario acquisto', () => {
    vi.setSystemTime(new Date('2024-03-15'))
    const etfList = [{
      isin: 'IE001',
      acquisti: [acq('2024-01-15', 100, 50)], // 2 quote, prezzoUnitario 50
      prezzoCorrente: 60,
    }]
    const serie = serieStoricaDaPrezziStorici(etfList, [])
    const punto2401 = serie.find(p => p.data === '2024-01-01')
    expect(punto2401).toBeDefined()
    expect(punto2401.valore).toBeCloseTo(100) // 2 * 50
  })

  it('punto oggi usa prezzoCorrente', () => {
    vi.setSystemTime(new Date('2024-03-15'))
    const etfList = [{
      isin: 'IE001',
      acquisti: [acq('2024-01-15', 100, 50)], // 2 quote
      prezzoCorrente: 70,
    }]
    const serie = serieStoricaDaPrezziStorici(etfList, [])
    const oggiStr = '2024-03-15'
    const puntoOggi = serie.find(p => p.data === oggiStr)
    expect(puntoOggi).toBeDefined()
    expect(puntoOggi.valore).toBeCloseTo(140) // 2 * 70
  })
})

// ── calcolaMaxDrawdown (AC bonus) ────────────────────────────────────────────

describe('calcolaMaxDrawdown', () => {
  it('serie undefined o < 2 punti → null', () => {
    expect(calcolaMaxDrawdown(null)).toBeNull()
    expect(calcolaMaxDrawdown([])).toBeNull()
    expect(calcolaMaxDrawdown([{ data: '2024-01', valore: 100 }])).toBeNull()
  })

  it('serie monotona crescente → drawdown = 0', () => {
    const serie = [100, 110, 120, 130].map((v, i) => ({ data: `2024-0${i + 1}`, valore: v }))
    expect(calcolaMaxDrawdown(serie)).toBeCloseTo(0)
  })

  it('drawdown noto: picco 100 → valle 75 → -25%', () => {
    const serie = [
      { data: '2024-01', valore: 100 },
      { data: '2024-02', valore: 75 },
      { data: '2024-03', valore: 90 },
    ]
    expect(calcolaMaxDrawdown(serie)).toBeCloseTo(-25)
  })

  it('drawdown multipli: restituisce il massimo', () => {
    const serie = [
      { data: '2024-01', valore: 100 },
      { data: '2024-02', valore: 80 },  // -20%
      { data: '2024-03', valore: 120 },
      { data: '2024-04', valore: 60 },  // -50% dal nuovo picco
    ]
    expect(calcolaMaxDrawdown(serie)).toBeCloseTo(-50)
  })
})

// ── calcolaVolatilita (AC bonus) ─────────────────────────────────────────────

describe('calcolaVolatilita', () => {
  it('serie < 3 punti → null', () => {
    expect(calcolaVolatilita(null)).toBeNull()
    expect(calcolaVolatilita([{ valore: 100 }, { valore: 110 }])).toBeNull()
  })

  it('rendimenti costanti → volatilità = 0', () => {
    // Tutti i rendimenti mensili identici (10%) → std dev = 0
    const serie = [100, 110, 121, 133.1].map((v, i) => ({ data: `2024-0${i + 1}`, valore: v }))
    expect(calcolaVolatilita(serie)).toBeCloseTo(0)
  })

  it('serie con rendimenti variabili → volatilità > 0', () => {
    const serie = [100, 110, 95, 120, 105].map((v, i) => ({ data: `2024-0${i + 1}`, valore: v }))
    const vol = calcolaVolatilita(serie)
    expect(vol).not.toBeNull()
    expect(vol).toBeGreaterThan(0)
  })
})

// ── serieStorica ─────────────────────────────────────────────────────────────

describe('serieStorica', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('acquisti vuoti → []', () => {
    expect(serieStorica([], 100)).toEqual([])
  })

  it('acquisto singolo → punto acquisto + punto oggi', () => {
    vi.setSystemTime(new Date('2024-06-01'))
    const acquisti = [acq('2024-01-01', 100, 50)] // 2 quote
    const serie = serieStorica(acquisti, 60)
    // 2 punti: data acquisto e oggi
    expect(serie.length).toBe(2)
    // Punto acquisto: prezzoFine = prezzoCorrente (unico acquisto) → 2*60=120
    expect(serie[0].data).toBe('2024-01-01')
    expect(serie[0].valore).toBeCloseTo(120)
    // Punto oggi
    expect(serie[1].data).toBe('2024-06-01')
    expect(serie[1].valore).toBeCloseTo(120)
  })

  it('due acquisti → valore intermedio usa prezzo secondo acquisto', () => {
    vi.setSystemTime(new Date('2024-06-01'))
    const acquisti = [
      acq('2024-01-01', 100, 50), // 2 quote
      acq('2024-03-01', 100, 60), // ~1.667 quote
    ]
    const serie = serieStorica(acquisti, 70)
    expect(serie.length).toBe(3)
    // Primo punto: quote 2, prezzoFine = 60 (prezzo secondo acq) → 120
    expect(serie[0].valore).toBeCloseTo(120)
    // Secondo punto: quote 2+1.667≈3.667, prezzoFine = 70 (corrente) → ~256.67
    expect(serie[1].valore).toBeCloseTo(256.67, 0)
  })
})

// ── serieStoricaAggregata ────────────────────────────────────────────────────

describe('serieStoricaAggregata', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('lista vuota → []', () => {
    expect(serieStoricaAggregata([])).toEqual([])
    expect(serieStoricaAggregata(null)).toEqual([])
  })

  it('ETF senza acquisti → []', () => {
    expect(serieStoricaAggregata([{ acquisti: [], prezzoCorrente: 100 }])).toEqual([])
  })

  it('un ETF, un acquisto → punto + punto oggi', () => {
    vi.setSystemTime(new Date('2024-06-01'))
    const etfList = [{
      acquisti: [acq('2024-01-01', 100, 50)], // 2 quote
      prezzoCorrente: 60,
    }]
    const serie = serieStoricaAggregata(etfList)
    expect(serie.length).toBe(2)
    expect(serie[0].data).toBe('2024-01-01')
    expect(serie[0].valore).toBeCloseTo(100) // 2 * 50 (carry-forward)
    expect(serie[1].data).toBe('2024-06-01')
    expect(serie[1].valore).toBeCloseTo(120) // 2 * 60
  })

  it('due ETF con date diverse → timeline unificata', () => {
    vi.setSystemTime(new Date('2024-06-01'))
    const etfList = [
      { acquisti: [acq('2024-01-01', 100, 50)], prezzoCorrente: 60 }, // 2 quote
      { acquisti: [acq('2024-03-01', 200, 80)], prezzoCorrente: 90 }, // 2.5 quote
    ]
    const serie = serieStoricaAggregata(etfList)
    // Date: 2024-01-01, 2024-03-01, oggi
    expect(serie.length).toBe(3)
    // Primo punto 2024-01: solo ETF1 (2q * 50 = 100)
    expect(serie[0].data).toBe('2024-01-01')
    expect(serie[0].valore).toBeCloseTo(100)
    // Secondo punto 2024-03: ETF1 (2*50=100) + ETF2 (2.5*80=200) = 300
    expect(serie[1].data).toBe('2024-03-01')
    expect(serie[1].valore).toBeCloseTo(300)
  })
})

// ── calcolaProiezione ────────────────────────────────────────────────────────

describe('calcolaProiezione', () => {
  it('0 mesi → array vuoto', () => {
    const serie = calcolaProiezione(1000, 100, 0.07, 0, '2024-01-01')
    expect(serie).toEqual([])
  })

  it('rendimento 0%, 1 anno → versamenti accumulati linearmente', () => {
    const serie = calcolaProiezione(0, 100, 0, 1, '2024-01-01')
    expect(serie.length).toBe(12)
    // Senza rendimento: valore cresce di 100 ogni mese
    expect(serie[0].valore).toBeCloseTo(100)
    expect(serie[11].valore).toBeCloseTo(1200)
  })

  it('valore iniziale senza versamenti cresce geometricamente', () => {
    // 1000 € al 12% annuo (1% mensile), nessun versamento, 12 mesi
    const serie = calcolaProiezione(1000, 0, 0.12, 1, '2024-01-01')
    expect(serie.length).toBe(12)
    // Valore finale: 1000 * (1.01)^12 ≈ 1126.83
    expect(serie[11].valore).toBeCloseTo(1126.83, 0)
  })

  it('restituisce date progressive mensili', () => {
    const serie = calcolaProiezione(0, 100, 0, 3, '2024-01-01')
    expect(serie[0].data).toBe('2024-02-01')
    expect(serie[1].data).toBe('2024-03-01')
    expect(serie[2].data).toBe('2024-04-01')
  })
})

// ── indicatoriPortafoglio ────────────────────────────────────────────────────

describe('indicatoriPortafoglio', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('lista vuota → tutti zero', () => {
    vi.setSystemTime(new Date('2024-06-01'))
    const r = indicatoriPortafoglio([])
    expect(r.totInvestito).toBe(0)
    expect(r.totValore).toBe(0)
    expect(r.roi).toBe(0)
    expect(r.cagr).toBe(0)
  })

  it('un ETF, prezzo invariato → ROI 0, CAGR 0', () => {
    vi.setSystemTime(new Date('2025-01-01'))
    const etfList = [{
      acquisti: [acq('2024-01-01', 100, 50)], // 2 quote
      prezzoCorrente: 50,
    }]
    const r = indicatoriPortafoglio(etfList)
    expect(r.totInvestito).toBeCloseTo(100)
    expect(r.totValore).toBeCloseTo(100)
    expect(r.roi).toBeCloseTo(0)
    expect(r.cagr).toBeCloseTo(0, 0)
  })

  it('due ETF → somma investito (con fee) e valore, fee aggregate', () => {
    vi.setSystemTime(new Date('2025-01-01'))
    const etfList = [
      { acquisti: [acq('2024-01-01', 100, 50, 2)], prezzoCorrente: 60 }, // 2q, fee 2
      { acquisti: [acq('2024-01-01', 200, 80, 3)], prezzoCorrente: 100 }, // 2.5q, fee 3
    ]
    const r = indicatoriPortafoglio(etfList)
    // totaleInvestito include fee: (100+2) + (200+3) = 305
    expect(r.totInvestito).toBeCloseTo(305)
    expect(r.totValore).toBeCloseTo(2 * 60 + 2.5 * 100) // 120 + 250 = 370
    expect(r.totFee).toBeCloseTo(5)
    expect(r.roi).toBeCloseTo((370 - 305) / 305 * 100, 0)
  })
})
