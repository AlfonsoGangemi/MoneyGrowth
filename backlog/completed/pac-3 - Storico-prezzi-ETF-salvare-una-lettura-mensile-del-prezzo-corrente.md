---
id: PAC-3
title: 'Storico prezzi ETF: salvare una lettura mensile del prezzo corrente'
status: Done
assignee:
  - '@Claude'
created_date: '2026-03-10 15:09'
updated_date: '2026-03-11 23:08'
labels:
  - feature
  - database
  - backend
dependencies:
  - PAC-8
references:
  - spec/model.md
  - spec/function.md
  - src/hooks/usePortafoglio.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Persistere la lettura del prezzo corrente di ogni ETF con granularità mensile (massimo 1 record per ISIN per mese), in una tabella **condivisa tra tutti gli utenti**.

### Razionale

Il prezzo di un ETF è un dato oggettivo e pubblico: se un utente aggiorna il prezzo tramite l'API JustETF, il valore è valido per tutti. Non ha senso duplicare lo stesso dato per ogni utente.

Il prezzo salvato **non è il prezzo "visibile" nella card ETF** (che viene sempre letto in tempo reale dall'API JustETF); serve esclusivamente a ricostruire lo storico del valore del portafoglio nel tempo per i calcoli (es. grafico storico reale).

### Logica di salvataggio

- Ogni volta che il prezzo di un ETF viene aggiornato (manualmente o automaticamente), verificare se esiste già un record per `(isin, anno, mese)`
- Se non esiste → inserire
- Se esiste già → sovrascrivere con il valore più recente (upsert)
- Nessun `user_id` nella tabella: i dati sono condivisi

### Schema DB suggerito

```sql
create table etf_prezzi_storici (
  id         uuid primary key default gen_random_uuid(),
  isin       text not null,
  anno       integer not null,
  mese       integer not null,  -- 1–12
  prezzo     numeric not null,
  updated_at timestamptz default now(),
  unique (isin, anno, mese)
);
```

### Accesso

- Lettura: tutti gli utenti autenticati possono leggere tutti i record (RLS in sola lettura per `authenticated`)
- Scrittura: tutti gli utenti autenticati possono fare upsert (il dato è pubblico)

### Utilizzi futuri

Lo storico mensile potrà arricchire il grafico con l'andamento reale del prezzo nel tempo, indipendentemente dagli acquisti registrati.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Ad ogni aggiornamento del prezzo viene eseguito un upsert su `etf_prezzi_storici` con chiave `(isin, anno, mese)`
- [x] #2 Non vengono mai creati più di un record per ISIN per mese, indipendentemente dall'utente che ha effettuato l'aggiornamento
- [x] #3 La tabella non contiene `user_id`: i dati sono condivisi tra tutti gli utenti
- [x] #4 RLS configurata: tutti gli utenti autenticati possono leggere e fare upsert; accesso negato agli anonimi
- [x] #5 Il prezzo salvato in storico non influenza il prezzo visualizzato nella card ETF (sempre da API live)
- [x] #6 In caso di errore nel salvataggio dello storico, l'aggiornamento del prezzo corrente non viene bloccato
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Piano implementativo

### Approccio
Aggiungere un helper `salvaPrezzoStorico` in `usePortafoglio.js` e integrarlo in `aggiornaETF`. Estendere la firma di `aggiornaETF` con il parametro `isin` come **secondo argomento** (prima di `campi`) per chiarezza. Aggiornare i caller in `Dashboard.jsx`.

### File coinvolti
- `pac-dashboard/src/hooks/usePortafoglio.js` — aggiunta helper + modifica `aggiornaETF`
- `pac-dashboard/src/components/Dashboard.jsx` — aggiornare le chiamate a `aggiornaETF` per passare l'ISIN

---

### Step 1 — `usePortafoglio.js`: aggiungere `salvaPrezzoStorico`

Aggiungere prima di `aggiornaETF` (attorno a riga 194):

```js
const salvaPrezzoStorico = useCallback(async (isin, prezzo) => {
  if (!isin || !prezzo) return
  const oggi = new Date()
  const { error } = await supabase
    .from('etf_prezzi_storici')
    .upsert({ isin, anno: oggi.getFullYear(), mese: oggi.getMonth() + 1, prezzo: Number(prezzo) })
  if (error) console.error('Errore salvataggio storico prezzi:', error)
  // Errore non bloccante (AC#6)
}, [])
```

---

### Step 2 — `usePortafoglio.js`: modificare `aggiornaETF`

- Aggiungere parametro `isin` come **secondo argomento** (firma: `aggiornaETF(etfId, isin, campi)`)
- Dopo l'update su `etf` riuscito, se `prezzoCorrente` è nei campi → chiamare `salvaPrezzoStorico`
- Aggiornare deps: `[user, salvaPrezzoStorico]`

```js
const aggiornaETF = useCallback(async (etfId, isin, campi) => {
  const dbCampi = {}
  if ('nome' in campi)           dbCampi.nome            = campi.nome
  if ('emittente' in campi)      dbCampi.emittente       = campi.emittente
  if ('importoFisso' in campi)   dbCampi.importo_fisso   = campi.importoFisso
  if ('prezzoCorrente' in campi) dbCampi.prezzo_corrente = campi.prezzoCorrente

  const { error } = await supabase
    .from('etf')
    .update(dbCampi)
    .eq('id', etfId)

  if (error) { setErrore('Errore nell\'aggiornamento dell\'ETF.'); return }

  if ('prezzoCorrente' in campi) {
    await salvaPrezzoStorico(isin, campi.prezzoCorrente)
  }

  setStato(s => ({ ...s, etf: s.etf.map(e => e.id === etfId ? { ...e, ...campi } : e) }))
}, [user, salvaPrezzoStorico])
```

---

### Step 3 — `Dashboard.jsx`: aggiornare i caller

Ogni punto dove viene chiamato `aggiornaETF` deve passare l'ISIN come secondo argomento:

```js
// onAggiornaPrezzo (aggiornamento prezzo da JustETF)
onAggiornaPrezzo={(id, p) => {
  const etf = port.etf.find(e => e.id === id)
  port.aggiornaETF(id, etf?.isin, { prezzoCorrente: p })
}}
```

Per il modal di modifica ETF (callback `onSalva`):
```js
onSalva={(id, campi) => {
  const etf = port.etf.find(e => e.id === id)
  port.aggiornaETF(id, etf?.isin, campi)
}}
```

---

### Flusso risultante

```
ETFCard → onAggiornaPrezzo(id, prezzo)
  ↓
Dashboard: port.aggiornaETF(id, isin, { prezzoCorrente: p })
  ↓
aggiornaETF:
  ├─ UPDATE etf (prezzo_corrente)  ← bloccante, se fallisce → return
  ├─ salvaPrezzoStorico(isin, p)   ← async, errore solo in console
  └─ setStato (aggiorna UI)
```

---

### Casi limite
| Caso | Comportamento |
|---|---|
| `isin` non trovato in `port.etf` | `salvaPrezzoStorico` riceve `undefined`, fa return early |
| Upsert fallisce (RLS, rete) | Errore loggato, prezzo corrente aggiornato comunque (AC#6) |
| Stesso ISIN aggiornato 2 volte nel mese | UNIQUE constraint → upsert sovrascrive, un solo record (AC#2) |
| Campi aggiornati senza `prezzoCorrente` | `salvaPrezzoStorico` non viene chiamato |
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementato il salvataggio mensile del prezzo corrente di ogni ETF su `etf_prezzi_storici`.

**Modifiche**:

`usePortafoglio.js`:
- Aggiunta funzione `salvaPrezzoStorico(isin, prezzo)`: upsert su `etf_prezzi_storici` con chiave `(isin, anno, mese)`. Errore loggato in console, non bloccante.
- Modificata firma `aggiornaETF(etfId, isin, campi)`: `isin` è ora il secondo parametro. Se `prezzoCorrente` è tra i campi aggiornati, chiama `salvaPrezzoStorico` dopo il successo dell'update su `etf`.

`Dashboard.jsx`:
- Aggiornati tutti e 3 i call site di `aggiornaETF` per passare `etf?.isin` come secondo argomento (ETF attivi, ETF archiviati, modal modifica ETF).
<!-- SECTION:FINAL_SUMMARY:END -->
