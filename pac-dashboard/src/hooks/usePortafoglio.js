import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../utils/supabase'

// ── Scenari di default inseriti al primo accesso ───────────────────
const SCENARI_DEFAULT = [
  { nome: 'Pessimistico', rendimento_annuo: 0.04, colore: '#ef4444' },
  { nome: 'Moderato',     rendimento_annuo: 0.07, colore: '#f59e0b' },
  { nome: 'Ottimistico',  rendimento_annuo: 0.10, colore: '#22c55e' },
]

const defaultState = {
  etf: [],
  scenari: [],
  orizzonteAnni: 10,
  mostraProiezione: true,
}

// ── Mapping DB (snake_case) → JS (camelCase) ──────────────────────
function mapETF(row) {
  return {
    id: row.id,
    nome: row.nome,
    isin: row.isin,
    emittente: row.emittente || '',
    importoFisso: Number(row.importo_fisso),
    prezzoCorrente: Number(row.prezzo_corrente),
    archiviato: row.archiviato,
    acquisti: (row.acquisti || [])
      .map(mapAcquisto)
      .sort((a, b) => a.data.localeCompare(b.data)),
  }
}

function mapAcquisto(row) {
  return {
    id: row.id,
    data: row.data,
    importoInvestito: Number(row.importo_investito),
    prezzoUnitario: Number(row.prezzo_unitario),
    quoteFrazionate: Number(row.quote_frazionate),
  }
}

function mapScenario(row) {
  return {
    id: row.id,
    nome: row.nome,
    rendimentoAnnuo: Number(row.rendimento_annuo),
    colore: row.colore,
  }
}

