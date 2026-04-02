import { useState, useEffect, useCallback } from 'react'
import * as Sentry from '@sentry/react'
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
  broker: [],
  brokerFiltro: [],
  orizzonteAnni: 10,
  prezziStorici: [],
  storicoPerBroker: [],
  assetClasses: [],
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
    assetClassId: row.asset_class_id ?? null,
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
    fee: Number(row.fee),
    brokerId: row.broker_id,
  }
}

function mapBroker(row) {
  return {
    id: row.id,
    nome: row.nome,
    colore: row.colore,
    archiviato: row.archiviato,
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

// ── Helper puro: calcola valore e totale versato per anno+broker ──
function calcolaAnnoStorico(anno, brokerId, etfList, prezziStorici) {
  const fineAnno = `${anno}-12-31`
  let totaleVersato = 0
  let valore = 0
  for (const etf of etfList) {
    const acquistiAnno = etf.acquisti.filter(a =>
      a.data <= fineAnno && a.brokerId === brokerId
    )
    totaleVersato += acquistiAnno.reduce((s, a) => s + a.importoInvestito, 0)
    const quote = acquistiAnno.reduce((s, a) => s + a.quoteFrazionate, 0)
    if (quote === 0) continue
    const prezziEtf = prezziStorici
      .filter(p => p.isin === etf.isin && p.anno === anno)
      .sort((a, b) => b.mese - a.mese)
    valore += quote * (prezziEtf[0]?.prezzo ?? etf.prezzoCorrente)
  }
  return { anno, brokerId, valore, totaleVersato }
}

// Aggrega record per-broker in un unico valore per anno
function aggregaPerAnno(records) {
  const map = new Map()
  for (const r of records) {
    const ex = map.get(r.anno) || { anno: r.anno, valore: 0, totaleVersato: 0 }
    map.set(r.anno, { anno: r.anno, valore: ex.valore + r.valore, totaleVersato: ex.totaleVersato + r.totaleVersato })
  }
  return [...map.values()].sort((a, b) => a.anno - b.anno)
}

// ── Hook ──────────────────────────────────────────────────────────
export function usePortafoglio(user) {
  const [stato, setStato] = useState(defaultState)
  const [loading, setLoading] = useState(true)
  const [errore, setErrore] = useState('')

  // ── Caricamento dati (riutilizzabile) ─────────────────────────
  const caricaDati = useCallback(async () => {
    if (!user) return
      setLoading(true)
      try {
        const [etfRes, scenariRes, configRes, brokerRes, storicoRes, assetClassRes] = await Promise.all([
          supabase
            .from('etf')
            .select('*, acquisti(*)')
            .eq('user_id', user.id)
            .order('created_at'),
          supabase
            .from('scenari')
            .select('*')
            .eq('user_id', user.id)
            .order('rendimento_annuo'),
          supabase
            .from('config')
            .select('*')
            .eq('user_id', user.id)
            .maybeSingle(),
          supabase
            .from('broker')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at'),
          supabase
            .from('portafoglio_storico_annuale')
            .select('anno, broker_id, valore, totale_versato')
            .eq('user_id', user.id)
            .order('anno'),
          supabase
            .from('asset_class')
            .select('*')
            .eq('visibile', true)
            .order('nome'),
        ])

        if (etfRes.error) throw etfRes.error
        if (scenariRes.error) throw scenariRes.error
        if (configRes.error) throw configRes.error
        if (brokerRes.error) throw brokerRes.error

        const assetClasses = (assetClassRes.data || []).map(r => ({ id: r.id, nome: r.nome })).sort((a, b) => a.id - b.id)
        const acMap = new Map(assetClasses.map(ac => [ac.id, ac.nome]))

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

        let broker = (brokerRes.data || []).map(mapBroker)

        // Crea broker "Default" se l'utente non ne ha ancora
        if (broker.length === 0) {
          const { data: def } = await supabase
            .from('broker')
            .insert({ user_id: user.id, nome: 'Default', colore: '#6366f1' })
            .select()
            .single()
          if (def) broker = [mapBroker(def)]
        }

        const etfData = etfRes.data || []
        const etfMappatiRaw = etfData.map(mapETF)
        const etfMappatiConAC = etfMappatiRaw.map(e => ({
          ...e,
          assetClassNome: e.assetClassId ? (acMap.get(e.assetClassId) ?? null) : null,
        }))
        const isins = [...new Set(etfData.map(e => e.isin).filter(Boolean))]
        let prezziStorici = []
        if (isins.length > 0) {
          const { data: psData } = await supabase
            .from('etf_prezzi_storici')
            .select('isin, anno, mese, prezzo')
            .in('isin', isins)
          prezziStorici = psData || []
        }

        // Record raw per-broker dal DB
        const storicoRaw = (storicoRes.data || []).map(r => ({
          anno: r.anno,
          brokerId: r.broker_id,
          valore: Number(r.valore),
          totaleVersato: Number(r.totale_versato),
        }))

        // Backfill: coppie (anno, brokerId) con acquisti ma senza record storico
        const etfMappati = etfMappatiConAC
        const annoCorrente = new Date().getFullYear()
        const chiaveSalvate = new Set(storicoRaw.map(r => `${r.anno}-${r.brokerId}`))
        const coppie = [...new Map(
          etfMappati
            .flatMap(e => e.acquisti.map(a => ({ anno: Number(a.data.slice(0, 4)), brokerId: a.brokerId })))
            .filter(({ anno, brokerId }) => anno > 0 && anno < annoCorrente && brokerId != null)
            .map(c => [`${c.anno}-${c.brokerId}`, c])
        ).values()].filter(c => !chiaveSalvate.has(`${c.anno}-${c.brokerId}`))

        let storicoTutti = [...storicoRaw]
        if (coppie.length > 0) {
          const nuovi = coppie.map(({ anno, brokerId }) => calcolaAnnoStorico(anno, brokerId, etfMappati, prezziStorici))
          // Aggiorna sempre in memoria, indipendentemente dal successo del DB
          storicoTutti = [...storicoRaw, ...nuovi]
          const { error: backfillErr } = await supabase
            .from('portafoglio_storico_annuale')
            .upsert(nuovi.map(r => ({ user_id: user.id, anno: r.anno, broker_id: r.brokerId, valore: r.valore, totale_versato: r.totaleVersato })))
          if (backfillErr) {
            console.error('Errore backfill storico annuale:', backfillErr)
            Sentry.captureException(new Error(backfillErr.message), { tags: { operation: 'backfill_storico_annuale' } })
          }
        }

        const config = configRes.data
        setStato({
          etf: etfMappati,
          scenari,
          broker,
          brokerFiltro: config?.broker_filtro ?? [],
          orizzonteAnni: config?.orizzonte_anni ?? 10,
          prezziStorici,
          storicoPerBroker: storicoTutti,
          assetClasses,
        })
      } catch (e) {
        console.error(e)
        Sentry.captureException(e, { tags: { operation: 'carica_dati' } })
        setErrore('Errore nel caricamento dei dati.')
      } finally {
        setLoading(false)
      }
  }, [user])

  useEffect(() => { caricaDati() }, [caricaDati])

  // ── ETF ──────────────────────────────────────────────────────────
  const aggiungiETF = useCallback(async (nome, isin, emittente, importoFisso, assetClassId) => {
    if (stato.etf.filter(e => !e.archiviato).length >= 9) return

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
        asset_class_id: assetClassId || null,
      })
      .select()
      .single()

    if (error) {
      Sentry.captureException(new Error(error.message), { tags: { operation: 'aggiungi_etf' } })
      if (error.code === '23505') return 'ETF già presente nel portafoglio (ISIN duplicato).'
      return 'Errore nell\'aggiunta dell\'ETF.'
    }

    setStato(s => ({
      ...s,
      etf: [...s.etf, {
        ...mapETF(data),
        acquisti: [],
        assetClassNome: assetClassId ? (s.assetClasses.find(ac => ac.id === assetClassId)?.nome ?? null) : null,
      }],
    }))
    return true
  }, [stato.etf.length, user])

  const archiviaETF = useCallback(async (etfId) => {
    const etf = stato.etf.find(e => e.id === etfId)
    if (!etf) return
    const nuovoValore = !etf.archiviato

    const { error } = await supabase
      .from('etf')
      .update({ archiviato: nuovoValore })
      .eq('id', etfId)

    if (error) { Sentry.captureException(new Error(error.message), { tags: { operation: 'archivia_etf' } }); setErrore('Errore nell\'archiviazione dell\'ETF.'); return }

    setStato(s => ({
      ...s,
      etf: s.etf.map(e => e.id === etfId ? { ...e, archiviato: nuovoValore } : e),
    }))
  }, [stato.etf, user])

  const aggiornaStoricoAnnuale = useCallback(async (anno) => {
    // Calcola e salva un record per ogni broker con acquisti in quell'anno
    const fineAnno = `${anno}-12-31`
    const brokerIds = [...new Set(
      stato.etf.flatMap(e => e.acquisti.filter(a => a.data <= fineAnno).map(a => a.brokerId))
    )].filter(Boolean)
    if (brokerIds.length === 0) return

    const nuovi = brokerIds.map(brokerId => calcolaAnnoStorico(anno, brokerId, stato.etf, stato.prezziStorici))
    const { error } = await supabase
      .from('portafoglio_storico_annuale')
      .upsert(nuovi.map(r => ({ user_id: user.id, anno: r.anno, broker_id: r.brokerId, valore: r.valore, totale_versato: r.totaleVersato })))
    if (error) { console.error('Errore salvataggio storico annuale:', error); Sentry.captureException(new Error(error.message), { tags: { operation: 'aggiorna_storico_annuale' } }); return }

    setStato(s => {
      const altri = s.storicoPerBroker.filter(r => r.anno !== anno)
      return { ...s, storicoPerBroker: [...altri, ...nuovi].sort((a, b) => a.anno - b.anno) }
    })
  }, [stato.etf, stato.prezziStorici, user])

  const salvaPrezzoStorico = useCallback(async (isin, prezzo) => {
    if (!isin || !prezzo) return
    const oggi = new Date()
    const annoCorrente = oggi.getFullYear()
    const { error } = await supabase
      .from('etf_prezzi_storici')
      .upsert({ isin, anno: annoCorrente, mese: oggi.getMonth() + 1, prezzo: Number(prezzo) }, { onConflict: 'isin,anno,mese' })
    if (error) { console.error('Errore salvataggio storico prezzi:', error); Sentry.captureException(new Error(error.message), { tags: { operation: 'salva_prezzo_storico' } }) }

    // Backfill: per ogni anno passato che ha prezzi storici ma non ancora un record annuale
    const anniGiàSalvati = new Set(stato.storicoPerBroker.map(r => r.anno))
    const anniConPrezzi = [...new Set(stato.prezziStorici.map(p => p.anno))].filter(a => a < annoCorrente)
    for (const anno of anniConPrezzi) {
      if (!anniGiàSalvati.has(anno)) await aggiornaStoricoAnnuale(anno)
    }
  }, [aggiornaStoricoAnnuale, stato.prezziStorici, stato.storicoPerBroker])

  const aggiornaETF = useCallback(async (etfId, isin, campi) => {
    const dbCampi = {}
    if ('nome' in campi)           dbCampi.nome            = campi.nome
    if ('emittente' in campi)      dbCampi.emittente       = campi.emittente
    if ('importoFisso' in campi)   dbCampi.importo_fisso   = campi.importoFisso
    if ('prezzoCorrente' in campi) dbCampi.prezzo_corrente = campi.prezzoCorrente
    if ('assetClassId' in campi)   dbCampi.asset_class_id  = campi.assetClassId ?? null

    const { error } = await supabase
      .from('etf')
      .update(dbCampi)
      .eq('id', etfId)

    if (error) { Sentry.captureException(new Error(error.message), { tags: { operation: 'aggiorna_etf' } }); return 'Errore nell\'aggiornamento dell\'ETF.' }

    if ('prezzoCorrente' in campi) {
      await salvaPrezzoStorico(isin, campi.prezzoCorrente)
    }

    setStato(s => {
      // eslint-disable-next-line no-unused-vars
      const { assetClassId: _acId, ...campiStato } = campi
      const assetClassNome = 'assetClassId' in campi
        ? (campi.assetClassId ? (s.assetClasses.find(ac => ac.id === campi.assetClassId)?.nome ?? null) : null)
        : undefined
      return {
        ...s,
        etf: s.etf.map(e => e.id === etfId
          ? { ...e, ...campiStato, assetClassId: campi.assetClassId ?? e.assetClassId, ...(assetClassNome !== undefined ? { assetClassNome } : {}) }
          : e),
      }
    })
    return true
  }, [user, salvaPrezzoStorico])

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
        fee:               Number(item.fee),
        broker_id:         item.brokerId,
      }
    })

    const { data, error } = await supabase
      .from('acquisti')
      .insert(toInsert)
      .select()

    if (error) { Sentry.captureException(new Error(error.message), { tags: { operation: 'aggiungi_acquisti' } }); setErrore('Errore nell\'inserimento degli acquisti.'); return }

    let storicoToUpsert = null
    setStato(s => {
      let etf = s.etf
      for (const row of data) {
        const acq = mapAcquisto(row)
        etf = etf.map(e => e.id === row.etf_id
          ? { ...e, acquisti: [...e.acquisti, acq].sort((a, b) => a.data.localeCompare(b.data)) }
          : e)
      }
      const annoCorrente = new Date().getFullYear()
      const anniPassati = [...new Set(
        items.map(i => Number(i.data.slice(0, 4))).filter(a => a > 0 && a < annoCorrente)
      )]
      let storicoPerBroker = s.storicoPerBroker
      if (anniPassati.length > 0) {
        const perBroker = anniPassati.flatMap(anno => {
          const fineAnno = `${anno}-12-31`
          const brokerIds = [...new Set(
            etf.flatMap(e => e.acquisti.filter(a => a.data <= fineAnno).map(a => a.brokerId))
          )].filter(Boolean)
          return brokerIds.map(brokerId => calcolaAnnoStorico(anno, brokerId, etf, s.prezziStorici))
        })
        storicoToUpsert = perBroker
        const anniToccati = new Set(anniPassati)
        storicoPerBroker = [
          ...s.storicoPerBroker.filter(r => !anniToccati.has(r.anno)),
          ...perBroker,
        ].sort((a, b) => a.anno - b.anno)
      }
      return { ...s, etf, storicoPerBroker }
    })
    if (storicoToUpsert) {
      const { error: errStorico } = await supabase
        .from('portafoglio_storico_annuale')
        .upsert(storicoToUpsert.map(r => ({
          user_id: user.id, anno: r.anno, broker_id: r.brokerId,
          valore: r.valore, totale_versato: r.totaleVersato,
        })))
      if (errStorico) { Sentry.captureException(new Error(errStorico.message), { tags: { operation: 'aggiungi_acquisti_storico' } }); setErrore('Errore nel salvataggio storico annuale.') }
    }
  }, [user])

  const rimuoviAcquisto = useCallback(async (etfId, acquistoId) => {
    const { error } = await supabase
      .from('acquisti')
      .delete()
      .eq('id', acquistoId)

    if (error) { Sentry.captureException(new Error(error.message), { tags: { operation: 'rimuovi_acquisto' } }); setErrore('Errore nella rimozione dell\'acquisto.'); return }

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

    if (error) { Sentry.captureException(new Error(error.message), { tags: { operation: 'aggiungi_scenario' } }); setErrore('Errore nell\'aggiunta dello scenario.'); return }

    setStato(s => ({ ...s, scenari: [...s.scenari, mapScenario(data)] }))
  }, [user])

  const rimuoviScenario = useCallback(async (id) => {
    const { error } = await supabase.from('scenari').delete().eq('id', id)

    if (error) { Sentry.captureException(new Error(error.message), { tags: { operation: 'rimuovi_scenario' } }); setErrore('Errore nella rimozione dello scenario.'); return }

    setStato(s => ({ ...s, scenari: s.scenari.filter(sc => sc.id !== id) }))
  }, [user])

  const aggiornaScenario = useCallback(async (id, campi) => {
    const dbCampi = {}
    if ('nome' in campi)            dbCampi.nome             = campi.nome
    if ('rendimentoAnnuo' in campi) dbCampi.rendimento_annuo = campi.rendimentoAnnuo
    if ('colore' in campi)          dbCampi.colore           = campi.colore

    const { error } = await supabase.from('scenari').update(dbCampi).eq('id', id)

    if (error) { Sentry.captureException(new Error(error.message), { tags: { operation: 'aggiorna_scenario' } }); setErrore('Errore nell\'aggiornamento dello scenario.'); return }

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

  // ── Broker ────────────────────────────────────────────────────────
  const aggiungiBroker = useCallback(async (nome, colore) => {
    const { data, error } = await supabase
      .from('broker')
      .insert({ user_id: user.id, nome, colore })
      .select()
      .single()

    if (error) { Sentry.captureException(new Error(error.message), { tags: { operation: 'aggiungi_broker' } }); setErrore('Errore nell\'aggiunta del broker.'); return }

    setStato(s => ({ ...s, broker: [...s.broker, mapBroker(data)] }))
  }, [user])

  const aggiornaBroker = useCallback(async (id, campi) => {
    const dbCampi = {}
    if ('nome' in campi)       dbCampi.nome       = campi.nome
    if ('colore' in campi)     dbCampi.colore     = campi.colore
    if ('archiviato' in campi) dbCampi.archiviato = campi.archiviato

    const { error } = await supabase.from('broker').update(dbCampi).eq('id', id)

    if (error) { Sentry.captureException(new Error(error.message), { tags: { operation: 'aggiorna_broker' } }); setErrore('Errore nell\'aggiornamento del broker.'); return }

    setStato(s => ({
      ...s,
      broker: s.broker.map(b => b.id === id ? { ...b, ...campi } : b),
    }))
  }, [user])

  const eliminaBroker = useCallback(async (id) => {
    const { error } = await supabase.from('broker').delete().eq('id', id)

    if (error) { Sentry.captureException(new Error(error.message), { tags: { operation: 'elimina_broker' } }); setErrore('Impossibile eliminare il broker: ha acquisti associati.'); return }

    setStato(s => ({
      ...s,
      broker: s.broker.filter(b => b.id !== id),
      brokerFiltro: s.brokerFiltro.filter(bid => bid !== id),
    }))
  }, [user])

  const setBrokerFiltro = useCallback(async (ids) => {
    await supabase.from('config').upsert({ user_id: user.id, broker_filtro: ids })
    setStato(s => ({ ...s, brokerFiltro: ids }))
  }, [user])

  // ── Export ────────────────────────────────────────────────────────
  const exportJSON = useCallback(() => {
    // Escludi: dati condivisi, derivati, stato UI e configurazione obsoleta
    // eslint-disable-next-line no-unused-vars
    const { prezziStorici, storicoPerBroker, brokerFiltro, mostraProiezione, scenari, ...daEsportare } = stato

    // Aggiungi brokerNome in ogni acquisto e assetClassNome in ogni ETF per mapping portabile
    const brokerMap = new Map(stato.broker.map(b => [b.id, b.nome]))
    const acMap = new Map(stato.assetClasses.map(ac => [ac.id, ac.nome]))
    const etfConMeta = daEsportare.etf.map(({ id: _etfId, assetClassId, ...etf }) => ({
      ...etf,
      assetClassNome: assetClassId ? (acMap.get(assetClassId) ?? etf.assetClassNome ?? null) : (etf.assetClassNome ?? null),
      acquisti: (etf.acquisti || []).map(({ id: _aId, brokerId, ...a }) => ({
        ...a,
        brokerNome: brokerMap.get(brokerId) ?? null,
      })),
    }))
    const brokerSenzaId = (daEsportare.broker || []).map(({ id: _bId, ...b }) => b)

    const blob = new Blob([JSON.stringify({ ...daEsportare, broker: brokerSenzaId, etf: etfConMeta }, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `etflens-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [stato])

  // ── Import (sovrascrive ETF e acquisti su Supabase) ───────────────
  const importJSON = useCallback((file) => {
    // Errore atteso (input utente) — marcato con _handled per il catch
    function errAtteso(msg) { const e = new Error(msg); e._handled = true; return e }

    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = async (e) => {
        setLoading(true)
        try {
          if (e.target.result.length > 1024 * 1024) {
            throw errAtteso('File troppo grande (max 1 MB)')
          }
          const data = JSON.parse(e.target.result)
          if (!Array.isArray(data.etf) || !Array.isArray(data.broker)) {
            throw errAtteso('File JSON non valido: struttura non riconosciuta')
          }

          // Validazione schema: campi obbligatori, formati, valori numerici positivi
          const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
          for (const etf of data.etf) {
            if (typeof etf.nome !== 'string' || !etf.nome.trim())
              throw errAtteso('ETF con nome mancante o non valido')
            if (!Number.isFinite(Number(etf.importoFisso)) || Number(etf.importoFisso) < 0)
              throw errAtteso(`ETF "${etf.nome}": importoFisso non valido`)
            if (!Number.isFinite(Number(etf.prezzoCorrente)) || Number(etf.prezzoCorrente) < 0)
              throw errAtteso(`ETF "${etf.nome}": prezzoCorrente non valido`)
            for (const a of (etf.acquisti || [])) {
              if (typeof a.data !== 'string' || !DATE_RE.test(a.data))
                throw errAtteso(`ETF "${etf.nome}": data acquisto non valida "${a.data}"`)
              if (!Number.isFinite(Number(a.importoInvestito)) || Number(a.importoInvestito) <= 0)
                throw errAtteso(`ETF "${etf.nome}": importoInvestito non valido`)
              if (!Number.isFinite(Number(a.prezzoUnitario)) || Number(a.prezzoUnitario) <= 0)
                throw errAtteso(`ETF "${etf.nome}": prezzoUnitario non valido`)
              if (!Number.isFinite(Number(a.quoteFrazionate)) || Number(a.quoteFrazionate) < 0)
                throw errAtteso(`ETF "${etf.nome}": quoteFrazionate non valido`)
            }
          }
          for (const b of data.broker) {
            if (typeof b.nome !== 'string' || !b.nome.trim())
              throw errAtteso('Broker con nome mancante o non valido')
          }

          // Carica broker esistenti nel DB e inserisce quelli mancanti dal JSON
          const { data: brokerEsistenti, error: brkLoadErr } = await supabase
            .from('broker').select('id, nome').eq('user_id', user.id)
          if (brkLoadErr) throw brkLoadErr
          const brokerNomi = new Map((brokerEsistenti || []).map(b => [b.nome, b.id]))
          for (const b of (data.broker || [])) {
            if (!brokerNomi.has(b.nome)) {
              const { data: row } = await supabase
                .from('broker')
                .insert({ user_id: user.id, nome: b.nome, colore: b.colore })
                .select('id, nome')
                .single()
              if (row) brokerNomi.set(row.nome, row.id)
            }
          }

          // Carica asset_class per risolvere assetClassNome → asset_class_id
          const { data: acData } = await supabase
            .from('asset_class').select('id, nome').eq('visibile', true)
          const acNomeMap = new Map((acData || []).map(ac => [ac.nome, ac.id]))

          // Cancella ETF esistenti (cascade elimina automaticamente gli acquisti)
          const { error: delEtfErr } = await supabase.from('etf').delete().eq('user_id', user.id)
          if (delEtfErr) throw delEtfErr

          // Inserisce ETF uno alla volta per ottenere gli UUID reali → Map<isin, dbId>
          const isinMap = new Map()
          if ((data.etf || []).length > 0) {
            let attiviCount = 0
            for (const etf of data.etf) {
              const archiviato = etf.archiviato || attiviCount >= 9
              if (!archiviato) attiviCount++
              const assetClassId = etf.assetClassNome ? (acNomeMap.get(etf.assetClassNome) ?? null) : null
              const { data: row, error } = await supabase
                .from('etf')
                .insert({
                  user_id:         user.id,
                  nome:            etf.nome,
                  isin:            etf.isin,
                  emittente:       etf.emittente || '',
                  importo_fisso:   etf.importoFisso,
                  prezzo_corrente: etf.prezzoCorrente,
                  archiviato,
                  asset_class_id:  assetClassId,
                })
                .select('id, isin')
                .single()
              if (error) throw error
              isinMap.set(etf.isin, row.id)
            }
          }

          // Inserisce acquisti con etf_id da isinMap e broker_id da brokerNomi
          const acquistiRows = (data.etf || []).flatMap(etf =>
            (etf.acquisti || []).map(a => {
              const bNome = a.brokerNome ?? null
              return {
                etf_id:            isinMap.get(etf.isin),
                user_id:           user.id,
                data:              a.data,
                importo_investito: a.importoInvestito,
                prezzo_unitario:   a.prezzoUnitario,
                quote_frazionate:  a.quoteFrazionate,
                fee:               Number(a.fee),
                broker_id:         bNome ? (brokerNomi.get(bNome) ?? null) : null,
              }
            })
          )
          if (acquistiRows.length > 0) {
            const { error: insAcqErr } = await supabase.from('acquisti').insert(acquistiRows)
            if (insAcqErr) throw insAcqErr
          }

          // Aggiorna config (mostra_proiezione escluso: campo obsoleto)
          const { error: confErr } = await supabase.from('config').upsert({
            user_id:        user.id,
            orizzonte_anni: data.orizzonteAnni ?? 10,
          })
          if (confErr) throw confErr

          await caricaDati()
          resolve()
        } catch (err) {
          const atteso = err instanceof SyntaxError || err._handled === true
          Sentry.captureException(err, {
            level: atteso ? 'warning' : 'error',
            mechanism: { type: 'generic', handled: atteso },
            tags: { operation: 'import_json' },
          })
          setLoading(false)
          reject(err instanceof SyntaxError ? new Error('File JSON non valido') : err)
        }
      }
      reader.readAsText(file)
    })
  }, [user, caricaDati])

  const storicoAnnuale = stato.storicoPerBroker.length === 0
    ? []
    : stato.brokerFiltro.length === 0
      ? aggregaPerAnno(stato.storicoPerBroker)
      : aggregaPerAnno(stato.storicoPerBroker.filter(r => stato.brokerFiltro.includes(r.brokerId)))

  return {
    ...stato,
    storicoAnnuale,
    assetClasses: stato.assetClasses,
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
    aggiungiBroker,
    aggiornaBroker,
    eliminaBroker,
    setBrokerFiltro,
    exportJSON,
    importJSON,
  }
}
