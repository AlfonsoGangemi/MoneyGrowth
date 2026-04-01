import WebSocket from 'ws'

const TEST_ISIN = 'LU0478205379'
const TIMEOUT_MS = 8000

export default async function handler(req, res) {
  return new Promise((resolve) => {
    const ws = new WebSocket('wss://quotes.extraetf.com/v1/ws', {
      headers: { Origin: 'https://extraetf.com' },
    })

    const timeout = setTimeout(() => {
      ws.terminate()
      res.status(504).json({ ok: false, error: 'timeout' })
      resolve()
    }, TIMEOUT_MS)

    ws.on('open', () => {
      ws.send(JSON.stringify({ subscribe: { isins: [TEST_ISIN] } }))
    })

    ws.on('message', (data) => {
      clearTimeout(timeout)
      ws.send(JSON.stringify({ unsubscribe: { isins: [TEST_ISIN] } }))
      ws.close()
      res.status(200).json({ ok: true, data: JSON.parse(data.toString()) })
      resolve()
    })

    ws.on('error', (err) => {
      clearTimeout(timeout)
      res.status(502).json({ ok: false, error: err.message })
      resolve()
    })
  })
}
