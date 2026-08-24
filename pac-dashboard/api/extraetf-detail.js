import { fetchExtraEtfDetail } from './_lib/extraetf.js'

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

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown'

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Troppe richieste. Riprova tra un minuto.' })
  }

  const { isin } = req.query
  if (!isin) {
    return res.status(400).json({ error: 'Parametro isin mancante' })
  }
  if (!ISIN_RE.test(isin.trim())) {
    return res.status(400).json({ error: `ISIN non valido: ${isin}` })
  }

  const allowedOrigin = process.env.ALLOWED_ORIGIN
  if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin)

  const result = await fetchExtraEtfDetail(isin.trim())

  if (!result.ok) {
    if (result.reason === 'network') {
      if (process.env.NODE_ENV !== 'production') {
        console.error('[extraetf-detail] errore di rete')
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
