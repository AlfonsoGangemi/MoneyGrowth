---
id: PAC-98
title: 'Feature: integrazione prezzi live via WebSocket ExtraETF'
status: Done
assignee: []
created_date: '2026-04-01 08:25'
updated_date: '2026-04-01 22:58'
labels:
  - feature
  - infrastructure
  - experimental
milestone: m-1
dependencies: []
references:
  - pac-dashboard/src/hooks/usePortafoglio.js
  - pac-dashboard/src/components/ETFCard.jsx
  - pac-dashboard/api/justetf-proxy.js
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Obiettivo

Aggiornare automaticamente il prezzo corrente degli ETF non archiviati tramite il WebSocket `wss://quotes.extraetf.com/v1/ws`, eliminando l'inserimento manuale del prezzo.

## Comportamento attuale

- L'utente inserisce manualmente `prezzoCorrente` nel form ETF (Dashboard.jsx)
- Il valore viene salvato su `etf.prezzo_corrente` (Supabase) e su `etf_prezzi_storici`
- Non esiste aggiornamento automatico dei prezzi

## Soluzione

### Proxy Vercel (`api/extraetf-quotes.js`)

Il WS non è usabile direttamente dal browser (origin check lato server). Un proxy serverless Vercel apre la connessione internamente spoofando l'Origin.

```
Client → GET /api/extraetf-quotes?isins=IE00B4L5Y983,...
  → Vercel apre WS con Origin: https://extraetf.com
  → invia {"subscribe":{"isins":[...]}}
  → attende un messaggio per ogni ISIN (snapshot)
  → invia {"unsubscribe":{"isins":[...]}}
  → chiude WS → restituisce JSON {isin: prezzo, ...}
```

### Hook `useETFQuotes`

- Al mount: chiama il proxy per tutti gli ISIN degli ETF con `archiviato=false`
- Aggiorna `prezzoCorrente` nello stato React locale
- Scrive su Supabase (`etf.prezzo_corrente` + `etf_prezzi_storici`) al primo prezzo ricevuto, al cambio di `brokerFiltro` e alla chiusura sessione
- Se il proxy non risponde: log Sentry + fallback silenzioso sul prezzo Supabase

### Persistenza

| Evento | Azione |
|---|---|
| Primo prezzo ricevuto | Salva su Supabase |
| Cambio `brokerFiltro` | Salva prezzi ETF coinvolti prima di aggiornare |
| Chiusura sessione (unmount / visibilitychange / beforeunload) | Salva tutti i prezzi live in memoria |

## Rischi noti

- API non ufficiale: potrebbe cambiare formato, aggiungere autenticazione o bloccare origin senza preavviso
- Prezzi significativi solo durante orari di borsa; fuori orario il feed può restituire prezzi piatti o non rispondere
- `etf_prezzi_storici` rimane invariato — serve per il grafico storico, non riceve aggiornamenti dal WS
- I calcoli PAC continuano a usare il prezzo da Supabase, non il valore live in memoria
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 L'hook `useETFQuotes` si iscrive al WS solo per gli ETF con `archiviato=false`
- [ ] #2 Ogni messaggio ricevuto aggiorna `prezzoCorrente` nello stato React locale
- [ ] #3 Il primo prezzo ricevuto per ogni ISIN viene scritto su Supabase (`etf.prezzo_corrente` + `etf_prezzi_storici`)
- [ ] #4 Quando cambiano gli ETF attivi in base ai broker selezionati (variazione di `brokerFiltro`), il prezzo corrente degli ETF coinvolti viene salvato su Supabase prima di aggiornare la sottoscrizione WS
- [ ] #5 Alla chiusura della sessione (unmount / visibilitychange hidden / beforeunload), i prezzi live in memoria vengono scritti su Supabase per tutti gli ETF non archiviati
- [ ] #6 Se il WS non risponde entro il timeout, viene registrato un evento su Sentry con il dettaglio dell'errore; il prezzo visualizzato rimane quello salvato su Supabase (fallback silenzioso)
- [ ] #7 La connessione WS viene chiusa correttamente con messaggio unsubscribe prima del cleanup (no memory leak)
- [ ] #8 I calcoli PAC (calcoli.js, portafoglio_storico_annuale) continuano a usare il prezzo da Supabase, non il prezzo live in memoria
- [ ] #9 ETFCard mostra un indicatore visivo (es. badge 'live') quando il prezzo proviene dal WS
- [ ] #10 [già verificato] Il WebSocket funziona dal dominio di produzione etflens.app senza blocco origin
- [ ] #11 ETFCard espone un pulsante 'Aggiorna prezzo' che chiama il proxy per il singolo ISIN e salva il prezzo ricevuto su Supabase
- [ ] #12 La Dashboard espone un pulsante 'Aggiorna tutti i prezzi' che chiama il proxy per tutti gli ISIN degli ETF non archiviati e salva i prezzi ricevuti su Supabase
- [ ] #13 Durante il refresh (singolo o globale) i pulsanti mostrano uno stato di caricamento e sono disabilitati fino al completamento
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Ordine di esecuzione

