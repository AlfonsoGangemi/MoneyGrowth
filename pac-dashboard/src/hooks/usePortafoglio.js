import { useState, useEffect, useCallback } from 'react'
import { v4 as uuidv4 } from 'uuid'

const STORAGE_KEY = 'pac-dashboard-data'

const defaultScenari = [
  { id: uuidv4(), nome: 'Pessimistico', rendimentoAnnuo: 0.04, colore: '#ef4444' },
  { id: uuidv4(), nome: 'Moderato',     rendimentoAnnuo: 0.07, colore: '#f59e0b' },
  { id: uuidv4(), nome: 'Ottimistico',  rendimentoAnnuo: 0.10, colore: '#22c55e' },
]

const defaultState = {
  etf: [],
  scenari: defaultScenari,
  orizzonteAnni: 10,
  mostraProiezione: true,
}

function caricaDaStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultState
    return { ...defaultState, ...JSON.parse(raw) }
  } catch {
    return defaultState
  }
}

export function usePortafoglio() {
  const [stato, setStato] = useState(caricaDaStorage)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stato))
  }, [stato])

  // ── ETF ──────────────────────────────────────────────────────────
  const aggiungiETF = useCallback((nome, isin, emittente, importoFisso) => {
    setStato(s => {
      if (s.etf.length >= 5) return s
      return {
        ...s,
        etf: [...s.etf, {
          id: uuidv4(),
          nome,
          isin,
          emittente: emittente || '',
          importoFisso: Number(importoFisso),
          prezzoCorrente: 0,
          archiviato: false,
          acquisti: [],
        }],
      }
    })
  }, [])

  const archiviaETF = useCallback((etfId) => {
    setStato(s => ({
      ...s,
      etf: s.etf.map(e => e.id === etfId ? { ...e, archiviato: !e.archiviato } : e),
    }))
  }, [])

  const aggiornaETF = useCallback((etfId, campi) => {
    setStato(s => ({
      ...s,
      etf: s.etf.map(e => e.id === etfId ? { ...e, ...campi } : e),
    }))
  }, [])

  // ── Acquisti ─────────────────────────────────────────────────────
  const aggiungiAcquistiMultipli = useCallback((items) => {
    // items: [{ etfId, data, importoInvestito, prezzoUnitario }]
    setStato(s => {
      let etf = s.etf
      for (const item of items) {
        const imp = Number(item.importoInvestito)
        const prezzo = Number(item.prezzoUnitario)
        const acquisto = {
          id: uuidv4(),
          data: item.data,
          importoInvestito: imp,
          prezzoUnitario: prezzo,
          quoteFrazionate: prezzo > 0 ? imp / prezzo : 0,
        }
        etf = etf.map(e => e.id === item.etfId
          ? { ...e, acquisti: [...e.acquisti, acquisto].sort((a, b) => a.data.localeCompare(b.data)) }
          : e)
      }
      return { ...s, etf }
    })
  }, [])

  const rimuoviAcquisto = useCallback((etfId, acquistoId) => {
    setStato(s => ({
      ...s,
      etf: s.etf.map(e => e.id === etfId
        ? { ...e, acquisti: e.acquisti.filter(a => a.id !== acquistoId) }
        : e),
    }))
  }, [])

  // ── Scenari ───────────────────────────────────────────────────────
  const aggiungiScenario = useCallback((nome, rendimentoAnnuo, colore) => {
    setStato(s => ({
      ...s,
      scenari: [...s.scenari, { id: uuidv4(), nome, rendimentoAnnuo: Number(rendimentoAnnuo), colore }],
    }))
  }, [])

  const rimuoviScenario = useCallback((id) => {
    setStato(s => ({ ...s, scenari: s.scenari.filter(sc => sc.id !== id) }))
  }, [])

  const aggiornaScenario = useCallback((id, campi) => {
    setStato(s => ({
      ...s,
      scenari: s.scenari.map(sc => sc.id === id ? { ...sc, ...campi } : sc),
    }))
  }, [])

  // ── Config ────────────────────────────────────────────────────────
  const setOrizzonteAnni = useCallback((anni) => {
    setStato(s => ({ ...s, orizzonteAnni: Number(anni) }))
  }, [])

  const setMostraProiezione = useCallback((val) => {
    setStato(s => ({ ...s, mostraProiezione: val }))
  }, [])

  // ── Export / Import ───────────────────────────────────────────────
  const exportJSON = useCallback(() => {
    const blob = new Blob([JSON.stringify(stato, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `pac-dashboard-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }, [stato])

  const importJSON = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = JSON.parse(e.target.result)
          setStato({ ...defaultState, ...data })
          resolve()
        } catch {
          reject(new Error('File JSON non valido'))
        }
      }
      reader.readAsText(file)
    })
  }, [])

  return {
    ...stato,
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
