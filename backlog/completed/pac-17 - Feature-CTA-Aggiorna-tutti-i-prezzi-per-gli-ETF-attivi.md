---
id: PAC-17
title: 'Feature: CTA "Aggiorna tutti i prezzi" per gli ETF attivi'
status: Done
assignee: []
created_date: '2026-03-11 23:19'
updated_date: '2026-03-12 11:48'
labels:
  - feature
  - ux
dependencies: []
references:
  - pac-dashboard/src/components/Dashboard.jsx
  - pac-dashboard/src/components/ETFCard.jsx
  - pac-dashboard/src/hooks/usePortafoglio.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Obiettivo

Aggiungere un pulsante nella dashboard che aggiorni il prezzo corrente di tutti gli ETF non archiviati con un solo click, usando lo stesso endpoint proxy già usato dai singoli pulsanti di sync in `ETFCard`.

## Meccanismo esistente (singolo ETF)

`ETFCard.aggiornaPrezzoAPI()`:
1. GET `/api/justetf-proxy?proxyPath=api/etfs/{isin}/quote&locale=it&currency=EUR&isin={isin}`
2. Legge `data.latestQuote.raw`
3. Chiama `onAggiornaPrezzo(etf.id, prezzo)` → `aggiornaETF(etfId, isin, { prezzoCorrente: prezzo })`

## Soluzione attesa

### Posizione CTA
Pulsante nella sezione header della dashboard, vicino al titolo "ETF" o nella toolbar sopra le card. Testo: "Aggiorna tutti i prezzi" (o icona refresh). Visibile solo se ci sono ETF attivi con ISIN impostato.

### Logica
- Iterare su `etfAttivi` che hanno `etf.isin` non vuoto
- Per ciascuno: fetch `/api/justetf-proxy`, estrarre `latestQuote.raw`, chiamare `aggiornaETF`
- Eseguire in **sequenza** (non parallelo) per evitare rate limiting di JustETF
- Saltare silenziosamente gli ETF senza ISIN

### Rate limiting — tempo minimo tra le chiamate

Per evitare di sovraccaricare il proxy JustETF, rispettare i seguenti intervalli minimi:

- **Tra un ETF e il successivo** (nella CTA "Aggiorna tutti"): attendere almeno **1500 ms** tra una chiamata e la successiva.
- **Singolo ETF** (bottone refresh in `ETFCard`): se l'utente preme più volte, bloccare la chiamata se l'ultimo aggiornamento è avvenuto da meno di **30 secondi**. Mostrare il bottone disabilitato con tooltip "Aggiornato di recente" finché non è trascorso il cooldown.
- **CTA "Aggiorna tutti"**: se l'ultimo aggiornamento globale è avvenuto da meno di **60 secondi**, disabilitare il pulsante con tooltip "Aggiornamento recente, riprova tra N secondi".

Il cooldown del singolo ETF viene rispettato anche all'interno della CTA globale: se un ETF è stato aggiornato singolarmente da meno di 30 secondi, viene saltato (non riaggiornato) durante la corsa globale.

I timestamp degli ultimi aggiornamenti possono essere tenuti in stato locale (`useRef` o `useState`) — non è necessaria la persistenza su Supabase.

### Stato UI durante l'aggiornamento
- Pulsante disabilitato con spinner/testo "Aggiornamento in corso…" durante l'operazione
- Al termine: breve feedback visivo (testo "Prezzi aggiornati" con timestamp, o toast)
- In caso di errore parziale: notificare quanti ETF hanno fallito senza bloccare gli altri