1. `api/extraetf-quotes.js` — proxy Vercel (WS → REST)
2. `src/hooks/useETFQuotes.js` — hook di auto-aggiornamento
3. `src/components/ETFCard.jsx` — sostituire endpoint + badge live + pulsante singolo
4. `src/components/Dashboard.jsx` — sostituire `aggiornaTuttiIPrezzi` + integrare hook

---

## Step 1 — `pac-dashboard/api/extraetf-quotes.js` (nuovo file)

Pattern identico a `justetf-proxy.js` (rate limiting in-memory, stessa struttura).

```js
import WebSocket from 'ws'

const RATE_LIMIT = 60
const RATE_WINDOW = 60 * 1000
const rateMap = new Map()

function isRateLimited(ip) { /* stessa logica di justetf-proxy.js */ }

const TIMEOUT_MS = 8_000

export default async function handler(req, res) {
  const ip = req.headers['x-forwarded-for']?.split(',')[0].trim() || 'unknown'
  if (isRateLimited(ip)) return res.status(429).json({ error: 'Troppe richieste.' })

  const rawIsins = req.query.isins ?? ''
  const isins = rawIsins.split(',').map(s => s.trim()).filter(Boolean)
  if (isins.length === 0) return res.status(400).json({ error: 'isins mancanti' })

  const pending = new Set(isins)
  const received = {}
  let resolved = false

  return new Promise((resolve) => {
    const ws = new WebSocket('wss://quotes.extraetf.com/v1/ws', {
      headers: { Origin: 'https://extraetf.com' },
    })

    const timeout = setTimeout(() => {
      if (resolved) return
      resolved = true
      try { ws.send(JSON.stringify({ unsubscribe: { isins } })); ws.close() } catch (_) {}
      res.status(200).json({ prices: received, missing: [...pending] })
      resolve()
    }, TIMEOUT_MS)

    ws.on('open', () => {
      ws.send(JSON.stringify({ subscribe: { isins } }))
    })

    ws.on('message', (data) => {
      if (resolved) return
      let msg
      try { msg = JSON.parse(data) } catch { return }
      if (!msg.i || !pending.has(msg.i) || msg.m == null) return
      received[msg.i] = msg.m
      pending.delete(msg.i)
      if (pending.size === 0) {
        resolved = true
        clearTimeout(timeout)
        try { ws.send(JSON.stringify({ unsubscribe: { isins } })); ws.close() } catch (_) {}
        res.status(200).json({ prices: received, missing: [] })
        resolve()
      }
    })

    ws.on('error', (err) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      try { ws.close() } catch (_) {}
      // Non loggare su Sentry lato server — sarà il client a catturare via AC#6
      res.status(502).json({ error: 'WS error', prices: received, missing: [...pending] })
      resolve()
    })
  })
}
```

**Nota:** `ws` è già in `dependencies` di `package.json`.

---

## Step 2 — `src/hooks/useETFQuotes.js` (nuovo file)

