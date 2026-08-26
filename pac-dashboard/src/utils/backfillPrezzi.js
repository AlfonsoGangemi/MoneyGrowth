import { supabase } from './supabase'

const localKey = (isin) => `backfill_last_${isin}`
const todayStr = () => new Date().toISOString().slice(0, 10)

// True se l'ISIN non è ancora stato backfillato oggi (dedup giornaliera via localStorage).
export function needsBackfillToday(isin) {
  return localStorage.getItem(localKey(isin)) !== todayStr()
}

// Legge in una sola query i (anno, mese) già presenti per un set di ISIN.
// fromYear è il minimo tra le date di partenza — il chiamato partiziona per ISIN.
// Restituisce Map<isin, Set<'anno-mese'>>.
export async function fetchExistingMonths(isins, fromYear) {
  const map = new Map()
  if (!isins?.length) return map
  for (const isin of isins) map.set(isin, new Set())

  const { data } = await supabase
    .from('etf_prezzi_storici')
    .select('isin, anno, mese')
    .in('isin', isins)
    .gte('anno', fromYear)

  for (const r of data || []) {
    if (!map.has(r.isin)) map.set(r.isin, new Set())
    map.get(r.isin).add(`${r.anno}-${r.mese}`)
  }
  return map
}

function mesiTraDate(dateFromStr) {
  const result = []
  const [y0, m0] = dateFromStr.split('-').map(Number)
  const now = new Date()
  const y1 = now.getFullYear()
  const m1 = now.getMonth() + 1
  let y = y0, m = m0
  while (y < y1 || (y === y1 && m <= m1)) {
    result.push({ anno: y, mese: m })
    if (m === 12) { y++; m = 1 } else { m++ }
  }
  return result
}

// Da un array di righe ExtraETF chart ({ date, closing_price }) estrae, per ogni
// mese richiesto in mancantiSet, il prezzo dell'ultimo giorno di borsa.
function estraiPrezziMensili(isin, rows, mancantiSet) {
  const byMese = new Map()
  for (const row of rows) {
    if (!row.date) continue
    const [annoStr, meseStr] = row.date.split('-')
    const anno = Number(annoStr)
    const mese = Number(meseStr)
    const prezzo = Number(row.closing_price ?? row.close ?? 0)
    if (!prezzo) continue
    const key = `${anno}-${mese}`
    if (!byMese.has(key) || row.date > byMese.get(key).date) {
      byMese.set(key, { anno, mese, prezzo, date: row.date })
    }
  }
  return [...byMese.values()]
    .filter(r => mancantiSet.has(`${r.anno}-${r.mese}`))
    .map(({ anno, mese, prezzo }) => ({ isin, anno, mese, prezzo }))
}

// Backfilla i prezzi mensili mancanti per più ISIN in un solo giro:
//  - una query batch per i mesi già presenti (via fetchExistingMonths, salvo prefetch)
//  - una sola chiamata a /api/extraetf (modalità batch storico, N fetch upstream lato server)
//  - un solo upsert su etf_prezzi_storici
// items: [{ isin, dateFrom }]. Restituisce i record inseriti: [{ isin, anno, mese, prezzo }].
// forceRefresh bypassa la dedup giornaliera; existingByIsin è un prefetch opzionale.
export async function backfillETFPricesBatch(items, { forceRefresh = false, existingByIsin = null } = {}) {
  const today = todayStr()

  // Dedup giornaliera + validazione base
  const attivi = (items || []).filter(
    ({ isin, dateFrom }) => isin && dateFrom && (forceRefresh || needsBackfillToday(isin))
  )
  if (!attivi.length) return []

  // Mesi già presenti: prefetch se disponibile, altrimenti una query batch
  let existing = existingByIsin
  if (!existing) {
    const minFromYear = Math.min(...attivi.map(({ dateFrom }) => Number(dateFrom.slice(0, 4))))
    existing = await fetchExistingMonths(attivi.map(i => i.isin), minFromYear)
  }

  const now = new Date()
  const meseCorrKey = `${now.getFullYear()}-${now.getMonth() + 1}`

  // Pianifica i mesi mancanti per ISIN (nessuna rete). Gli ISIN già completi
  // vengono marcati come fatti oggi e scartati.
  const piani = []
  for (const { isin, dateFrom } of attivi) {
    const dateFromStr = dateFrom.slice(0, 10)
    const esistentiSet = existing.get(isin) ?? new Set()
    const mancanti = mesiTraDate(dateFromStr).filter(
      m => !esistentiSet.has(`${m.anno}-${m.mese}`) || `${m.anno}-${m.mese}` === meseCorrKey
    )
    if (mancanti.length === 0) {
      localStorage.setItem(localKey(isin), today)
      continue
    }
    const oldest = mancanti[0]
    piani.push({
      isin,
      apiDateFrom: `${oldest.anno}-${String(oldest.mese).padStart(2, '0')}-01`,
      mancantiSet: new Set(mancanti.map(m => `${m.anno}-${m.mese}`)),
    })
  }
  if (!piani.length) return []

  // Una sola call: tutti gli ISIN, range = min apiDateFrom (ogni ISIN filtra i propri mesi)
  const minDateFrom = piani.reduce((min, p) => (p.apiDateFrom < min ? p.apiDateFrom : min), piani[0].apiDateFrom)
  const params = new URLSearchParams({
    isins: piani.map(p => p.isin).join(','),
    date_from: minDateFrom,
    date_to: today,
  })

  let resultsByIsin
  try {
    const res = await fetch(`/api/extraetf?${params}`)
    if (!res.ok) return []
    const json = await res.json()
    resultsByIsin = json.results ?? {}
  } catch {
    return []
  }

  // Distribuzione per ISIN + upsert unico
  const toUpsert = []
  for (const { isin, mancantiSet } of piani) {
    const perIsin = resultsByIsin[isin]
    const rows = perIsin?.results ?? perIsin?.data ?? (Array.isArray(perIsin) ? perIsin : [])
    toUpsert.push(...estraiPrezziMensili(isin, rows, mancantiSet))
    localStorage.setItem(localKey(isin), today)
  }

  if (toUpsert.length > 0) {
    await supabase
      .from('etf_prezzi_storici')
      .upsert(toUpsert, { onConflict: 'isin,anno,mese' })
  }

  return toUpsert
}

// Backfill per singolo ISIN — delega a backfillETFPricesBatch.
// Restituisce i record appena inseriti in DB: [{ isin, anno, mese, prezzo }].
// forceRefresh: true bypassa il controllo localStorage (es. dopo un nuovo acquisto).
// existingMonths: Set<'anno-mese'> pre-caricato per evitare la query di lettura.
export async function backfillETFPrices(isin, dateFrom, { forceRefresh = false, existingMonths = null } = {}) {
  if (!isin || !dateFrom) return []
  const existingByIsin = existingMonths ? new Map([[isin, existingMonths]]) : null
  return backfillETFPricesBatch([{ isin, dateFrom }], { forceRefresh, existingByIsin })
}
