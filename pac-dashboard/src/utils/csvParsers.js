// ── Mapping shape ─────────────────────────────────────────────────────────────
//
// {
//   // Indici di colonna (obbligatori)
//   date: number, isin: number, amount: number,
//   // Indici di colonna (opzionali)
//   name: number|null, price: number|null, shares: number|null,
//   fee: number|null, txId: number|null,
//   // Filtro su valori di colonna (es. category=TRADING per TR)
//   filters: Array<{ col: number, includes: string[] }> | null,
//   // Filtro su testo della descrizione (es. 'Acquisto'/'Vendita' per DEGIRO)
//   descCol: number|null, descIncludes: string[]|null,
//   // Testo descrizione per righe fee separate (es. 'Costi di transazione')
//   feeDescIncludes: string[]|null,
//   // Raggruppa righe per txId e unisce fee (DEGIRO: 2 righe per transazione)
//   mergeByTxId: boolean,
//   // Separatore decimale nella sorgente ('.' standard, ',' europeo)
//   decimalSep: '.' | ',',
//   // Formato data nella sorgente ('iso' = YYYY-MM-DD, 'dmy' = DD-MM-YYYY)
//   dateFormat: 'iso' | 'dmy',
//   // Estrae prezzo e quote dal testo descrizione (es. 'Acquisto 10 ETF @103,50 EUR')
//   extractFromDesc: boolean,
// }

function parseCsvRow(line, sep) {
  const result = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (c === sep && !inQuotes) {
      result.push(current)
      current = ''
    } else {
      current += c
    }
  }
  result.push(current)
  return result
}

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{10}$/

// Legge la prima riga del CSV e rileva il separatore.
// Restituisce { headers: string[], sep: string } oppure null se il testo è vuoto.
export function readCsvHeader(text) {
  if (!text?.trim()) return null
  const firstLine = text.trim().split('\n')[0]
  if (!firstLine) return null
  const sep = firstLine.includes(';') ? ';' : ','
  const headers = parseCsvRow(firstLine, sep).map(h => h.trim().toLowerCase())
  return { headers, sep }
}

// Colonne obbligatorie per riconoscere il formato Trade Republic.
const TR_REQUIRED = ['category', 'type', 'symbol', 'amount']

// Se gli header corrispondono al formato TR, restituisce il mapping pre-compilato.
// Altrimenti restituisce null.
export function detectTrMapping(headers) {
  if (!TR_REQUIRED.every(h => headers.includes(h))) return null

  const col = name => headers.indexOf(name)
  const opt = name => { const i = col(name); return i >= 0 ? i : null }

  return {
    date: col('date'), isin: col('symbol'), amount: col('amount'),
    name: opt('name'), price: opt('price'), shares: opt('shares'),
    fee: opt('fee'), txId: opt('transaction_id'),
    filters: [
      { col: col('category'), includes: ['TRADING'] },
      { col: col('type'),     includes: ['BUY', 'SELL'] },
    ],
    descCol: null, descIncludes: null, feeDescIncludes: null,
    mergeByTxId: false,
    decimalSep: '.',
    dateFormat: 'iso',
    extractFromDesc: false,
  }
}

