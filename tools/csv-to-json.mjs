#!/usr/bin/env node
/**
 * csv-to-json.mjs
 * Converte ETF e acquisti da CSV al formato JSON di importazione PAC-Dashboard.
 *
 * Utilizzo:
 *   node tools/csv-to-json.mjs \
 *     --seed   export.json       # JSON esportato dall'app (fornisce broker UUID)
 *     --etf    etf.csv           # CSV ETF
 *     --acquisti acquisti.csv    # CSV acquisti
 *     --out    output.json       # File di output (default: output.json)
 *
 * Formato CSV (separatore ';', decimali ',', date 'dd/mm/yyyy'):
 *   etf.csv       (riga 0 = intestazione)  →  isin;nome;emittente
 *   acquisti.csv  (riga 0 = intestazione)  →  broker;data;isin;nome;valore;qta;fee;totale_investito
 *
 * Nota: valore = prezzo unitario, importoInvestito = valore × qta
 */

import fs   from 'fs'
import path from 'path'
import url  from 'url'
import crypto from 'crypto'

// ── Argomenti CLI ────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = {}
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) {
      args[argv[i].slice(2)] = argv[i + 1]
      i++
    }
  }
  return args
}

const args = parseArgs(process.argv.slice(2))

const seedPath     = args.seed
const etfPath      = args.etf
const acquistiPath = args.acquisti
const outPath      = args.out || 'output.json'

