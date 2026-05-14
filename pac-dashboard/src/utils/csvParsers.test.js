import { describe, it, expect } from 'vitest'
import { parseGenericCsv, readCsvHeader, detectTrMapping } from './csvParsers'

// ── CSV Trade Republic ───────────────────────────────────────────────────────
// Headers: category(0) type(1) date(2) symbol(3) name(4) shares(5) price(6) amount(7) fee(8) transaction_id(9)

const TR_CSV = `category;type;date;symbol;name;shares;price;amount;fee;transaction_id
TRADING;BUY;2024-01-15;IE00B4L5Y983;iShares Core MSCI World ETF;10;103.50;-1035.00;-1.00;TR-001
TRADING;BUY;2024-02-10;IE00B4L5Y983;iShares Core MSCI World ETF;5;105.20;-526.00;-1.00;TR-002
TRADING;BUY;2024-01-20;LU1650490057;Amundi MSCI World;8;98.00;-784.00;-0.99;TR-003
TRADING;SELL;2024-03-01;IE00B4L5Y983;iShares Core MSCI World ETF;2;108.00;216.00;-1.00;TR-004
DIVIDEND;DIV;2024-02-01;IE00B4L5Y983;iShares Core MSCI World ETF;0;0;12.50;0;
`

const TR_MAPPING = {
  date: 2, isin: 3, amount: 7,
  name: 4, price: 6, shares: 5, fee: 8, txId: 9,
  filters: [
    { col: 0, includes: ['TRADING'] },
    { col: 1, includes: ['BUY', 'SELL'] },
  ],
  descCol: null, descIncludes: null, feeDescIncludes: null,
  mergeByTxId: false,
  decimalSep: '.',
  dateFormat: 'iso',
  extractFromDesc: false,
}

// ── CSV DEGIRO ───────────────────────────────────────────────────────────────
// Headers: Data(0) Ora(1) Prodotto(2) Codice ISIN(3) Descrizione(4) Importo(5) ID Ordine(6)
// - separatore: ; | decimale: , | date: DD-MM-YYYY
// - 2 righe per transazione: acquisto + fee con stesso "ID Ordine"
// - prezzo e quote estratti dalla descrizione: "Acquisto 10 ETF @103,50 EUR"

const DEGIRO_CSV = `Data;Ora;Prodotto;Codice ISIN;Descrizione;Importo;ID Ordine
15-01-2024;09:30;iShares Core MSCI World ETF;IE00B4L5Y983;Acquisto 10 ETF @103,50 EUR;-1035,00;DEG-001
15-01-2024;09:31;iShares Core MSCI World ETF;IE00B4L5Y983;Costi di transazione;-1,00;DEG-001
10-02-2024;10:00;iShares Core MSCI World ETF;IE00B4L5Y983;Acquisto 5 ETF @105,20 EUR;-526,00;DEG-002
10-02-2024;10:01;iShares Core MSCI World ETF;IE00B4L5Y983;Costi di transazione;-1,00;DEG-002
20-01-2024;11:00;Amundi MSCI World;LU1650490057;Acquisto 8 ETF @98,00 EUR;-784,00;DEG-003
20-01-2024;11:01;Amundi MSCI World;LU1650490057;Costi di transazione;-0,99;DEG-003
`

const DEGIRO_MAPPING = {
  date: 0, isin: 3, amount: 5,
  name: 2, price: null, shares: null, fee: null, txId: 6,
  filters: null,
  descCol: 4, descIncludes: ['Acquisto', 'Vendita'], feeDescIncludes: ['Costi di transazione'],
  mergeByTxId: true,
  decimalSep: ',',
  dateFormat: 'dmy',
  extractFromDesc: true,
}

// ── parseGenericCsv — Trade Republic ────────────────────────────────────────

