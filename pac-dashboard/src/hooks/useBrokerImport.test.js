import { describe, it, expect } from 'vitest'
import { parseCsvRow, parseTrCsv } from './useBrokerImport'

// ── CSV di esempio Trade Republic ────────────────────────────────────────────

const TR_CSV = `category;type;date;symbol;name;shares;price;amount;fee;transaction_id
TRADING;BUY;2024-01-15;IE00B4L5Y983;iShares Core MSCI World ETF;10;103.50;-1035.00;-1.00;TR-001
TRADING;BUY;2024-02-10;IE00B4L5Y983;iShares Core MSCI World ETF;5;105.20;-526.00;-1.00;TR-002
TRADING;BUY;2024-01-20;LU1650490057;Amundi MSCI World;8;98.00;-784.00;-0.99;TR-003
TRADING;SELL;2024-03-01;IE00B4L5Y983;iShares Core MSCI World ETF;2;108.00;216.00;-1.00;TR-004
DIVIDEND;DIV;2024-02-01;IE00B4L5Y983;iShares Core MSCI World ETF;0;0;12.50;0;
`

// ── CSV broker generico (es. formato DEGIRO-like) ────────────────────────────

const GENERIC_CSV = `date,isin,name,amount,price,shares,fee,order_id
2024-01-15,IE00B4L5Y983,iShares Core MSCI World ETF,1035.00,103.50,10,1.00,GEN-001
2024-02-10,IE00B4L5Y983,iShares Core MSCI World ETF,526.00,105.20,5,1.00,GEN-002
2024-01-20,LU1650490057,Amundi MSCI World,784.00,98.00,8,0.99,GEN-003
`

// ── parseCsvRow ──────────────────────────────────────────────────────────────

describe('parseCsvRow', () => {
  it('separa colonne con punto e virgola', () => {
    expect(parseCsvRow('a;b;c', ';')).toEqual(['a', 'b', 'c'])
  })

  it('separa colonne con virgola', () => {
    expect(parseCsvRow('a,b,c', ',')).toEqual(['a', 'b', 'c'])
  })

  it('gestisce valori tra virgolette', () => {
    expect(parseCsvRow('"hello, world";foo', ';')).toEqual(['hello, world', 'foo'])
  })

  it('gestisce virgolette doppie escaped', () => {
    expect(parseCsvRow('"say ""hi""";ok', ';')).toEqual(['say "hi"', 'ok'])
  })
})

// ── parseTrCsv ───────────────────────────────────────────────────────────────

describe('parseTrCsv — formato Trade Republic', () => {
  it('restituisce null per testo vuoto', () => {
    expect(parseTrCsv('')).toBeNull()
  })

  it('restituisce null per CSV senza header riconoscibili', () => {
    expect(parseTrCsv('col1,col2\nval1,val2')).toBeNull()
  })

  it('restituisce null se non ci sono transazioni BUY/SELL', () => {
    const onlyDividend = `category;type;date;symbol;name;shares;price;amount;fee;transaction_id
DIVIDEND;DIV;2024-02-01;IE00B4L5Y983;iShares;0;0;12.50;0;`
    expect(parseTrCsv(onlyDividend)).toBeNull()
  })

  it('importa acquisti BUY con ISIN valido', () => {
    const result = parseTrCsv(TR_CSV)
    expect(result).not.toBeNull()
    expect(Object.keys(result)).toContain('IE00B4L5Y983')
    expect(Object.keys(result)).toContain('LU1650490057')
  })

  it('esclude le righe non-TRADING (es. DIVIDEND)', () => {
    const result = parseTrCsv(TR_CSV)
    // IE00B4L5Y983 ha 2 BUY + 1 SELL = 3 acquisti (SELL incluso come acquisto negativo)
    expect(result['IE00B4L5Y983'].acquisti).toHaveLength(3)
  })

  it('importo diventa positivo (negato) per BUY', () => {
    const result = parseTrCsv(TR_CSV)
    const primoAcquisto = result['IE00B4L5Y983'].acquisti.find(a => a.broker_transaction_id === 'TR-001')
    expect(primoAcquisto.importoInvestito).toBe(1035.00)
  })

  it('legge fee come valore assoluto', () => {
    const result = parseTrCsv(TR_CSV)
    const primoAcquisto = result['IE00B4L5Y983'].acquisti.find(a => a.broker_transaction_id === 'TR-001')
    expect(primoAcquisto.fee).toBe(1.00)
  })

  it('legge broker_transaction_id', () => {
    const result = parseTrCsv(TR_CSV)
    const txIds = result['IE00B4L5Y983'].acquisti.map(a => a.broker_transaction_id)
    expect(txIds).toContain('TR-001')
    expect(txIds).toContain('TR-002')
  })

  it('scarta ISIN non validi', () => {
    const csvConIsinErrato = `category;type;date;symbol;name;shares;price;amount;fee;transaction_id
TRADING;BUY;2024-01-15;INVALIDO;ETF X;10;100.00;-1000.00;-1.00;TX-1
TRADING;BUY;2024-01-16;IE00B4L5Y983;iShares World;10;100.00;-1000.00;-1.00;TX-2
`
    const result = parseTrCsv(csvConIsinErrato)
    expect(result).not.toBeNull()
    expect(Object.keys(result)).not.toContain('INVALIDO')
    expect(Object.keys(result)).toContain('IE00B4L5Y983')
  })
})

// ── parseGenericCsv — broker generico ────────────────────────────────────────
// Questi test documentano il comportamento atteso di parseGenericCsv (PAC-143).
// La funzione verrà implementata in src/utils/csvParsers.js.

describe('parseGenericCsv — broker generico (PAC-143)', () => {
  it.todo('importa tutte le righe con ISIN valido da CSV senza filtro category/type')
  it.todo('mapping manuale: date=0 isin=1 amount=3 produce gli stessi ETF di parseTrCsv')
  it.todo('parseGenericCsv con mapping TR equivale a parseTrCsv')
  it.todo('restituisce null se i campi obbligatori (date, isin, amount) non sono mappati')
  it.todo('ignora righe con ISIN non valido anche con broker generico')
})