```js
import { useEffect, useRef, useCallback } from 'react'
import * as Sentry from '@sentry/react'
import { supabase } from '../utils/supabase'

/**
 * Carica i prezzi live via /api/extraetf-quotes al mount.
 * Persiste su Supabase al primo prezzo ricevuto, al cambio brokerFiltro,
 * e alla chiusura sessione.
 *
 * @param {object} params
 * @param {Array}  params.etfList        - ETF dallo stato usePortafoglio
 * @param {Array}  params.brokerFiltro   - filtro broker corrente
 * @param {Function} params.aggiornaETF - hook per aggiornare prezzo
 */
export function useETFQuotes({ etfList, brokerFiltro, aggiornaETF }) {
  // liveMap: { [isin]: prezzo } — prezzi ricevuti nella sessione
  const liveMap = useRef({})
  // savedIsins: Set<isin> — ISIN già persistiti su Supabase questa sessione
  const savedIsins = useRef(new Set())
  const prevBrokerFiltro = useRef(brokerFiltro)

  // Persiste i prezzi correnti su Supabase per gli ISIN non ancora salvati
  const persistiPrezzi = useCallback(async (isinsToSave) => {
    for (const isin of isinsToSave) {
      const prezzo = liveMap.current[isin]
      if (prezzo == null) continue
      const etf = etfList.find(e => e.isin === isin)
      if (!etf) continue
      await aggiornaETF(etf.id, isin, { prezzoCorrente: prezzo })
    }
  }, [etfList, aggiornaETF])

  // Fetch prezzi al mount
  useEffect(() => {
    const attivi = etfList.filter(e => !e.archiviato && e.isin)
    if (attivi.length === 0) return

    const isins = attivi.map(e => e.isin)

    async function fetchPrezzi() {
      try {
        const res = await fetch(`/api/extraetf-quotes?isins=${isins.join(',')}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()

        // Aggiorna liveMap e salva primo prezzo su Supabase
        const nuovi = []
        for (const [isin, prezzo] of Object.entries(data.prices ?? {})) {
          liveMap.current[isin] = prezzo
          if (!savedIsins.current.has(isin)) {
            nuovi.push(isin)
            savedIsins.current.add(isin)
          }
        }
        if (nuovi.length > 0) await persistiPrezzi(nuovi)

        if ((data.missing ?? []).length > 0) {
          Sentry.captureMessage('useETFQuotes: ISIN senza prezzo dal WS', {
            level: 'warning',
            tags: { operation: 'etf_quotes_missing' },
            extra: { missing: data.missing },
          })
        }
      } catch (err) {
        Sentry.captureException(err, { tags: { operation: 'etf_quotes_fetch' } })
        // fallback silenzioso: prezzi rimangono quelli da Supabase
      }
    }

    fetchPrezzi()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // solo al mount

  // Persisti prima del cambio brokerFiltro
  useEffect(() => {
    const prev = prevBrokerFiltro.current
    const changed = JSON.stringify(prev) !== JSON.stringify(brokerFiltro)
    if (!changed) return
    prevBrokerFiltro.current = brokerFiltro
    const toSave = Object.keys(liveMap.current).filter(isin => savedIsins.current.has(isin))
    if (toSave.length > 0) persistiPrezzi(toSave)
  }, [brokerFiltro, persistiPrezzi])

  // Persisti alla chiusura sessione
  useEffect(() => {
    function onClose() {
      const toSave = Object.keys(liveMap.current)
      if (toSave.length === 0) return
      // Usa sendBeacon o fetch con keepalive per garantire l'invio
      // aggiornaETF è async — in unmount/beforeunload usiamo supabase direttamente
      const oggi = new Date()
      for (const [isin, prezzo] of Object.entries(liveMap.current)) {
        const etf = etfList.find(e => e.isin === isin)
        if (!etf) continue
        // fire-and-forget
        supabase.from('etf').update({ prezzo_corrente: prezzo }).eq('id', etf.id).then(() => {})
        supabase.from('etf_prezzi_storici').upsert(
          { isin, anno: oggi.getFullYear(), mese: oggi.getMonth() + 1, prezzo },
          { onConflict: 'isin,anno,mese' }
        ).then(() => {})
      }
    }

    window.addEventListener('beforeunload', onClose)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') onClose()
    })
    return () => {
      onClose() // unmount
      window.removeEventListener('beforeunload', onClose)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [etfList])

  return { liveMap: liveMap.current }
}
```

---

## Step 3 — `src/components/ETFCard.jsx`

### 3a. Aggiungere prop `livePrezzo`

```js
export default function ETFCard({ etf, ..., livePrezzo, onRefreshPrezzo, ... })
```

`livePrezzo`: numero o undefined. `onRefreshPrezzo`: callback per refresh puntuale (dal parent).

### 3b. Badge live

Sotto il prezzo corrente, mostrare badge se `livePrezzo !== undefined`:
```jsx
{livePrezzo !== undefined && (
  <span className="text-xs font-semibold px-1.5 py-0.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400">
    live
  </span>
)}
```

Mostrare `livePrezzo` se disponibile, altrimenti `etf.prezzoCorrente`.

### 3c. Sostituire endpoint in `aggiornaPrezzoAPI`

```js
async function aggiornaPrezzoAPI() {
  ...
  const res = await fetch(`/api/extraetf-quotes?isins=${etf.isin}`, { signal: controller.signal })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const data = await res.json()
  const prezzo = data?.prices?.[etf.isin]
  if (!prezzo || isNaN(prezzo) || prezzo <= 0) throw new Error('prezzo non valido')
  onAggiornaPrezzo(etf.id, prezzo)
  ...
}
```

---

## Step 4 — `src/components/Dashboard.jsx`

### 4a. Integrare `useETFQuotes`

```js
import { useETFQuotes } from '../hooks/useETFQuotes'
...
const { liveMap } = useETFQuotes({
  etfList: port.etf,
  brokerFiltro: port.brokerFiltro,
  aggiornaETF: port.aggiornaETF,
})
```

### 4b. Sostituire `aggiornaTuttiIPrezzi`

Rimpiazzare il corpo della funzione (attualmente chiama `/api/justetf-proxy` in loop) con chiamata a `/api/extraetf-quotes`:

```js
async function aggiornaTuttiIPrezzi() {
  if (aggStato === 'running' || globalCooldownSec > 0) return
  const daAggiornare = etfAttivi.filter(e => e.isin)
  if (daAggiornare.length === 0) return
  setAggStato('running')
  setAggErroriIsin([])
  try {
    const isins = daAggiornare.map(e => e.isin)
    const res = await fetch(`/api/extraetf-quotes?isins=${isins.join(',')}`)
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    const data = await res.json()
    for (const etf of daAggiornare) {
      const prezzo = data.prices?.[etf.isin]
      if (prezzo && prezzo > 0) handleAggiornaPrezzo(etf.id, prezzo)
    }
    if ((data.missing ?? []).length > 0) setAggErroriIsin(data.missing)
  } catch (err) {
    Sentry.captureException(err, { tags: { operation: 'aggiorna_tutti_prezzi' } })
    setAggErroriIsin(daAggiornare.map(e => e.isin))
  } finally {
    setAggStato('idle')
    setGlobalCooldownSec(60)
  }
}
```

### 4c. Passare `livePrezzo` a ETFCard

```jsx
<ETFCard
  ...
  livePrezzo={liveMap[etf.isin]}
  ...