describe('parseGenericCsv — Trade Republic', () => {
  it('importa BUY e SELL con ISIN valido', () => {
    const result = parseGenericCsv(TR_CSV, TR_MAPPING)
    expect(result).not.toBeNull()
    expect(Object.keys(result)).toContain('IE00B4L5Y983')
    expect(Object.keys(result)).toContain('LU1650490057')
  })

  it('filtra righe DIVIDEND (non TRADING)', () => {
    const result = parseGenericCsv(TR_CSV, TR_MAPPING)
    // IE00B4L5Y983: 2 BUY + 1 SELL = 3; il DIVIDEND è escluso
    expect(result['IE00B4L5Y983'].acquisti).toHaveLength(3)
  })

  it('importoInvestito è positivo (amount negato)', () => {
    const result = parseGenericCsv(TR_CSV, TR_MAPPING)
    const tx = result['IE00B4L5Y983'].acquisti.find(a => a.broker_transaction_id === 'TR-001')
    expect(tx.importoInvestito).toBe(1035.00)
  })

  it('fee è valore assoluto dalla colonna fee', () => {
    const result = parseGenericCsv(TR_CSV, TR_MAPPING)
    const tx = result['IE00B4L5Y983'].acquisti.find(a => a.broker_transaction_id === 'TR-001')
    expect(tx.fee).toBe(1.00)
  })

  it('legge prezzoUnitario e quoteFrazionate dalle colonne', () => {
    const result = parseGenericCsv(TR_CSV, TR_MAPPING)
    const tx = result['IE00B4L5Y983'].acquisti.find(a => a.broker_transaction_id === 'TR-001')
    expect(tx.prezzoUnitario).toBe(103.50)
    expect(tx.quoteFrazionate).toBe(10)
  })

  it('legge broker_transaction_id', () => {
    const result = parseGenericCsv(TR_CSV, TR_MAPPING)
    const ids = result['IE00B4L5Y983'].acquisti.map(a => a.broker_transaction_id)
    expect(ids).toContain('TR-001')
    expect(ids).toContain('TR-002')
  })

  it('data rimane in formato ISO', () => {
    const result = parseGenericCsv(TR_CSV, TR_MAPPING)
    const tx = result['IE00B4L5Y983'].acquisti.find(a => a.broker_transaction_id === 'TR-001')
    expect(tx.data).toBe('2024-01-15')
  })
})

// ── parseGenericCsv — DEGIRO ─────────────────────────────────────────────────

