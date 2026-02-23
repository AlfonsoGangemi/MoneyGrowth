export default async function handler(req, res) {
  const { proxyPath, ...queryParams } = req.query

  if (!proxyPath) {
    console.error('[justetf-proxy] parametro proxyPath mancante')
    return res.status(400).json({ error: 'proxyPath mancante' })
  }

  const qs = new URLSearchParams(queryParams).toString()
  const targetUrl = `https://www.justetf.com/${proxyPath}${qs ? '?' + qs : ''}`

  console.log('[justetf-proxy] → GET', targetUrl)

  let response
  try {
    response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'it-IT,it;q=0.9,en-US;q=0.8,en;q=0.7',
        'Referer': 'https://www.justetf.com/',
        'Origin': 'https://www.justetf.com',
      },
    })
  } catch (err) {
    console.error('[justetf-proxy] errore di rete:', err.message)
    return res.status(502).json({ error: 'errore di rete', detail: err.message })
  }

  const contentType = response.headers.get('content-type') || 'application/json'
  const body = await response.text()

  console.log('[justetf-proxy] ← status', response.status, '| content-type:', contentType)
  if (!response.ok) {
    console.error('[justetf-proxy] risposta non OK. Body:', body.slice(0, 500))
  }

  res
    .status(response.status)
    .setHeader('Content-Type', contentType)
    .setHeader('Access-Control-Allow-Origin', '*')
    .send(body)
}
