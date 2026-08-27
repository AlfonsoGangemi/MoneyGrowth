import { randomUUID } from 'crypto'
import { adminClient } from './_lib.js'

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'POST') return res.status(405).end()

  const { client_name, redirect_uris, application_type } = req.body ?? {}

  if (!client_name || !Array.isArray(redirect_uris) || redirect_uris.length === 0) {
    return res.status(400).json({ error: 'invalid_client_metadata' })
  }

  // OIDC Dynamic Client Registration: default 'web' se omesso (SEP-837). I client
  // nativi (desktop/CLI, redirect loopback) devono dichiarare esplicitamente 'native'.
  const applicationType = application_type ?? 'web'
  if (!['web', 'native'].includes(applicationType)) {
    return res.status(400).json({
      error: 'invalid_client_metadata',
      error_description: 'application_type must be "web" or "native"',
    })
  }

  const client_id = randomUUID()

  const { error } = await adminClient.rpc('oauth_register_client', {
    p_client_id:        client_id,
    p_name:             client_name,
    p_redirect_uris:    redirect_uris,
    p_application_type: applicationType,
  })

  if (error) {
    console.error('[oauth/register]', error)
    return res.status(500).json({ error: 'server_error' })
  }

  const base = (process.env.VITE_APP_URL ?? 'https://etflens.app').replace(/\/$/, '')

  return res.status(201).json({
    client_id,
    client_name,
    redirect_uris,
    application_type:           applicationType,
    token_endpoint_auth_method: 'none',
    grant_types:                ['authorization_code', 'refresh_token'],
    response_types:             ['code'],
    registration_client_uri:    `${base}/api/oauth/register`,
  })
}
