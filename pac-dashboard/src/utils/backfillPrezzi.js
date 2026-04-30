import { supabase } from './supabase'

const localKey = (isin) => `backfill_last_${isin}`
const todayStr = () => new Date().toISOString().slice(0, 10)

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

// Backfilla i prezzi mensili mancanti per un ISIN a partire da dateFrom.
// Restituisce i record appena inseriti in DB: [{ isin, anno, mese, prezzo }]
// Usa localStorage per evitare chiamate ridondanti nella stessa giornata (per ISIN).
// forceRefresh: true bypassa il controllo localStorage (es. dopo un nuovo acquisto).
export async function backfillETFPrices(isin, dateFrom, { forceRefresh = false } = {}) {
  if (!isin || !dateFrom) return []

  const today = todayStr()
  if (!forceRefresh && localStorage.getItem(localKey(isin)) === today) return []

  const dateFromStr = dateFrom.slice(0, 10)
  const fromYear = Number(dateFromStr.slice(0, 4))

  const { data: esistenti } = await supabase
    .from('etf_prezzi_storici')
    .select('anno, mese')
    .eq('isin', isin)
    .gte('anno', fromYear)

  const esistentiSet = new Set((esistenti || []).map(r => `${r.anno}-${r.mese}`))

  const now = new Date()
  const meseCorrKey = `${now.getFullYear()}-${now.getMonth() + 1}`

  // Mesi mancanti + mese corrente (va sempre rinfrescato)
  const mancanti = mesiTraDate(dateFromStr).filter(
    m => !esistentiSet.has(`${m.anno}-${m.mese}`) || `${m.anno}-${m.mese}` === meseCorrKey
  )

  if (mancanti.length === 0) {
    localStorage.setItem(localKey(isin), today)
    return []
  }

  const oldest = mancanti[0]
  const apiDateFrom = `${oldest.anno}-${String(oldest.mese).padStart(2, '0')}-01`
  const params = new URLSearchParams({ isin, date_from: apiDateFrom, date_to: today })

  let json
  try {
    const res = await fetch(`/api/extraetf-quotes?${params}`)
    if (!res.ok) return []
    json = await res.json()
  } catch {
    return []
  }

  // ExtraETF chart API: { count, results: [{ date, closing_price, ... }] }
  const rows = json.results ?? json.data ?? []
  if (!rows.length) {
    localStorage.setItem(localKey(isin), today)
    return []
  }

  // Raggruppa per (anno, mese) → tieni l'ultimo giorno di borsa del mese
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

  const mancantiSet = new Set(mancanti.map(m => `${m.anno}-${m.mese}`))
  const toUpsert = [...byMese.values()]
    .filter(r => mancantiSet.has(`${r.anno}-${r.mese}`))
    .map(({ anno, mese, prezzo }) => ({ isin, anno, mese, prezzo }))

  if (toUpsert.length > 0) {
    await supabase
      .from('etf_prezzi_storici')
      .upsert(toUpsert, { onConflict: 'isin,anno,mese' })
  }

  localStorage.setItem(localKey(isin), today)
  return toUpsert
}
