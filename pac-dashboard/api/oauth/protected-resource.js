export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const base = (process.env.VITE_APP_URL ?? 'https://etflens.app').replace(/\/$/, '')
  res.setHeader('Cache-Control', 'no-store')
  res.json({
    resource:              `${base}/api/mcp`,
    authorization_servers: [base],
    scopes_supported:      ['portfolio:read'],
  })
}
