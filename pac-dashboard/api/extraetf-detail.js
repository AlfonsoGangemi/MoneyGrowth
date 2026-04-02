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

const ASSET_CLASS_MAP = {
  2:    'Azioni',
  3:    'Obbligazioni',
  4:    'Materie prime',
  1160: 'Immobili',
  5:    'Mercato monetario',
  9:    'Portafogli di ETF',
  1240: 'Criptovalute',
}

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

  const targetUrl = `https://extraetf.com/api-v2/detail/?isin=${isin.trim()}&extraetf_locale=it`

  let response
  try {
    response = await fetch(targetUrl, {
      headers: {
        'User-Agent':      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept':          'application/json, text/plain, */*',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer':         'https://extraetf.com/',
        'Origin':          'https://extraetf.com',
      },
    })
  } catch (err) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('[extraetf-detail] errore di rete:', err.message)
    }
    return res.status(502).json({ error: 'errore di rete' })
  }

  if (!response.ok) {
    return res.status(response.status).json({ error: 'ISIN non trovato su ExtraETF' })
  }

  let json
  try {
    json = await response.json()
  } catch (_) {
    return res.status(502).json({ error: 'Risposta non valida da ExtraETF' })
  }

  const etf = Array.isArray(json.results) ? json.results[0] : json

  if (!etf) {
    return res.status(404).json({ error: 'ISIN non trovato su ExtraETF' })
  }

  const emittente = etf.shortname || ''
  const fondname = etf.fondname || ''
  const nome = emittente && fondname.startsWith(emittente)
    ? fondname.slice(emittente.length).trimStart()
    : fondname
  const assetClassId = etf.asset_class ?? etf.asset_class_id ?? null
  const assetClassNome = assetClassId ? (ASSET_CLASS_MAP[assetClassId] ?? 'Azioni') : 'Azioni'

  return res.status(200).json({ nome, emittente, assetClassNome })
}