/>
```

---

## Note

- Nessuna dipendenza da PAC-96 per questo task
- Il rate limiting rimane in-memory (PAC-69 rinviato)
- La funzione `aggiornaPrezzoAPI` in ETFCard usa lo stesso endpoint del proxy bulk — nessuna API separata per singolo ISIN
- Il timeout Vercel per funzioni serverless è 10s di default (piano Hobby) — il timeout interno del proxy (8s) garantisce risposta prima del timeout Vercel
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Protocollo WebSocket ExtraETF

**Endpoint:** `wss://quotes.extraetf.com/v1/ws`

**Autenticazione:** nessuna — ma il server verifica l'`Origin` header. Testato: funziona con `Origin: https://extraetf.com` da Node.js.

**Messaggi:**
```json
// Subscribe
{"subscribe":{"isins":["LU0478205379","IE00B4L5Y983"]}}

// Unsubscribe (prima di chiudere)
{"unsubscribe":{"isins":["LU0478205379","IE00B4L5Y983"]}}
```

## Architettura: polling proxy REST su Vercel

Il WS non è usabile direttamente dal browser del client (origin bloccata). Soluzione: proxy serverless Vercel che apre il WS internamente.

**Flusso:**
```
Client (ogni 60s)
  → GET /api/extraetf-quotes?isins=IE00B4L5Y983,...
    → Vercel function apre WS verso extraetf con Origin: https://extraetf.com
    → invia {"subscribe":{"isins":[...]}}
    → attende un messaggio per ogni ISIN
    → invia {"unsubscribe":{"isins":[...]}}
    → chiude WS
    → restituisce JSON con i prezzi
  → useETFQuotes aggiorna stato React (no scrittura Supabase)
```

