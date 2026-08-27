import { randomBytes } from 'crypto'
import { adminClient, sha256hex, base64url, redirectUriMatches } from './_lib.js'

// CIMD (Client ID Metadata Documents, spec 2026-07-28): un client_id in forma di
// URL https con path non vuoto punta a un documento JSON di metadata ospitato dal
// client stesso, invece che a un client pre-registrato via DCR. Nessuna persistenza
// locale: il documento viene recuperato ad ogni authorize (nessuna cache — le
// funzioni serverless Vercel non condividono memoria tra invocazioni, e il volume
// di richieste ad /authorize non giustifica l'infrastruttura di cache aggiuntiva).
function isCimdClientId(clientId) {
  try {
    const url = new URL(clientId)
    return url.protocol === 'https:' && url.pathname !== '' && url.pathname !== '/'
  } catch {
    return false
  }
}

async function resolveCimdClient(clientIdUrl) {
  let response
  try {
    response = await fetch(clientIdUrl, { signal: AbortSignal.timeout(5000) })
  } catch {
    return null
  }
  if (!response.ok) return null

  let doc
  try {
    doc = await response.json()
  } catch {
    return null
  }

  if (
    typeof doc !== 'object' || doc === null ||
    doc.client_id !== clientIdUrl ||
    typeof doc.client_name !== 'string' ||
    !Array.isArray(doc.redirect_uris) || doc.redirect_uris.length === 0
  ) {
    return null
  }

  return { redirect_uris: doc.redirect_uris }
}

async function resolveClient(clientId) {
  if (isCimdClientId(clientId)) return resolveCimdClient(clientId)

  const { data: clients, error } = await adminClient.rpc('oauth_get_client', {
    p_client_id: clientId,
  })
  const client = clients?.[0]
  if (error || !client?.is_active) return null
  return { redirect_uris: client.redirect_uris }
}

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

  const client = await resolveClient(client_id)
  if (!client) {
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

  const base = (process.env.VITE_APP_URL ?? 'https://etflens.app').replace(/\/$/, '')

  const redirectTo = new URL(redirect_uri)
  redirectTo.searchParams.set('code', rawCode)
  if (state) redirectTo.searchParams.set('state', state)
  // RFC 9207: identifica l'issuer nella risposta di autorizzazione, cosi' il client
  // puo' rilevare mix-up attack tra piu' authorization server.
  redirectTo.searchParams.set('iss', base)

  res.json({ redirect_to: redirectTo.toString() })
}
