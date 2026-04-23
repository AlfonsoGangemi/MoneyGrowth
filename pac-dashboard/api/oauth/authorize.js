import { randomBytes } from 'crypto'
import { adminClient, sha256hex, base64url, redirectUriMatches } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const {
    client_id,
    redirect_uri,
    code_challenge,
    code_challenge_method,
    state,
    scope,
    access_token,
  } = req.body ?? {}

  if (!access_token) return res.status(401).json({ error: 'unauthorized' })

  const { data: { user }, error: authErr } = await adminClient.auth.getUser(access_token)
  if (authErr || !user) return res.status(401).json({ error: 'unauthorized' })

  if (!client_id || !redirect_uri || !code_challenge) {
    return res.status(400).json({ error: 'invalid_request' })
  }

  if ((code_challenge_method ?? 'S256') !== 'S256') {
    return res.status(400).json({
      error: 'invalid_request',
      error_description: 'code_challenge_method must be S256',
    })
  }

  const { data: clients, error: clientErr } = await adminClient.rpc('oauth_get_client', {
    p_client_id: client_id,
  })
  const client = clients?.[0]

  if (clientErr || !client?.is_active) {
    return res.status(400).json({ error: 'invalid_client' })
  }

  const allowed = client.redirect_uris.some(u => redirectUriMatches(u, redirect_uri))
  if (!allowed) return res.status(400).json({ error: 'invalid_redirect_uri' })

  const rawCode = base64url(randomBytes(32))
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()

  const { error: insertErr } = await adminClient.rpc('oauth_insert_auth_code', {
    p_code_hash:      sha256hex(rawCode),
    p_client_id:      client_id,
    p_user_id:        user.id,
    p_redirect_uri:   redirect_uri,
    p_code_challenge: code_challenge,
    p_scope:          scope ?? 'portfolio:read',
    p_expires_at:     expiresAt,
  })

  if (insertErr) {
    console.error('[oauth/authorize]', insertErr)
    return res.status(500).json({ error: 'server_error' })
  }

  const redirectTo = new URL(redirect_uri)
  redirectTo.searchParams.set('code', rawCode)
  if (state) redirectTo.searchParams.set('state', state)

  res.json({ redirect_to: redirectTo.toString() })
}