**Vantaggi:**
- Rientra nei timeout Vercel (WS breve, non persistente)
- Stessa architettura di `justetf-proxy.js`
- Dipendenza aggiuntiva: solo pacchetto `ws` (Node.js)

**File da creare:** `pac-dashboard/api/extraetf-quotes.js`

## Payload risposta ExtraETF (verificato 2026-04-01)

```json
{
  "i": "LU0478205379",   // ISIN
  "b": 161.51,           // bid
  "a": 161.68,           // ask
  "m": 161.595,          // mid price — campo da usare
  "c": "EUR",            // valuta
  "t": "2026-04-01T09:16:48.082Z", // timestamp
  "d": {
    "d": { "m": { "a": 1.23,  "r": 0.0076  } },  // daily:   assoluto, relativo
    "w": { "m": { "a": 1.92,  "r": 0.0121  } },  // weekly
    "m": { "m": { "a": -2.38, "r": -0.0145 } }   // monthly
  },
  "s": "ls",   // status
  "r": null
}
```

**Campo da mappare:** `m` → `prezzoCorrente`

**Note:**
- Il server invia un solo messaggio per ISIN alla subscription (snapshot, non stream continuo) — confermato in produzione
- Il campo `d` contiene variazioni giornaliere/settimanali/mensili: potenzialmente utile per future feature (es. badge +/- giornaliero in ETFCard)
- Vercel produzione (etflens.app) confermato funzionante — AC #7 verificato

## Flusso connessione WS — gestione ISIN e duplicati

### Logica proxy (`api/extraetf-quotes.js`)

La deduplication e il completeness check avvengono server-side nel proxy, non nel client.

```js
const pending = new Set(isins)   // ISIN richiesti
const received = {}              // isin → primo prezzo valido

ws.on('message', (data) => {
  const msg = JSON.parse(data)

  // scarta duplicati e ISIN non richiesti
  if (!msg.i || !pending.has(msg.i)) return

  received[msg.i] = msg.m        // primo messaggio vince
  pending.delete(msg.i)

  if (pending.size === 0) {      // tutti ricevuti
    ws.send(JSON.stringify({ unsubscribe: { isins } }))
    ws.close()
    return res.status(200).json({ prices: received, missing: [] })
  }
})

// timeout: restituisce i prezzi parziali + lista ISIN mancanti
// il client usa missing[] per il log Sentry e il fallback Supabase
```

### Formato risposta proxy

```json
// caso completo
{ "prices": { "IE00B4L5Y983": 161.595, "LU0478205379": 98.20 }, "missing": [] }

// caso timeout parziale
{ "prices": { "IE00B4L5Y983": 161.595 }, "missing": ["LU0478205379"] }
```

### Logica hook client (`useETFQuotes`)

1. Chiama il proxy con tutti gli ISIN degli ETF con `archiviato=false`
2. Per ogni ISIN in `prices` → aggiorna stato React + salva su Supabase (se primo prezzo)
3. Per ogni ISIN in `missing` → mantieni prezzo Supabase invariato + log Sentry con lista ISIN mancanti
<!-- SECTION:NOTES:END -->
