import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'

export function useBrokerImport() {
  const [isPro, setIsPro] = useState(null)
  const [syncLog, setSyncLog] = useState([])
  const [loading, setLoading] = useState(true)

  const fetchData = useCallback(async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [{ data: cfg }, { data: log }] = await Promise.all([
      supabase.from('config').select('is_pro').eq('user_id', user.id).maybeSingle(),
      supabase
        .from('broker_sync_log')
        .select('id, synced_at, source, rows_total, rows_inserted, rows_skipped, error_message, broker_id')
        .eq('user_id', user.id)
        .order('synced_at', { ascending: false })
        .limit(20),
    ])

    setIsPro(cfg?.is_pro ?? false)
    setSyncLog(log ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  async function importCsv(brokerId, csvText) {
    const etfMap = parseTrCsv(csvText)
    if (!etfMap) throw Object.assign(new Error(), { code: 'csv_non_riconosciuto' })

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.access_token) throw new Error('Sessione scaduta')

    const payload = {
      broker_id: brokerId,
      sync_source: 'ui_upload',
      etf: Object.values(etfMap),
    }

    const res = await fetch('/api/import', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(payload),
    })

    const body = await res.json()
    if (!res.ok) throw new Error(body.error ?? 'Errore import')

    await fetchData()
    return body
  }

  return { isPro, syncLog, loading, importCsv }
}

// ── Parser CSV Trade Republic ──────────────────────────────────────

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

function parseTrCsv(text) {
  const lines = text.trim().split('\n')
  if (lines.length < 2) return null

  const sep = lines[0].includes(';') ? ';' : ','
  const headers = parseCsvRow(lines[0], sep).map(h => h.trim().toLowerCase())

  const col = (name) => headers.indexOf(name)

  const iCategory    = col('category')
  const iType        = col('type')
  const iDate        = col('date')
  const iSymbol      = col('symbol')
  const iName        = col('name')
  const iShares      = col('shares')
  const iPrice       = col('price')
  const iAmount      = col('amount')
  const iFee         = col('fee')
  const iTxId        = col('transaction_id')

  if (iDate < 0 || iSymbol < 0 || iAmount < 0) return null

  const etfMap = {}

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const cols = parseCsvRow(line, sep)

    const category = iCategory >= 0 ? cols[iCategory]?.trim() : ''
    const type     = iType >= 0     ? cols[iType]?.trim()     : ''

    if (category !== 'TRADING' || !['BUY', 'SELL'].includes(type)) continue

    const isin = cols[iSymbol]?.trim()
    if (!isin || !/^[A-Z]{2}[A-Z0-9]{10}$/.test(isin)) continue

    const nome   = iName >= 0   ? cols[iName]?.trim()             : ''
    const data   = cols[iDate]?.trim() ?? ''
    const amount = parseFloat(cols[iAmount]) || 0
    const shares = iShares >= 0 ? parseFloat(cols[iShares]) || 0  : 0
    const price  = iPrice >= 0  ? parseFloat(cols[iPrice])  || 0  : 0
    const fee    = iFee >= 0    ? Math.abs(parseFloat(cols[iFee]) || 0) : 0
    const txId   = iTxId >= 0   ? (cols[iTxId]?.trim() || null)   : null

    if (!etfMap[isin]) {
      etfMap[isin] = { isin, nome, emittente: null, acquisti: [] }
    }

    etfMap[isin].acquisti.push({
      data,
      importoInvestito:  -amount,
      prezzoUnitario:    price,
      quoteFrazionate:   shares,
      fee,
      broker_transaction_id: txId,
    })
  }

  return Object.keys(etfMap).length > 0 ? etfMap : null
}