### Gestione errori
- Errore su un singolo ETF non blocca gli altri (continua con il prossimo)
- Al termine riportare gli isin dei fallimenti
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Il pulsante appare solo se esistono ETF attivi con ISIN impostato
- [ ] #2 Cliccando il pulsante, tutti gli ETF attivi con ISIN vengono aggiornati in sequenza tramite il proxy JustETF
- [ ] #3 Durante l'aggiornamento il pulsante è disabilitato e mostra uno stato di caricamento
- [ ] #4 Un errore su un singolo ETF non blocca l'aggiornamento degli ETF successivi
- [ ] #5 Al termine, se ci sono stati errori, viene mostrata la lista degli ISIN non aggiornati; se tutto è andato bene nessun messaggio aggiuntivo
- [ ] #6 Gli ETF archiviati non vengono toccati
- [ ] #7 Tra un ETF e il successivo nella corsa globale viene rispettato un intervallo minimo di 1500 ms
- [ ] #8 La CTA globale è disabilitata per 60 secondi dopo l'ultimo aggiornamento globale, con tooltip che indica i secondi rimanenti
- [ ] #9 Il bottone singolo in ETFCard è disabilitato per 30 secondi dopo l'ultimo aggiornamento, con tooltip 'Aggiornato di recente'
- [ ] #10 Un ETF aggiornato singolarmente da meno di 30 secondi viene saltato durante la corsa globale
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
# Piano implementazione PAC-17

## File coinvolti
- `pac-dashboard/src/components/ETFCard.jsx` — aggiungere cooldown 30 s sul bottone singolo
- `pac-dashboard/src/components/Dashboard.jsx` — CTA globale, logica sequenziale, cooldown 60 s, skip ETF recenti

---

## 1. ETFCard.jsx — cooldown 30 s

Aggiungere un `useRef` per tenere il timestamp dell'ultimo sync riuscito:

```js
const lastSyncAt = useRef(0)
```

In `aggiornaPrezzoAPI`, prima della fetch, controllare il cooldown:

```js
const COOLDOWN_ETF_MS = 30_000
if (Date.now() - lastSyncAt.current < COOLDOWN_ETF_MS) return
```

Dopo il successo (`onAggiornaPrezzo` chiamata), salvare il timestamp:

```js
lastSyncAt.current = Date.now()
```

Per rendere reattivo il bottone (disabled + tooltip), aggiungere `useState cooldownAttivo` (boolean):

```js
const [cooldownAttivo, setCooldownAttivo] = useState(false)
// al successo:
setCooldownAttivo(true)
setTimeout(() => setCooldownAttivo(false), COOLDOWN_ETF_MS)
```

Il bottone riceve `disabled={syncStato === 'loading' || !etf.isin || cooldownAttivo}` e il `title` diventa `"Aggiornato di recente"` quando `cooldownAttivo`.

---

## 2. Dashboard.jsx — stato e ref globali

Nuovi stati/ref da aggiungere nel componente `Dashboard`:

```js
// Stato UI della corsa globale
const [aggStato, setAggStato] = useState('idle') // 'idle' | 'running' | 'done'

// ISIN falliti durante la corsa globale (vuoto = tutto ok)
const [aggErroriIsin, setAggErroriIsin] = useState([])

// Timestamps condivisi: etfId → ms dell'ultimo aggiornamento riuscito (da ETFCard O da corsa globale)
const lastSyncByEtf = useRef({})

// Secondi rimanenti al cooldown globale (per tooltip/UI)
const [globalCooldownSec, setGlobalCooldownSec] = useState(0)
```

---

## 3. Dashboard.jsx — intercettare i sync singoli

Estrarre `handleAggiornaPrezzo` per aggiornare `lastSyncByEtf`:

```js
function handleAggiornaPrezzo(id, prezzo) {
  const etf = port.etf.find(e => e.id === id)
  port.aggiornaETF(id, etf?.isin, { prezzoCorrente: prezzo })
  lastSyncByEtf.current[id] = Date.now()
}
```

Passare `onAggiornaPrezzo={handleAggiornaPrezzo}` a tutte le `ETFCard` (attive e archiviate).

---

## 4. Dashboard.jsx — funzione `aggiornaTuttiIPrezzi`

