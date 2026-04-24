import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export const adminClient = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export function sha256hex(str) {
  return createHash('sha256').update(str).digest('hex')
}

export function sha256raw(str) {
  return createHash('sha256').update(str).digest()
}

export function base64url(buf) {
  const b64 = Buffer.isBuffer(buf) ? buf.toString('base64') : Buffer.from(buf).toString('base64')
  return b64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

export function redirectUriMatches(registered, requested) {
  try {
    const r = new URL(registered)
    const q = new URL(requested)
    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(r.hostname)
    if (isLoopback) {
      // RFC 8252: port is ignored for loopback redirect URIs
      return r.protocol === q.protocol && r.hostname === q.hostname && r.pathname === q.pathname
    }
    return registered === requested
  } catch {
    return false
  }
}
