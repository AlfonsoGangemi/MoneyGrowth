import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'

const ISIN_RE = /^[A-Z]{2}[A-Z0-9]{10}$/
const MAX_ITEMS = 12

export function useWatchlist() {
  const [items, setItems] = useState([])
  const [prezzi, setPrezzi] = useState({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const carica = useCallback(async () => {
    setLoading(true)
    const { data } = await supabase
      .from('watchlist')
      .select('*')
      .order('created_at', { ascending: true })
    setItems(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { carica() }, [carica])

  const aggiornaPrezzi = useCallback(async (lista) => {
    const isins = lista.map(i => i.isin)
    if (!isins.length) return
    try {
      const res = await fetch(`/api/extraetf-quotes?isins=${isins.join(',')}`)
      if (!res.ok) return
      const { prices } = await res.json()
      setPrezzi(prices ?? {})
    } catch {}
  }, [])

  useEffect(() => {
    if (items.length) aggiornaPrezzi(items)
  }, [items, aggiornaPrezzi])

  async function aggiungiETF(isin) {
    setError(null)
    const upper = isin.trim().toUpperCase()
    if (!ISIN_RE.test(upper)) throw new Error('isin_invalid')
    if (items.length >= MAX_ITEMS) throw new Error('limit')

    const res = await fetch(`/api/extraetf-detail?isin=${upper}`)
    if (!res.ok) throw new Error('not_found')
    const detail = await res.json()
    if (!detail.nome) throw new Error('not_found')

    const { data: { user } } = await supabase.auth.getUser()
    const { error: dbErr } = await supabase
      .from('watchlist')
      .insert({ isin: upper, nome: detail.nome, emittente: detail.emittente ?? null, user_id: user.id })
    if (dbErr) {
      if (dbErr.code === '23505') throw new Error('duplicate')
      throw new Error('db')
    }
    await carica()
  }

  async function rimuoviETF(id) {
    setItems(prev => prev.filter(i => i.id !== id))
    await supabase.from('watchlist').delete().eq('id', id)
  }

  return { items, prezzi, loading, error, aggiungiETF, rimuoviETF, aggiornaPrezzi }
}