export function parseGenericCsv(text, mapping) {
  if (!text?.trim()) return null

  const lines = text.trim().split('\n')
  if (lines.length < 2) return null

  const sep = lines[0].includes(';') ? ';' : ','

  const {
    date: iDate, isin: iIsin, amount: iAmount,
    name: iName = null, price: iPrice = null, shares: iShares = null,
    fee: iFee = null, txId: iTxId = null,
    filters = null,
    descCol: iDesc = null, descIncludes = null, feeDescIncludes = null,
    mergeByTxId = false,
    decimalSep = '.',
    dateFormat = 'iso',
    extractFromDesc = false,
  } = mapping

  function parseNum(val) {
    if (val == null) return 0
    let s = String(val).trim()
    if (decimalSep === ',') {
      s = s.replace(/\./g, '').replace(',', '.')
    }
    return parseFloat(s) || 0
  }

  function normalizeDate(val) {
    const s = (val ?? '').trim()
    if (dateFormat === 'dmy') {
      const [d, m, y] = s.split('-')
      if (d && m && y) return `${y}-${m}-${d}`
    }
    return s
  }

  // Estrae prezzo e quote dal testo: "Acquisto 10 ETF @103,50 EUR"
  function extractDescData(desc) {
    const qMatch = desc.match(/(Acquisto|Vendita)\s+(\d+)/)
    const pMatch = desc.match(/@([\d,.]+)/)
    const qty = qMatch ? parseInt(qMatch[2], 10) : 0
    const price = pMatch
      ? parseFloat(pMatch[1].replace(/\./g, '').replace(',', '.')) || 0
      : 0
    return { qty, price }
  }

  function passesFilters(cols) {
    if (filters) {
      if (!filters.every(f => f.includes.includes(cols[f.col]?.trim()))) return false
    }
    if (iDesc !== null && descIncludes) {
      const desc = cols[iDesc]?.trim() ?? ''
      if (!descIncludes.some(s => desc.includes(s))) return false
    }
    return true
  }

  // ── Modalità semplice: 1 riga per transazione (TR) ─────────────────────────
  if (!mergeByTxId) {
    const etfMap = {}

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim()
      if (!line) continue

      const cols = parseCsvRow(line, sep)
      if (!passesFilters(cols)) continue

      const isin = cols[iIsin]?.trim()
      if (!isin || !ISIN_RE.test(isin)) continue

      const nome   = iName   !== null ? (cols[iName]?.trim()    ?? '') : ''
      const data   = normalizeDate(cols[iDate])
      const amount = parseNum(cols[iAmount])
      const price  = iPrice  !== null ? parseNum(cols[iPrice])         : 0
      const qty    = iShares !== null ? parseNum(cols[iShares])        : 0
      const fee    = iFee    !== null ? Math.abs(parseNum(cols[iFee])) : 0
      const txId   = iTxId   !== null ? (cols[iTxId]?.trim() || null)  : null

      if (!etfMap[isin]) etfMap[isin] = { isin, nome, emittente: null, acquisti: [] }
      etfMap[isin].acquisti.push({
        data,
        importoInvestito:  -amount,
        prezzoUnitario:    price,
        quoteFrazionate:   qty,
        fee,
        broker_transaction_id: txId,
      })
    }

    return Object.keys(etfMap).length > 0 ? etfMap : null
  }

  // ── Modalità merge: 2 righe per transazione (DEGIRO) ───────────────────────
  // Prima passata: separa righe trade da righe fee
  const tradeRows = new Map() // txId → dati trade
  const feeAccum  = new Map() // txId → fee totale accumulata

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols  = parseCsvRow(line, sep)
    const txId  = iTxId !== null ? (cols[iTxId]?.trim() || null) : null
    const desc  = iDesc !== null ? (cols[iDesc]?.trim() ?? '')   : ''

    // Riga fee: accumula e vai alla prossima
    if (feeDescIncludes?.some(s => desc.includes(s))) {
      if (txId) {
        const feeVal = Math.abs(parseNum(cols[iAmount]))
        feeAccum.set(txId, (feeAccum.get(txId) ?? 0) + feeVal)
      }
      continue
    }

    // Riga non-trade (es. dividendo): ignora
    if (descIncludes && !descIncludes.some(s => desc.includes(s))) continue

    const isin = cols[iIsin]?.trim()
    if (!isin || !ISIN_RE.test(isin)) continue

    if (tradeRows.has(txId)) continue // duplicato, prendi solo la prima

    const nome   = iName   !== null ? (cols[iName]?.trim() ?? '') : ''
    const data   = normalizeDate(cols[iDate])
    const amount = parseNum(cols[iAmount])

    let price = iPrice  !== null ? parseNum(cols[iPrice])  : 0
    let qty   = iShares !== null ? parseNum(cols[iShares]) : 0

    if (extractFromDesc) {
      const { qty: dQty, price: dPrice } = extractDescData(desc)
      if (dQty)   qty   = dQty
      if (dPrice) price = dPrice
    }

    const feeFromCol = iFee !== null ? Math.abs(parseNum(cols[iFee])) : 0

    tradeRows.set(txId, { isin, nome, data, amount, price, qty, feeFromCol })
  }

  // Seconda passata: costruisce etfMap fondendo le fee accumulate
  const etfMap = {}

  for (const [txId, row] of tradeRows) {
    const { isin, nome, data, amount, price, qty, feeFromCol } = row
    const fee = feeFromCol + (feeAccum.get(txId) ?? 0)

    if (!etfMap[isin]) etfMap[isin] = { isin, nome, emittente: null, acquisti: [] }
    etfMap[isin].acquisti.push({
      data,
      importoInvestito:  -amount,
      prezzoUnitario:    price,
      quoteFrazionate:   qty,
      fee,
      broker_transaction_id: txId,
    })
  }

  return Object.keys(etfMap).length > 0 ? etfMap : null
}
