const ALLOWED_PATH_PREFIX = 'api/etfs/'
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

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown'

  if (isRateLimited(ip)) {
    return res.status(429).json({ error: 'Troppe richieste. Riprova tra un minuto.' })
  }

  const { proxyPath, ...queryParams } = req.query

  if (!proxyPath) {
    return res.status(400).json({ error: 'proxyPath mancante' })
  }

  if (proxyPath.includes('..') || !proxyPath.startsWith(ALLOWED_PATH_PREFIX)) {
    return res.status(400).json({ error: 'proxyPath non consentito' })
  }

  const qs = new URLSearchParams(queryParams).toString()
  const targetUrl = `https://www.justetf.com/${proxyPath}${qs ? '?' + qs : ''}`

  if (process.env.NODE_ENV !== 'production') {
    console.log('[justetf-proxy] → GET', targetUrl)
  }

  let response
  try {
    response = await fetch(targetUrl, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'application/json, text/plain, */*',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer':         'https://www.justetf.com/',
        'Origin':          'https://www.justetf.com',
      },
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[justetf-proxy] errore di rete:', err.message)
    }
    return res.status(502).json({ error: 'errore di rete' })
  }

  const contentType = response.headers.get('content-type') || 'application/json'
  const body = await response.text()

  const allowedOrigin = process.env.ALLOWED_ORIGIN
  if (allowedOrigin) res.setHeader('Access-Control-Allow-Origin', allowedOrigin)

  res
    .status(response.status)
    .setHeader('Content-Type', contentType)
    .send(body)
}
