import { createClient } from '@supabase/supabase-js'

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
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Metodo non consentito' })
  }

  const authHeader = req.headers['authorization'] ?? ''
  const jwt = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
  if (!jwt) return res.status(401).json({ error: 'Autorizzazione mancante' })

  const { keyId } = req.query
  if (!keyId) return res.status(400).json({ error: 'keyId mancante' })

  const { authClient, adminClient } = buildClients(jwt)

  // JWT verification server-side
  const { data: { user }, error: authError } = await authClient.auth.getUser()
  if (authError || !user) return res.status(401).json({ error: 'JWT non valido' })

  // Hard delete con verifica ownership — se non esiste o non appartiene all'utente → 404
  const { data, error } = await adminClient
    .from('user_api_keys')
    .delete()
    .eq('id', keyId)
    .eq('user_id', user.id)
    .select('id')

  if (error) return res.status(500).json({ error: 'Errore interno' })
  if (!data || data.length === 0) return res.status(404).json({ error: 'Chiave non trovata' })

  return res.status(200).json({ deleted: true })
}
