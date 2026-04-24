import { createClient } from '@supabase/supabase-js'
import { randomBytes, createHash } from 'crypto'

function buildClients(jwt) {
  const url = process.env.VITE_SUPABASE_URL
  const anonKey = process.env.VITE_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_KEY

  const authClient = createClient(url, anonKey, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const adminClient = createClient(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  return { authClient, adminClient }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' })
  }

  const authHeader = req.headers['authorization'] ?? ''
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!jwt) return res.status(401).json({ error: 'Autorizzazione mancante' })

  const { authClient, adminClient } = buildClients(jwt)

  // A1 — JWT verification server-side
  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (authError || !user) return res.status(401).json({ error: 'JWT non valido' })
  const userId = user.id

  // PAC-108 step 3 — cleanup chiavi scadute prima del conteggio
  await adminClient
    .from('user_api_keys')
    .delete()
    .eq('user_id', userId)
    .lte('expires_at', new Date().toISOString())

  // A3 — cap: massimo 2 chiavi attive per utente
  const { count: activeCount } = await adminClient
    .from('user_api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gt('expires_at', new Date().toISOString())

  if (activeCount >= 2) {
    return res.status(409).json({ error: 'Hai già 2 chiavi attive. Revoca una chiave prima di generarne una nuova.' })
  }

  // PAC-105 — rate limit DB-based: max 5 chiavi create nelle ultime 24h
  const since24h = new Date(Date.now() - 86_400_000).toISOString()
  const { count: dailyCount } = await adminClient
    .from('user_api_keys')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('created_at', since24h)

  if (dailyCount >= 5) {
    return res.status(429).json({ error: 'Limite giornaliero raggiunto. Riprova domani.' })
  }

  // Genera pac_<64 hex chars>
  const rawKey = 'pac_' + randomBytes(32).toString('hex')
  const keyHash = createHash('sha256').update(rawKey).digest('hex')

  const { data: inserted, error: insertError } = await adminClient
    .from('user_api_keys')
    .insert({ user_id: userId, key_hash: keyHash })
    .select('id, expires_at')
    .single()

  if (insertError) {
    if (insertError.code === '23514') {
      // trigger DB cap violato (race condition)
      return res.status(409).json({ error: 'Hai già 2 chiavi attive. Revoca una chiave prima di generarne una nuova.' })
    }
    return res.status(500).json({ error: 'Errore interno' })
  }

  // La chiave in chiaro viene restituita una sola volta
  return res.status(201).json({ id: inserted.id, key: rawKey, expires_at: inserted.expires_at })
}