describe('parseGenericCsv — DEGIRO', () => {
  it('importa acquisti con ISIN valido', () => {
    const result = parseGenericCsv(DEGIRO_CSV, DEGIRO_MAPPING)
    expect(result).not.toBeNull()
    expect(Object.keys(result)).toContain('IE00B4L5Y983')
    expect(Object.keys(result)).toContain('LU1650490057')
  })

  it('unisce riga acquisto e riga fee con stesso ID Ordine (2 righe → 1 acquisto)', () => {
    const result = parseGenericCsv(DEGIRO_CSV, DEGIRO_MAPPING)
    // DEG-001 e DEG-002 → 2 acquisti, non 4
    expect(result['IE00B4L5Y983'].acquisti).toHaveLength(2)
  })

  it('normalizza numeri europei: -1035,00 → 1035.00', () => {
    const result = parseGenericCsv(DEGIRO_CSV, DEGIRO_MAPPING)
    const tx = result['IE00B4L5Y983'].acquisti.find(a => a.broker_transaction_id === 'DEG-001')
    expect(tx.importoInvestito).toBe(1035.00)
  })

  it('normalizza date DD-MM-YYYY → YYYY-MM-DD', () => {
    const result = parseGenericCsv(DEGIRO_CSV, DEGIRO_MAPPING)
    const tx = result['IE00B4L5Y983'].acquisti.find(a => a.broker_transaction_id === 'DEG-001')
    expect(tx.data).toBe('2024-01-15')
  })

  it('fee dalla riga separata con stesso ID Ordine', () => {
    const result = parseGenericCsv(DEGIRO_CSV, DEGIRO_MAPPING)
    const tx = result['IE00B4L5Y983'].acquisti.find(a => a.broker_transaction_id === 'DEG-001')
    expect(tx.fee).toBe(1.00)
  })

  it('fee è somma di più righe fee con stesso ID Ordine', () => {
    const csvDoppiaCosti = `Data;Ora;Prodotto;Codice ISIN;Descrizione;Importo;ID Ordine
15-01-2024;09:30;iShares World;IE00B4L5Y983;Acquisto 10 ETF @100,00 EUR;-1000,00;DEG-010
15-01-2024;09:31;iShares World;IE00B4L5Y983;Costi di transazione;-0,50;DEG-010
15-01-2024;09:32;iShares World;IE00B4L5Y983;Costi di transazione;-0,50;DEG-010
`
    const result = parseGenericCsv(csvDoppiaCosti, DEGIRO_MAPPING)
    const tx = result['IE00B4L5Y983'].acquisti[0]
    expect(tx.fee).toBe(1.00)
  })

  it('estrae prezzoUnitario dalla descrizione (@103,50 → 103.50)', () => {
    const result = parseGenericCsv(DEGIRO_CSV, DEGIRO_MAPPING)
    const tx = result['IE00B4L5Y983'].acquisti.find(a => a.broker_transaction_id === 'DEG-001')
    expect(tx.prezzoUnitario).toBe(103.50)
  })

  it('estrae quoteFrazionate dalla descrizione (Acquisto 10 → 10)', () => {
    const result = parseGenericCsv(DEGIRO_CSV, DEGIRO_MAPPING)
    const tx = result['IE00B4L5Y983'].acquisti.find(a => a.broker_transaction_id === 'DEG-001')
    expect(tx.quoteFrazionate).toBe(10)
  })

  it('esclude righe non filtrate dalla descrizione (es. Dividendo)', () => {
    const csvConDividendo = `Data;Ora;Prodotto;Codice ISIN;Descrizione;Importo;ID Ordine
15-01-2024;09:30;iShares World;IE00B4L5Y983;Acquisto 10 ETF @100,00 EUR;-1000,00;DEG-020
15-01-2024;09:31;iShares World;IE00B4L5Y983;Costi di transazione;-1,00;DEG-020
15-01-2024;10:00;iShares World;IE00B4L5Y983;Dividendo;50,00;DEG-021
`
    const result = parseGenericCsv(csvConDividendo, DEGIRO_MAPPING)
    expect(result['IE00B4L5Y983'].acquisti).toHaveLength(1)
  })
})

// ── Edge cases ───────────────────────────────────────────────────────────────

describe('parseGenericCsv — edge cases', () => {
  it('restituisce null per testo vuoto', () => {
    expect(parseGenericCsv('', TR_MAPPING)).toBeNull()
  })

  it('restituisce null se nessuna riga valida dopo il filtro', () => {
    const soloHeader = `category;type;date;symbol;name;shares;price;amount;fee;transaction_id\n`
    expect(parseGenericCsv(soloHeader, TR_MAPPING)).toBeNull()
  })

  it('scarta ISIN non validi (TR)', () => {
    const csvIsinErrato = `category;type;date;symbol;name;shares;price;amount;fee;transaction_id
TRADING;BUY;2024-01-15;INVALIDO;ETF X;10;100.00;-1000.00;-1.00;TX-1
TRADING;BUY;2024-01-16;IE00B4L5Y983;iShares World;10;100.00;-1000.00;-1.00;TX-2
`
    const result = parseGenericCsv(csvIsinErrato, TR_MAPPING)
    expect(Object.keys(result)).not.toContain('INVALIDO')
    expect(Object.keys(result)).toContain('IE00B4L5Y983')
  })

  it('scarta ISIN non validi (DEGIRO)', () => {
    const csvIsinErrato = `Data;Ora;Prodotto;Codice ISIN;Descrizione;Importo;ID Ordine
15-01-2024;09:30;ETF X;INVALIDO;Acquisto 10 ETF @100,00 EUR;-1000,00;DEG-099
15-01-2024;09:30;iShares World;IE00B4L5Y983;Acquisto 5 ETF @100,00 EUR;-500,00;DEG-100
`
    const result = parseGenericCsv(csvIsinErrato, DEGIRO_MAPPING)
    expect(Object.keys(result)).not.toContain('INVALIDO')
    expect(Object.keys(result)).toContain('IE00B4L5Y983')
  })
})