if (!seedPath || !etfPath || !acquistiPath) {
  console.error('Utilizzo: node tools/csv-to-json.mjs --seed export.json --etf etf.csv --acquisti acquisti.csv [--out output.json]')
  process.exit(1)
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Converte un numero in stringa italiana ("1.234,56") → float */
function parseItalianNumber(str) {
  // Rimuove punti migliaia, sostituisce virgola decimale con punto
  return parseFloat(str.replace(/\./g, '').replace(',', '.'))
}

/** Converte data 'dd/mm/yyyy' → 'yyyy-mm-dd' */
function convertDate(ddmmyyyy) {
  const [dd, mm, yyyy] = ddmmyyyy.trim().split('/')
  if (!dd || !mm || !yyyy) throw new Error(`Formato data non valido: "${ddmmyyyy}" (atteso dd/mm/yyyy)`)
  return `${yyyy}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}`
}

/** UUID v4 deterministico da una stringa (SHA-256 → UUID format) */
function deterministicUUID(input) {
  const hash = crypto.createHash('sha256').update(input).digest('hex')
  return [
    hash.slice(0, 8),
    hash.slice(8, 12),
    '4' + hash.slice(13, 16),           // version 4
    ((parseInt(hash[16], 16) & 0x3) | 0x8).toString(16) + hash.slice(17, 20), // variant
    hash.slice(20, 32),
  ].join('-')
}

/** UUID v4 casuale */
function randomUUID() {
  return crypto.randomUUID()
}

/** Legge un file CSV e restituisce array di righe (array di stringhe per colonna).
 *  Salta la prima riga (intestazione). Ignora righe vuote. */
function readCSV(filePath) {
  const content = fs.readFileSync(filePath, 'utf-8')
  const lines = content.split(/\r?\n/)
  return lines
    .slice(1)                                      // skip intestazione
    .filter(l => l.trim() !== '')                  // skip righe vuote
    .map(l => l.split(';').map(c => c.trim()))     // split per ';'
}

// ── Lettura seed ─────────────────────────────────────────────────────────────

const seed = JSON.parse(fs.readFileSync(seedPath, 'utf-8'))

/** Map nome broker (lowercase) → UUID, costruita dal seed */
const brokerByName = new Map()
for (const b of (seed.broker || [])) {
  brokerByName.set(b.nome.toLowerCase(), b.id)
}

if (brokerByName.size === 0) {
  console.error('Errore: il file seed non contiene broker. Crea prima i broker nell\'app ed esegui un export.')
  process.exit(1)
}

console.log(`Broker trovati nel seed: ${[...brokerByName.keys()].join(', ')}`)

// ── Parsing ETF ──────────────────────────────────────────────────────────────

// Pre-popola etfMap dal seed (preserva UUID, acquisti e config esistenti)
const etfMap = new Map() // ISIN → oggetto ETF
for (const etf of (seed.etf || [])) {
  etfMap.set(etf.isin.toUpperCase(), etf)
}
console.log(`ETF già presenti nel seed: ${etfMap.size}`)

// Colonne: isin;nome;emittente
const etfRows = readCSV(etfPath)

for (const [isin, nome, emittente] of etfRows) {
  if (!isin) { console.warn('Riga ETF senza ISIN, saltata'); continue }
  const key = isin.toUpperCase()
  if (etfMap.has(key)) {
    console.warn(`ISIN "${key}" già presente nel seed — riga etf.csv saltata (verranno aggiunti solo i nuovi acquisti)`)
    continue
  }
  const id = deterministicUUID(key)
  etfMap.set(key, {
    id,
    nome:            nome || '',
    isin:            key,
    emittente:       emittente || '',
    importoFisso:    0,       // non presente nel CSV, impostato a 0
    prezzoCorrente:  0,       // aggiornabile dall'app via JustETF
    archiviato:      false,
    acquisti:        [],
  })
}

console.log(`ETF totali (seed + CSV): ${etfMap.size}`)

// ── Parsing Acquisti ─────────────────────────────────────────────────────────

// Colonne: broker;data;isin;nome;valore;qta;fee;totale_investito
// totale_investito è usato solo per validazione (±0.02 €)

const acquistiRows = readCSV(acquistiPath)
let acquistiOk     = 0
let acquistiWarn   = 0

for (const cols of acquistiRows) {
  const [brokerNome, dataCsv, isin, , valoreStr, qtaStr, feeStr, totaleStr] = cols

  if (!isin) { console.warn('Riga acquisto senza ISIN, saltata'); continue }

  // Risolvi broker
  const brokerId = brokerByName.get(brokerNome.trim().toLowerCase())
  if (!brokerId) {
    console.warn(`Broker "${brokerNome}" non trovato nel seed — riga saltata (data: ${dataCsv}, ISIN: ${isin})`)
    acquistiWarn++
    continue
  }

  // Risolvi ETF
  const etf = etfMap.get(isin.trim().toUpperCase())
  if (!etf) {
    console.warn(`ISIN "${isin}" non trovato tra gli ETF del CSV — riga saltata (data: ${dataCsv})`)
    acquistiWarn++
    continue
  }

  // Valori numerici
  const valore = parseItalianNumber(valoreStr)   // prezzoUnitario
  const qta    = parseItalianNumber(qtaStr)       // quoteFrazionate
  const fee    = parseItalianNumber(feeStr)

  const importoInvestito = parseFloat((valore * qta).toFixed(6))

  // Validazione opzionale totale_investito (±0.02 €)
  if (totaleStr && totaleStr.trim() !== '') {
    const totaleAtteso = parseItalianNumber(totaleStr)
    const diff = Math.abs((importoInvestito + fee) - totaleAtteso)
    if (diff > 0.02) {
      console.warn(
        `Acquisto ${dataCsv} ${isin}: totale calcolato (${(importoInvestito + fee).toFixed(2)}) ` +
        `differisce da totale_investito CSV (${totaleAtteso.toFixed(2)}) di ${diff.toFixed(4)} €`
      )
      acquistiWarn++
    }
  }

  // Data
  const data = convertDate(dataCsv)

  etf.acquisti.push({
    id:              randomUUID(),
    data,
    importoInvestito,
    prezzoUnitario:  valore,
    quoteFrazionate: qta,
    fee,
    brokerId,
  })

  acquistiOk++
}

console.log(`Acquisti importati: ${acquistiOk}  |  Avvisi: ${acquistiWarn}`)

// ── Costruzione JSON output ──────────────────────────────────────────────────

const output = {
  etf:              [...etfMap.values()],
  broker:           seed.broker           || [],
  scenari:          seed.scenari          || [],
  orizzonteAnni:    seed.orizzonteAnni    ?? 10,
  mostraProiezione: seed.mostraProiezione ?? true,
  brokerFiltro:     seed.brokerFiltro     || [],
}

fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8')
console.log(`\nOutput scritto in: ${outPath}`)
console.log(`ETF: ${output.etf.length}  |  Acquisti totali: ${output.etf.reduce((s, e) => s + e.acquisti.length, 0)}  |  Broker: ${output.broker.length}`)
