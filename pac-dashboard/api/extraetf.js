import WebSocket from 'ws'
import { fetchExtraEtfDetail } from './_lib/extraetf.js'

// PAC-161: accorpamento di extraetf-quotes.js + extraetf-detail.js in un unico
// endpoint dispatchato sui query param, per liberare uno slot Serverless Function
// (limite piano Hobby Vercel). Tre rami, nessuna ambiguità tra loro:
//   1. date_from presente               → storico REST (batch via isins, PAC-162: unico percorso)
//   2. date_from assente + isins plurale → real-time via WebSocket
//   3. date_from assente + isin singolare (no isins) → dettaglio fondo

const RATE_LIMIT = 60
const RATE_WINDOW = 60 * 1000
const rateMap = new Map()

function isRateLimited(ip) {
  const now = Date.now()
  const entry = rateMap.get(ip) || { count: 0, start: now }
  if (now - entry.start > RATE_WINDOW) {
    rateMap.set(ip, { count: 1, start: now })
    return false
  }
  if (entry.count >= RATE_LIMIT) return true
  rateMap.set(ip, { count: entry.count + 1, start: entry.start })
  return false
}

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{10}$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const MAX_ISINS = 20
const WS_TIMEOUT_MS = 8000

const UPSTREAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Accept': 'application/json',
  'Referer': 'https://extraetf.com/',
  'Origin': 'https://extraetf.com',
}

function chartUrl(isin, dateFrom, dateTo) {
  return `https://quotes.extraetf.com/v1/chart?isin=${isin}&currency=EUR&ordering=date&date_from=${dateFrom}&date_to=${dateTo}&interval=1d&extraetf_locale=it`
}

async function fetchChart(isin, dateFrom, dateTo) {
  const upstream = await fetch(chartUrl(isin, dateFrom, dateTo), { headers: UPSTREAM_HEADERS })
  if (!upstream.ok) return null
  return upstream.json()
}

// History: unico percorso per lo storico (PAC-162 — il ramo single-ISIN via `isin=`
// era dead code, nessun chiamante reale lo usava). Un solo round-trip client → N fetch
// upstream in parallelo, anche per un solo ISIN. Risposta: { results: { [isin]: <chart json> } }
// (ISIN falliti omessi).
async function handleHistoryBatch(req, res, isins) {
  const { date_from, date_to } = req.query
  if (!DATE_RE.test(date_from)) return res.status(400).json({ error: 'date_from non valido' })
  if (date_to && !DATE_RE.test(date_to)) return res.status(400).json({ error: 'date_to non valido' })
  if (isins.length > MAX_ISINS) return res.status(400).json({ error: `Massimo ${MAX_ISINS} ISIN per richiesta` })
  for (const isin of isins) {
    if (!ISIN_RE.test(isin)) return res.status(400).json({ error: `ISIN non valido: ${isin}` })
  }

  const to = date_to || new Date().toISOString().slice(0, 10)
  const entries = await Promise.all(isins.map(async (isin) => {
    try {
      return [isin, await fetchChart(isin, date_from, to)]
    } catch {
      return [isin, null]
    }
  }))

  const results = {}
  for (const [isin, data] of entries) if (data) results[isin] = data
  return res.status(200).json({ results })
}

function handleRealtime(res, isins) {
  return new Promise((resolve) => {
    const pending = new Set(isins)
    const received = {}
    let settled = false

    function finish() {
      if (settled) return
      settled = true
      try { ws.terminate() } catch (_) {}
      const missing = isins.filter(i => !(i in received))
      resolve(res.status(200).json({ prices: received, missing }))
    }

    const ws = new WebSocket('wss://quotes.extraetf.com/v1/ws', {
      headers: {
        Origin: 'https://extraetf.com',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      },
    })

    const timer = setTimeout(finish, WS_TIMEOUT_MS)

    ws.on('open', () => {
      ws.send(JSON.stringify({ subscribe: { isins } }))
    })

    ws.on('message', (data) => {
      try {
        const msg = JSON.parse(data.toString())
        if (msg.i && pending.has(msg.i) && msg.m != null) {
          received[msg.i] = Number(msg.m)
          pending.delete(msg.i)
          if (pending.size === 0) {
            clearTimeout(timer)
            finish()
          }
        }
      } catch (_) {}
    })

    ws.on('error', () => {
      clearTimeout(timer)
      finish()
    })

    ws.on('close', () => {
      clearTimeout(timer)
      finish()
    })
  })
}

async function handleDetail(req, res) {
  const { isin } = req.query
  if (!isin) {
    return res.status(400).json({ error: 'Parametro isin mancante' })
  }
  if (!ISIN_RE.test(isin.trim())) {
    return res.status(400).json({ error: `ISIN non valido: ${isin}` })
  }

  const result = await fetchExtraEtfDetail(isin.trim())

  if (!result.ok) {
    if (result.reason === 'network') {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[extraetf] errore di rete (detail)')
      }
      return res.status(502).json({ error: 'errore di rete' })
    }
    if (result.reason === 'invalid_json') {
      return res.status(502).json({ error: 'Risposta non valida da ExtraETF' })
    }
    return res.status(result.status ?? 404).json({ error: 'ISIN non trovato su ExtraETF' })
  }

  return res.status(200).json(result.data)
}

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown'

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Troppe richieste. Riprova tra un minuto.' })
  }

  const allowedOrigin = process.env.ALLOWED_ORIGIN
  if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin)

  // 1. Storico: date_from presente (solo isins plurale — PAC-162, gestisce anche 1 solo ISIN)
  if (req.query.date_from) {
    const isins = (req.query.isins || '').split(',').map(s => s.trim()).filter(Boolean)
    if (isins.length === 0) return res.status(400).json({ error: 'Nessun ISIN valido' })
    return handleHistoryBatch(req, res, isins)
  }

  // 2. Real-time: isins plurale, senza date_from
  if (req.query.isins) {
    const isins = req.query.isins.split(',').map(s => s.trim()).filter(Boolean)
    if (isins.length === 0) {
      return res.status(400).json({ error: 'Nessun ISIN valido' })
    }
    if (isins.length > MAX_ISINS) {
      return res.status(400).json({ error: `Massimo ${MAX_ISINS} ISIN per richiesta` })
    }
    for (const isin of isins) {
      if (!ISIN_RE.test(isin)) {
        return res.status(400).json({ error: `ISIN non valido: ${isin}` })
      }
    }
    return handleRealtime(res, isins)
  }

  // 3. Dettaglio fondo: isin singolare, senza date_from né isins
  return handleDetail(req, res)
}
