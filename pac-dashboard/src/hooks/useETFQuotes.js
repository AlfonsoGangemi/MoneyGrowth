import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../utils/supabase'

/**
 * Recupera prezzi live da ExtraETF per tutti gli ETF non archiviati.
 * Persiste il primo prezzo ricevuto su Supabase e alla chiusura della sessione.
 *
 * @param {Array}  etfList     - lista ETF da usePortafoglio
 * @param {string} userId      - user.id Supabase
 * @param {Function} aggiornaETF - callback per aggiornare prezzoCorrente in stato
 * @returns {{ liveMap: Object<string,number>, fetchingLive: boolean }}
 */
export function useETFQuotes(etfList, userId, aggiornaETF) {
  const [liveMap, setLiveMap] = useState({})
  const [fetchingLive, setFetchingLive] = useState(false)
  const persistedRef = useRef(new Set())
  const liveMapRef = useRef({})

  const isinsAttivi = etfList
    .filter(e => !e.archiviato && e.isin)
    .map(e => e.isin)

  const isinsKey = isinsAttivi.join(',')

  const fetchQuotes = useCallback(async (isins) => {
    if (!isins || isins.length === 0) return
    setFetchingLive(true)
    try {
      const res = await fetch(`/api/extraetf-quotes?isins=${isins.join(',')}`)
      if (!res.ok) return
      const data = await res.json()
      if (!data?.prices) return
      setLiveMap(prev => {
        const next = { ...prev, ...data.prices }
        liveMapRef.current = next
        return next
      })
      // Persisti su Supabase la prima volta che riceviamo un prezzo
      for (const [isin, prezzo] of Object.entries(data.prices)) {
        if (!persistedRef.current.has(isin)) {
          persistedRef.current.add(isin)
          const etf = etfList.find(e => e.isin === isin)
          if (etf) {
            aggiornaETF(etf.id, isin, { prezzoCorrente: prezzo })
          }
        }
      }
    } catch (_) {
    } finally {
      setFetchingLive(false)
    }
  }, [etfList, aggiornaETF])

  // Fetch al mount e quando cambiano gli ISIN attivi
  useEffect(() => {
    if (isinsAttivi.length === 0) return
    fetchQuotes(isinsAttivi)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isinsKey])

  async function persistPrezzi(map) {
    if (!userId || Object.keys(map).length === 0) return
    const oggi = new Date()
    const anno = oggi.getFullYear()
    const mese = oggi.getMonth() + 1
    const upserts = Object.entries(map).map(([isin, prezzo]) => ({
      isin, anno, mese, prezzo: Number(prezzo),
    }))
    await supabase
      .from('etf_prezzi_storici')
      .upsert(upserts, { onConflict: 'isin,anno,mese' })
  }

  // Persiste prezzi live alla chiusura della sessione
  useEffect(() => {
    if (!userId) return
    function onVisibilityChange() {
      if (document.visibilityState === 'hidden') persistPrezzi(liveMapRef.current)
    }
    window.addEventListener('beforeunload', () => persistPrezzi(liveMapRef.current))
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.removeEventListener('beforeunload', () => persistPrezzi(liveMapRef.current))
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [userId])

  function updateLivePrice(isin, prezzo) {
    setLiveMap(prev => {
      const next = { ...prev, [isin]: prezzo }
      liveMapRef.current = next
      return next
    })
  }

  return { liveMap, fetchingLive, refetchQuotes: () => fetchQuotes(isinsAttivi), updateLivePrice, persistPrezzi }
}
