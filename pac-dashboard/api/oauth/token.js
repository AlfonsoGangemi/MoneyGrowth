import { randomBytes } from 'crypto'
import { SignJWT } from 'jose'
import { adminClient, sha256hex, sha256raw, base64url, redirectUriMatches } from './_lib.js'

const TOKEN_TTL_SEC = 3600
const REFRESH_TTL_MS = 30 * 24 * 60 * 60 * 1000

function getSecret() {
  const s = process.env.OAUTH_JWT_SECRET
  if (!s) throw new Error('OAUTH_JWT_SECRET not set')
  return new TextEncoder().encode(s)
}

function issuer() {
  return (process.env.VITE_APP_URL ?? 'https://etflens.app').replace(/\/$/, '')
}

async function mintAccessToken(userId, scope) {
  return new SignJWT({ scope })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(userId)
    .setIssuer(issuer())
    .setAudience(`${issuer()}/api/mcp`)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(getSecret())
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()
  res.setHeader('Cache-Control', 'no-store')

  const { grant_type, code, code_verifier, redirect_uri, client_id, refresh_token } = req.body ?? {}

  // ── authorization_code ───────────────────────────────────────────────────
  if (grant_type === 'authorization_code') {
    if (!code || !code_verifier || !redirect_uri || !client_id) {
      return res.status(400).json({ error: 'invalid_request' })
    }

    // Atomic consume: codice eliminato al primo accesso indipendentemente dal risultato PKCE
    const { data: rows, error: codeErr } = await adminClient.rpc('oauth_consume_auth_code', {
      p_code_hash: sha256hex(code),
    })
    const row = rows?.[0]

    if (codeErr || !row) return res.status(400).json({ error: 'invalid_grant' })

    // PKCE S256: base64url(SHA256_raw_bytes(code_verifier)) must match stored code_challenge
    const computed = base64url(sha256raw(code_verifier))
    if (computed !== row.code_challenge) {
      return res.status(400).json({ error: 'invalid_grant', error_description: 'PKCE verification failed' })
    }

    if (row.client_id !== client_id) return res.status(400).json({ error: 'invalid_grant' })
    if (!redirectUriMatches(row.redirect_uri, redirect_uri)) {
      return res.status(400).json({ error: 'invalid_grant' })
    }

    const accessToken = await mintAccessToken(row.user_id, row.scope)
    const rawRefresh = base64url(randomBytes(48))
    const refreshExpires = new Date(Date.now() + REFRESH_TTL_MS).toISOString()

    const { error: rtErr } = await adminClient.rpc('oauth_insert_refresh_token', {
      p_token_hash: sha256hex(rawRefresh),
      p_user_id:    row.user_id,
      p_client_id:  row.client_id,
      p_scope:      row.scope,
      p_expires_at: refreshExpires,
    })

    if (rtErr) {
      console.error('[oauth/token]', rtErr)
      return res.status(500).json({ error: 'server_error' })
    }

    const tokenBody = {
      access_token:  accessToken,
      token_type:    'Bearer',
      expires_in:    TOKEN_TTL_SEC,
      refresh_token: rawRefresh,
      scope:         row.scope,
    }
    console.log('[oauth/token] authorization_code response — scope:', row.scope, 'user_id:', row.user_id, 'token_prefix:', accessToken.slice(0, 20))
    return res.json(tokenBody)
  }

  // ── refresh_token ────────────────────────────────────────────────────────
  if (grant_type === 'refresh_token') {
    if (!refresh_token) return res.status(400).json({ error: 'invalid_request' })

    const rawRefresh = base64url(randomBytes(48))
    const refreshExpires = new Date(Date.now() + REFRESH_TTL_MS).toISOString()

    // Atomic rotation: elimina il vecchio, inserisce il nuovo, restituisce i dati dell'utente
    const { data: rotated, error: rtErr } = await adminClient.rpc('oauth_rotate_refresh_token', {
      p_old_hash:      sha256hex(refresh_token),
      p_new_hash:      sha256hex(rawRefresh),
      p_new_expires_at: refreshExpires,
    })
    const rtRow = rotated?.[0]

    if (rtErr || !rtRow) return res.status(401).json({ error: 'invalid_grant' })

    const accessToken = await mintAccessToken(rtRow.user_id, rtRow.scope)

    return res.json({
      access_token:  accessToken,
      token_type:    'Bearer',
      expires_in:    TOKEN_TTL_SEC,
      refresh_token: rawRefresh,
      scope:         rtRow.scope,
    })
  }

  return res.status(400).json({ error: 'unsupported_grant_type' })
}