```js
const DELAY_TRA_ETF_MS = 1_500
const COOLDOWN_ETF_MS  = 30_000
const COOLDOWN_GLOBALE = 60_000

async function aggiornaTuttiIPrezzi() {
  const daAggiornare = etfAttivi.filter(e => e.isin)
  if (!daAggiornare.length) return

  setAggStato('running')
  setAggErroriIsin([])

  const isinFalliti = []

  for (let i = 0; i < daAggiornare.length; i++) {
    const etf = daAggiornare[i]

    // Skip se aggiornato da meno di 30 s
    if (Date.now() - (lastSyncByEtf.current[etf.id] ?? 0) < COOLDOWN_ETF_MS) continue

    try {
      const params = new URLSearchParams({ proxyPath: `api/etfs/${etf.isin}/quote`, locale: 'it', currency: 'EUR', isin: etf.isin })
      const res = await fetch(`/api/justetf-proxy?${params}`)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      const prezzo = data?.latestQuote?.raw
      if (!prezzo || isNaN(prezzo) || prezzo <= 0) throw new Error('prezzo non valido')
      port.aggiornaETF(etf.id, etf.isin, { prezzoCorrente: prezzo })
      lastSyncByEtf.current[etf.id] = Date.now()
    } catch {
      isinFalliti.push(etf.isin)
    }

    if (i < daAggiornare.length - 1) {
      await new Promise(r => setTimeout(r, DELAY_TRA_ETF_MS))
    }
  }

  setAggErroriIsin(isinFalliti)
  setAggStato('done')

  // Countdown cooldown globale
  let sec = Math.ceil(COOLDOWN_GLOBALE / 1000)
  setGlobalCooldownSec(sec)
  const interval = setInterval(() => {
    sec--
    if (sec <= 0) { clearInterval(interval); setGlobalCooldownSec(0); setAggStato('idle') }
    else setGlobalCooldownSec(sec)
  }, 1000)
}
```

---

## 5. Dashboard.jsx — UI pulsante CTA e feedback

Nella sezione header ETF, accanto ai bottoni `+ Acquisto` e `+ ETF`:

```jsx
{etfAttivi.some(e => e.isin) && (
  <button
    onClick={aggiornaTuttiIPrezzi}
    disabled={aggStato !== 'idle'}
    title={aggStato === 'done' ? `Riprova tra ${globalCooldownSec}s` : 'Aggiorna tutti i prezzi da JustETF'}
    className={`text-sm px-4 py-2 rounded-xl transition-colors font-medium flex items-center gap-1.5 ${
      aggStato !== 'idle'
        ? 'bg-slate-700 text-slate-400 cursor-not-allowed'
        : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
    }`}
  >
    <svg className={`w-4 h-4 flex-shrink-0 ${aggStato === 'running' ? 'animate-spin' : ''}`} .../>
    {aggStato === 'running' ? 'Aggiornamento…' : 'Aggiorna prezzi'}
  </button>
)}

{/* Feedback errori dopo la corsa */}
{aggStato === 'done' && aggErroriIsin.length > 0 && (
  <p className="text-xs text-red-400">
    Errore: {aggErroriIsin.join(', ')}
  </p>
)}
```

Il feedback errori scompare automaticamente quando `aggStato` torna `'idle'` (dopo 60 s).

---

## Ordine di implementazione

1. `ETFCard.jsx`: aggiungere `lastSyncAt` ref + `cooldownAttivo` state
2. `Dashboard.jsx`: estrarre `handleAggiornaPrezzo`, aggiungere ref/stato globali
3. `Dashboard.jsx`: implementare `aggiornaTuttiIPrezzi`
4. `Dashboard.jsx`: aggiungere il bottone CTA e il feedback errori nell'header ETF
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementata CTA "Aggiorna tutti i prezzi" con rate limiting completo.

**ETFCard.jsx:**
- Aggiunto cooldown 30s per-card via `lastSyncAt` (useRef) e `cooldownAttivo` (useState)
- Bottone sync singolo disabilitato durante cooldown con tooltip informativo
- `finally` block garantisce aggiornamento di `lastSyncAt` e attivazione cooldown sia su successo che su errore

**Dashboard.jsx:**
- `handleAggiornaPrezzo` wrapper centralizza l'aggiornamento prezzi e tiene traccia dei timestamp in `lastSyncByEtf` (useRef)
- `aggiornaTuttiIPrezzi`: loop sequenziale con 1500ms di delay tra una chiamata e l'altra, skip intelligente degli ETF aggiornati negli ultimi 30s
- Cooldown globale 60s post-corsa con countdown visibile nel bottone
- Display ISIN falliti sotto l'header sezione ETF (solo se presenti errori)
- Bottone "Aggiorna tutti" con spinner durante l'esecuzione
<!-- SECTION:FINAL_SUMMARY:END -->