// ── Hook ──────────────────────────────────────────────────────────
export function usePortafoglio(user) {
  const [stato, setStato] = useState(defaultState)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')

  // ── Caricamento iniziale ───────────────────────────────────────
  useEffect(() => {
    if (!user) return

    async function carica() {
      setLoading(true)
      try {
        const [etfRes, scenariRes, configRes] = await Promise.all([
          supabase
            .from('etf')
            .select('*, acquisti(*)')
            .eq('user_id', user.id)
            .order('created_at'),
          supabase
            .from('scenari')
            .select('*')
            .eq('user_id', user.id),
          supabase
            .from('config')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
        ])

        if (etfRes.error) throw etfRes.error
        if (scenariRes.error) throw scenariRes.error
        if (configRes.error) throw configRes.error

        let scenari = (scenariRes.data || []).map(mapScenario)

        // Inserisce scenari di default se l'utente non ne ha ancora
        if (scenari.length === 0) {
          const toInsert = SCENARI_DEFAULT.map(s => ({ ...s, user_id: user.id }))
          const { data: nuovi, error: insErr } = await supabase
            .from('scenari')
            .insert(toInsert)
            .select()
          if (!insErr && nuovi) scenari = nuovi.map(mapScenario)
        }

        const config = configRes.data
        setStato({
          etf: (etfRes.data || []).map(mapETF),
          scenari,
          orizzonteAnni: config?.orizzonte_anni ?? 10,
          mostraProiezione: config?.mostra_proiezione ?? true,
        })
      } catch (e) {
        console.error(e)
        setErrore('Errore nel caricamento dei dati.')
      } finally {
        setLoading(false)
      }
    }

    carica()
  }, [user])

  // ── ETF ──────────────────────────────────────────────────────────
  const aggiungiETF = useCallback(async (nome, isin, emittente, importoFisso) => {
    if (stato.etf.length >= 5) return

    const { data, error } = await supabase
      .from('etf')
      .insert({
        user_id: user.id,
        nome,
        isin,
        emittente: emittente || '',
        importo_fisso: Number(importoFisso),
        prezzo_corrente: 0,
        archiviato: false,
      })
      .select()
      .single()

    if (error) { setErrore('Errore nell\'aggiunta dell\'ETF.'); return }

    setStato(s => ({
      ...s,
      etf: [...s.etf, { ...mapETF(data), acquisti: [] }],
    }))
  }, [stato.etf.length, user])

  const archiviaETF = useCallback(async (etfId) => {
    const etf = stato.etf.find(e => e.id === etfId)
    if (!etf) return
    const nuovoValore = !etf.archiviato

    const { error } = await supabase
      .from('etf')
      .update({ archiviato: nuovoValore })
      .eq('id', etfId)

    if (error) { setErrore('Errore nell\'archiviazione dell\'ETF.'); return }

    setStato(s => ({
      ...s,
      etf: s.etf.map(e => e.id === etfId ? { ...e, archiviato: nuovoValore } : e),
    }))
  }, [stato.etf, user])

  const aggiornaETF = useCallback(async (etfId, campi) => {
    const dbCampi = {}
    if ('nome' in campi)          dbCampi.nome            = campi.nome
    if ('emittente' in campi)     dbCampi.emittente       = campi.emittente
    if ('importoFisso' in campi)  dbCampi.importo_fisso   = campi.importoFisso
    if ('prezzoCorrente' in campi) dbCampi.prezzo_corrente = campi.prezzoCorrente

    const { error } = await supabase
      .from('etf')
      .update(dbCampi)
      .eq('id', etfId)

    if (error) { setErrore('Errore nell\'aggiornamento dell\'ETF.'); return }

    setStato(s => ({
      ...s,
      etf: s.etf.map(e => e.id === etfId ? { ...e, ...campi } : e),
    }))
  }, [user])

  // ── Acquisti ─────────────────────────────────────────────────────
  const aggiungiAcquistiMultipli = useCallback(async (items) => {
    const toInsert = items.map(item => {
      const imp    = Number(item.importoInvestito)
      const prezzo = Number(item.prezzoUnitario)
      return {
        etf_id:            item.etfId,
        user_id:           user.id,
        data:              item.data,
        importo_investito: imp,
        prezzo_unitario:   prezzo,
        quote_frazionate:  prezzo > 0 ? imp / prezzo : 0,
      }
    })

    const { data, error } = await supabase
      .from('acquisti')
      .insert(toInsert)
      .select()

    if (error) { setErrore('Errore nell\'inserimento degli acquisti.'); return }

    setStato(s => {
      let etf = s.etf
      for (const row of data) {
        const acq = mapAcquisto(row)
        etf = etf.map(e => e.id === row.etf_id
          ? { ...e, acquisti: [...e.acquisti, acq].sort((a, b) => a.data.localeCompare(b.data)) }
          : e)
      }
      return { ...s, etf }
    })
  }, [user])

  const rimuoviAcquisto = useCallback(async (etfId, acquistoId) => {
    const { error } = await supabase
      .from('acquisti')
      .delete()
      .eq('id', acquistoId)

    if (error) { setErrore('Errore nella rimozione dell\'acquisto.'); return }

    setStato(s => ({
      ...s,
      etf: s.etf.map(e => e.id === etfId
        ? { ...e, acquisti: e.acquisti.filter(a => a.id !== acquistoId) }
        : e),
    }))
  }, [user])

  // ── Scenari ───────────────────────────────────────────────────────
  const aggiungiScenario = useCallback(async (nome, rendimentoAnnuo, colore) => {
    const { data, error } = await supabase
      .from('scenari')
      .insert({ user_id: user.id, nome, rendimento_annuo: Number(rendimentoAnnuo), colore })
      .select()
      .single()

    if (error) { setErrore('Errore nell\'aggiunta dello scenario.'); return }

    setStato(s => ({ ...s, scenari: [...s.scenari, mapScenario(data)] }))
  }, [user])

  const rimuoviScenario = useCallback(async (id) => {
    const { error } = await supabase.from('scenari').delete().eq('id', id)

    if (error) { setErrore('Errore nella rimozione dello scenario.'); return }

    setStato(s => ({ ...s, scenari: s.scenari.filter(sc => sc.id !== id) }))
  }, [user])

  const aggiornaScenario = useCallback(async (id, campi) => {
    const dbCampi = {}
    if ('nome' in campi)            dbCampi.nome             = campi.nome
    if ('rendimentoAnnuo' in campi) dbCampi.rendimento_annuo = campi.rendimentoAnnuo
    if ('colore' in campi)          dbCampi.colore           = campi.colore

    const { error } = await supabase.from('scenari').update(dbCampi).eq('id', id)

    if (error) { setErrore('Errore nell\'aggiornamento dello scenario.'); return }

    setStato(s => ({
      ...s,
      scenari: s.scenari.map(sc => sc.id === id ? { ...sc, ...campi } : sc),
    }))
  }, [user])

  // ── Config ────────────────────────────────────────────────────────
  const setOrizzonteAnni = useCallback(async (anni) => {
    const val = Number(anni)
    await supabase
      .from('config')
      .upsert({ user_id: user.id, orizzonte_anni: val })
    setStato(s => ({ ...s, orizzonteAnni: val }))
  }, [user])

  const setMostraProiezione = useCallback(async (val) => {
    await supabase
      .from('config')
      .upsert({ user_id: user.id, mostra_proiezione: val })
    setStato(s => ({ ...s, mostraProiezione: val }))
  }, [user])

  // ── Export ────────────────────────────────────────────────────────
  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(stato, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pac-dashboard-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [stato])

  // ── Import (sovrascrive tutti i dati su Supabase) ─────────────────
  const importJSON = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        try {
          const data = JSON.parse(e.target.result)

          // Cancella ETF (cascade elimina automaticamente gli acquisti collegati)
          const { error: delEtfErr } = await supabase.from('etf').delete().eq('user_id', user.id)
          if (delEtfErr) throw delEtfErr

          const { error: delScenErr } = await supabase.from('scenari').delete().eq('user_id', user.id)
          if (delScenErr) throw delScenErr

          // Inserisce ETF
          if ((data.etf || []).length > 0) {
            const etfRows = data.etf.map(etf => ({
              id:              etf.id,
              user_id:         user.id,
              nome:            etf.nome,
              isin:            etf.isin,
              emittente:       etf.emittente || '',
              importo_fisso:   etf.importoFisso,
              prezzo_corrente: etf.prezzoCorrente,
              archiviato:      etf.archiviato,
            }))
            const { error: insEtfErr } = await supabase.from('etf').insert(etfRows)
            if (insEtfErr) throw insEtfErr
          }

          // Inserisce acquisti
          const acquistiRows = (data.etf || []).flatMap(etf =>
            (etf.acquisti || []).map(a => ({
              id:                a.id,
              etf_id:            etf.id,
              user_id:           user.id,
              data:              a.data,
              importo_investito: a.importoInvestito,
              prezzo_unitario:   a.prezzoUnitario,
              quote_frazionate:  a.quoteFrazionate,
            }))
          )
          if (acquistiRows.length > 0) {
            const { error: insAcqErr } = await supabase.from('acquisti').insert(acquistiRows)
            if (insAcqErr) throw insAcqErr
          }

          // Inserisce scenari
          if ((data.scenari || []).length > 0) {
            const scenariRows = data.scenari.map(s => ({
              id:               s.id,
              user_id:          user.id,
              nome:             s.nome,
              rendimento_annuo: s.rendimentoAnnuo,
              colore:           s.colore,
            }))
            const { error: insScenErr } = await supabase.from('scenari').insert(scenariRows)
            if (insScenErr) throw insScenErr
          }

          // Aggiorna config
          const { error: confErr } = await supabase.from('config').upsert({
            user_id:           user.id,
            orizzonte_anni:    data.orizzonteAnni ?? 10,
            mostra_proiezione: data.mostraProiezione ?? true,
          })
          if (confErr) throw confErr

          setStato({ ...defaultState, ...data })
          resolve()
        } catch (err) {
          reject(err instanceof SyntaxError ? new Error('File JSON non valido') : err)
        }
      }
      reader.readAsText(file)
    })
  }, [user])

  return {
    ...stato,
    loading,
    errore,
    setErrore,
    aggiungiETF,
    archiviaETF,
    aggiornaETF,
    aggiungiAcquistiMultipli,
    rimuoviAcquisto,
    aggiungiScenario,
    rimuoviScenario,
    aggiornaScenario,
    setOrizzonteAnni,
    setMostraProiezione,
    exportJSON,
    importJSON,
  }
}
