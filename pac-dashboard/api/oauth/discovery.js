// PAC-161: accorpamento di metadata.js + protected-resource.js in un unico
// endpoint dispatchato via query param (?type=as / ?type=pr), per liberare uno
// slot Serverless Function. URL esterne invariate — vercel.json fa il rewrite
// dai due path .well-known verso questo file con il type appropriato.

export default function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).end()
  const base = (process.env.VITE_APP_URL ?? 'https://etflens.app').replace(/\/$/, '')
  res.setHeader('Cache-Control', 'no-store')

  if (req.query.type === 'pr') {
    return res.json({
      resource:              `${base}/api/mcp`,
      authorization_servers: [base],
      scopes_supported:      ['portfolio:read'],
    })
  }

  return res.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
    scopes_supported: ['portfolio:read'],
  })
}