// ── readCsvHeader ─────────────────────────────────────────────────────────────

describe('readCsvHeader', () => {
  it('legge header e rileva separatore ; (Trade Republic)', () => {
    const { headers, sep } = readCsvHeader(TR_CSV)
    expect(sep).toBe(';')
    expect(headers).toContain('symbol')
    expect(headers).toContain('category')
    expect(headers).toContain('transaction_id')
  })

  it('legge header e rileva separatore ; (DEGIRO)', () => {
    const { headers, sep } = readCsvHeader(DEGIRO_CSV)
    expect(sep).toBe(';')
    expect(headers).toContain('codice isin')
    expect(headers).toContain('descrizione')
  })

  it('legge header con separatore virgola', () => {
    const csv = `date,isin,amount\n2024-01-15,IE00B4L5Y983,1000`
    const { headers, sep } = readCsvHeader(csv)
    expect(sep).toBe(',')
    expect(headers).toEqual(['date', 'isin', 'amount'])
  })

  it('normalizza in minuscolo gli header', () => {
    const csv = `Date;ISIN;Amount\n2024-01-15;IE00B4L5Y983;1000`
    const { headers } = readCsvHeader(csv)
    expect(headers).toEqual(['date', 'isin', 'amount'])
  })

  it('restituisce null per testo vuoto', () => {
    expect(readCsvHeader('')).toBeNull()
    expect(readCsvHeader('   ')).toBeNull()
  })
})

// ── detectTrMapping ───────────────────────────────────────────────────────────

describe('detectTrMapping', () => {
  it('riconosce il formato Trade Republic e restituisce il mapping', () => {
    const { headers } = readCsvHeader(TR_CSV)
    const mapping = detectTrMapping(headers)
    expect(mapping).not.toBeNull()
  })

  it('mappa gli indici di colonna corretti per TR', () => {
    // category(0) type(1) date(2) symbol(3) name(4) shares(5) price(6) amount(7) fee(8) transaction_id(9)
    const { headers } = readCsvHeader(TR_CSV)
    const mapping = detectTrMapping(headers)
    expect(mapping.date).toBe(2)
    expect(mapping.isin).toBe(3)   // symbol → isin
    expect(mapping.amount).toBe(7)
    expect(mapping.fee).toBe(8)
    expect(mapping.txId).toBe(9)
  })

  it('il mapping TR produce gli stessi risultati di TR_MAPPING hardcoded', () => {
    const { headers } = readCsvHeader(TR_CSV)
    const mapping = detectTrMapping(headers)
    const result = parseGenericCsv(TR_CSV, mapping)
    expect(result).not.toBeNull()
    expect(Object.keys(result)).toContain('IE00B4L5Y983')
    expect(Object.keys(result)).toContain('LU1650490057')
    expect(result['IE00B4L5Y983'].acquisti).toHaveLength(3)
    const tx = result['IE00B4L5Y983'].acquisti.find(a => a.broker_transaction_id === 'TR-001')
    expect(tx.importoInvestito).toBe(1035.00)
    expect(tx.fee).toBe(1.00)
  })

  it('restituisce null per CSV DEGIRO (mancano category/type/symbol)', () => {
    const { headers } = readCsvHeader(DEGIRO_CSV)
    expect(detectTrMapping(headers)).toBeNull()
  })

  it('restituisce null per CSV generico senza colonne TR', () => {
    const csv = `date,isin,amount\n2024-01-15,IE00B4L5Y983,1000`
    const { headers } = readCsvHeader(csv)
    expect(detectTrMapping(headers)).toBeNull()
  })
})
