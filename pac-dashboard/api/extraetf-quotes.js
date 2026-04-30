import WebSocket from 'ws'

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

async function handleHistory(req, res) {
  const { isin, date_from, date_to } = req.query
  if (!isin || !ISIN_RE.test(isin)) return res.status(400).json({ error: 'ISIN non valido' })
  if (!DATE_RE.test(date_from)) return res.status(400).json({ error: 'date_from non valido' })
  if (date_to && !DATE_RE.test(date_to)) return res.status(400).json({ error: 'date_to non valido' })

  const to = date_to || new Date().toISOString().slice(0, 10)
  const url = `https://quotes.extraetf.com/v1/chart?isin=${isin}&currency=EUR&ordering=date&date_from=${date_from}&date_to=${to}&interval=1d&extraetf_locale=it`

  try {
    const upstream = await fetch(url, { headers: UPSTREAM_HEADERS })
    if (!upstream.ok) return res.status(502).json({ error: 'Errore upstream ExtraETF' })
    const data = await upstream.json()
    return res.status(200).json(data)
  } catch {
    return res.status(502).json({ error: 'Errore di rete' })
  }
}

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown'

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Troppe richieste. Riprova tra un minuto.' })
  }

  const allowedOrigin = process.env.ALLOWED_ORIGIN
  if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin)

  // History mode: date_from presente → REST chart API (un ISIN, range di date)
  if (req.query.date_from) return handleHistory(req, res)

  // Real-time mode: WebSocket (più ISIN, prezzo corrente)
  const rawIsins = req.query.isins
  if (!rawIsins) {
    return res.status(400).json({ error: 'Parametro isins mancante' })
  }

  const isins = rawIsins.split(',').map(s => s.trim()).filter(Boolean)
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
