import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'

export function useApiKeys() {
  const [keys, setKeys] = useState([])
  const [loading, setLoading] = useState(true)
  const [newKey, setNewKey] = useState(null)
  const [error, setError] = useState(null)

  const fetchKeys = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('user_api_keys')
      .select('id, created_at, last_used_at, expires_at')
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
    setKeys(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchKeys() }, [fetchKeys])

  async function generate() {
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch('/api/keys/generate', {
      method: 'POST',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    const body = await res.json()
    if (!res.ok) { setError(body.error); return }
    setNewKey(body.key)
    await fetchKeys()
  }

  async function revoke(keyId) {
    setError(null)
    const { data: { session } } = await supabase.auth.getSession()
    const res = await fetch(`/api/keys/${keyId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${session.access_token}` },
    })
    if (!res.ok) { const b = await res.json(); setError(b.error); return }
    setKeys(k => k.filter(x => x.id !== keyId))
  }

  function clearNewKey() { setNewKey(null) }

  return { keys, loading, newKey, error, generate, revoke, clearNewKey }
}
