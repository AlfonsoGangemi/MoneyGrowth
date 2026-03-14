---
id: PAC-60
title: 'Analisi + fix: comportamento import JSON con id mancanti o nulli'
status: Done
assignee: []
created_date: '2026-03-14 15:37'
updated_date: '2026-03-14 16:14'
labels:
  - bug
  - import
  - data-integrity
dependencies:
  - PAC-55
references:
  - pac-dashboard/src/hooks/usePortafoglio.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Analizzare cosa succede durante `importJSON` quando i campi `id` sono assenti nel file JSON, e correggere i comportamenti problematici.

## Analisi comportamento attuale (usePortafoglio.js:502–585)

L'import usa gli `id` direttamente dal JSON senza fallback:
```js
id: etf.id       // riga 523
id: a.id         // riga 540
etf_id: etf.id   // riga 541  ← dipende da etf.id
id: s.id         // riga 559
```

### Caso 1 — `etf.id` mancante
- `id: undefined` → Supabase omette il campo, auto-genera UUID per l'ETF (se colonna ha DEFAULT)
- Ma `etf_id: etf.id` negli acquisti è ancora `undefined` → Supabase riceve `etf_id: null` o campo assente
- **Risultato: FK violation** — gli acquisti non vengono inseriti. Gli ETF finiscono nel DB **senza acquisti**, silenziosamente (l'errore sugli acquisti arriva dopo il successo degli ETF)

### Caso 2 — `a.id` (acquisto) mancante
- Supabase auto-genera UUID se la colonna ha DEFAULT
- `etf_id: etf.id` è corretto SE etf.id era presente → non è un problema da solo
- Se anche etf.id mancava → vedi Caso 1

### Caso 3 — `s.id` (scenario) mancante
- Supabase auto-genera UUID → **nessun problema funzionale** (scenari non hanno FK verso altri oggetti)

### Caso 4 — broker: NON importato
- Il codice non cancella né reinserisce i broker durante l'import
- Gli acquisti contengono `broker_id: a.brokerId` che referenziano broker già esistenti nell'account
- Se il file viene importato su **un account diverso** (o dopo aver eliminato i broker), i `broker_id` non esistono → **FK violation su acquisti.insert**, oppure i broker_id vengono salvati come orfani
- Problema indipendente dagli id mancanti

### Caso 5 — prezziStorici e storicoAnnuale
- Non importati né persistiti su Supabase
- `setStato({ ...defaultState, ...data })` li ripristina in memoria (solo sessione corrente), ma al prossimo refresh vengono ricaricati dal DB → sono vuoti

---

## Comportamento atteso vs attuale

| Oggetto | id mancante | Comportamento attuale | Comportamento atteso |
|---|---|---|---|
| ETF | sì | ETF inserito, acquisti persi per FK violation | ETF inserito, acquisti usano il nuovo UUID |
| Acquisto | sì | Inserito con UUID generato (se etf_id ok) | Stesso — OK |
| Scenario | sì | Inserito con UUID generato | Stesso — OK |
| Broker | n/a | Non importato, broker_id può diventare orfano | Da valutare |

---

## Fix necessario per Caso 1

Disaccoppiare `etf_id` dagli id del JSON originale usando una Map:
```js
const idMap = new Map() // id-dal-json → id-effettivo-usato-in-db
const etfRows = data.etf.map(etf => {
  const dbId = etf.id || crypto.randomUUID()
  idMap.set(etf.id, dbId)
  return { id: dbId, ... }
})
// Negli acquisti:
etf_id: idMap.get(etf.id)
```
Stessa logica con `crypto.randomUUID()` come fallback per acquisti e scenari.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Import con id ETF mancanti non perde gli acquisti associati (usa idMap per mantenere la relazione)
- [x] #2 Import con id acquisto mancanti inserisce correttamente con UUID generato
- [x] #3 Import con id scenario mancanti funziona correttamente
- [x] #4 Import su account diverso con broker_id orfani non produce FK violation silenziosa — errore chiaro o broker_id impostato a null
- [x] #5 L'export NON include prezziStorici nel file JSON (dati condivisi tra utenti)
- [x] #6 L'export NON include storicoAnnuale nel file JSON (dato derivato, ricalcolato al caricamento)
- [x] #7 L'export NON include scenari nel file JSON
- [x] #8 L'import NON cancella né reinserisce gli scenari esistenti dell'utente
- [x] #9 Dopo un import su account senza scenari, al reload vengono creati automaticamente i SCENARI_DEFAULT
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Analisi comportamento attuale (usePortafoglio.js:502–585)

L'import usa gli `id` direttamente dal JSON senza fallback:
```js
id: etf.id       // riga 523
id: a.id         // riga 540
etf_id: etf.id   // riga 541  ← dipende da etf.id
id: s.id         // riga 559
```

---

### Caso 1 — `etf.id` mancante
- `id: undefined` → Supabase omette il campo, auto-genera UUID per l'ETF (se colonna ha DEFAULT)
- Ma `etf_id: etf.id` negli acquisti è ancora `undefined` → Supabase riceve `etf_id: null`
- **Risultato: FK violation** — gli acquisti non vengono inseriti. Gli ETF finiscono nel DB **senza acquisti**, silenziosamente

### Caso 2 — `a.id` (acquisto) mancante
- Supabase auto-genera UUID → non è un problema da solo. Se anche etf.id mancava → vedi Caso 1

### Caso 3 — `s.id` (scenario) mancante
- Supabase auto-genera UUID → **nessun problema funzionale**

### Caso 4 — broker: NON importato
- Gli acquisti contengono `broker_id` che referenziano broker già esistenti nell'account
- Se il file viene importato su **un account diverso** (o dopo aver eliminato i broker) → FK violation o orfani silenziosamente

### Caso 5 — prezziStorici e storicoAnnuale: NON devono essere esportati né importati

`etf_prezzi_storici` è una **tabella condivisa** tra tutti gli utenti (nessun `user_id`):
```sql
-- schema: (isin, anno, mese, prezzo)
SELECT * FROM etf_prezzi_storici WHERE isin IN (...)
```
I prezzi sono globali per ISIN. Di conseguenza:

- **Export** (`exportJSON` riga 492): esporta `JSON.stringify(stato, null, 2)` → include `prezziStorici` e `storicoAnnuale` nel file — dati condivisi che non appartengono all'utente, gonfiano inutilmente il file
- **Import**: già **non** importa `prezziStorici` nel DB → comportamento già corretto. Al prossimo caricamento vengono riletti dalla tabella condivisa per gli ISIN degli ETF importati
- `storicoAnnuale` è derivato da ETF + prezziStorici → non deve essere esportato né importato (viene ricalcolato nel backfill al caricamento)

**Fix export** (riga 492):
```js
const { prezziStorici, storicoAnnuale, ...daEsportare } = stato
const blob = new Blob([JSON.stringify(daEsportare, null, 2)], ...)
```

---

## Fix Caso 1 — idMap

```js
const idMap = new Map() // id-dal-json → id-effettivo-usato-in-db
const etfRows = data.etf.map(etf => {
  const dbId = etf.id || crypto.randomUUID()
  idMap.set(etf.id, dbId)
  return { id: dbId, ... }
})
// Negli acquisti:
etf_id: idMap.get(etf.id)
```

## Strategia Broker (analisi)

**Struttura broker in DB**: tabella `broker` con `(id, user_id, nome, colore, archiviato)`. Il `nome` è univoco per utente per convenzione (nessun constraint DB esplicito, ma il flusso UI non permette duplicati).

**Problema**: durante l'import, gli acquisti hanno `brokerId` (UUID), ma gli UUID del JSON non corrispondono agli UUID del DB del nuovo utente/istanza.

**Soluzione — mapping per nome**:
1. Il JSON di export deve includere `brokerNome` in ogni acquisto (o come mappa `brokerId → nome` separata)
2. Durante import:
   a. Inserire tutti i broker dal JSON (con `upsert` su `nome` per evitare duplicati)
   b. Costruire `Map<nomeBroker, nuovoId>` dai risultati degli insert
   c. Per ogni acquisto, risolvere `broker_id = nomeMap.get(acquisto.brokerNome)`
3. Se `brokerNome` mancante nel JSON (backup vecchio formato): fallback su broker "Default"

**Export**: aggiungere `brokerNome` a ciascun acquisto nel JSON serializzato (lookup da `stato.broker` durante export). Non serve esportare la lista separata dei broker se il nome è già embedded negli acquisti.

**Nota**: `prezziStorici` (da `etf_prezzi_storici`) è tabella condivisa senza `user_id` — NON deve essere inclusa nell'export/import personale. Fix: `const { prezziStorici, storicoAnnuale, ...daEsportare } = stato` prima di `JSON.stringify`.

## Strategia ETF — mapping per ISIN

**Struttura ETF in DB**: tabella `etf` con `(id, user_id, isin, nome, ...)`. L'ISIN è univoco per utente per convenzione (un utente non può avere due ETF con lo stesso ISIN).

**Problema**: durante l'import, gli acquisti hanno `etf_id` (UUID), ma gli UUID del JSON non corrispondono agli UUID del DB — specialmente se il file è importato su un account diverso o dopo una migrazione.

**Soluzione — mapping per ISIN** (preferibile a idMap con UUID):
1. Il JSON di export deve includere `isin` in ogni acquisto (già presente nel JSON del stato come campo degli ETF, ma va embedded negli acquisti)
2. Durante import:
   a. Inserire tutti gli ETF dal JSON (con `upsert` su `(user_id, isin)` per evitare duplicati)
   b. Costruire `Map<isin, nuovoId>` dai risultati degli insert
   c. Per ogni acquisto, risolvere `etf_id = isinMap.get(acquisto.isin)`
3. Se `isin` mancante nel JSON (backup vecchio formato): fallback sull'idMap con `crypto.randomUUID()`

**Export**: aggiungere `isin` a ciascun acquisto nel JSON serializzato (lookup da `etf.isin` durante l'export, poiché gli acquisti sono annidati dentro l'ETF). Struttura già favorevole: il JSON ha `{ etf: [{ isin, acquisti: [...] }] }` quindi l'ISIN è sempre accessibile dal nodo padre.

**Vantaggio rispetto a idMap UUID**: l'ISIN è un identificatore stabile e leggibile dall'utente — funziona anche se il file JSON viene modificato manualmente o generato da un altro sistema.

**Flusso import completo**:
```js
// 1. Insert ETF → Map<isin, dbId>
const isinMap = new Map()
for (const etf of data.etf) {
  const { data: row } = await supabase
    .from('etf')
    .upsert({ user_id, isin: etf.isin, ... }, { onConflict: 'user_id,isin' })
    .select().single()
  isinMap.set(etf.isin, row.id)
}
// 2. Insert acquisti con etf_id risolto
for (const etf of data.etf) {
  const etfId = isinMap.get(etf.isin)
  const rows = etf.acquisti.map(a => ({ ...a, etf_id: etfId, user_id }))
  await supabase.from('acquisti').insert(rows)
}
```

## Strategia config nell'export

**Campi config nel DB**: `orizzonte_anni`, `broker_filtro`, `mostra_proiezione`.

**`broker_filtro`**: è uno stato UI temporaneo (quali broker sono attivi nel filtro grafico). Non fa parte del backup dei dati finanziari dell'utente — NON deve essere esportato né importato.
- Export: escludere `brokerFiltro` dal JSON
- Import: non reimpostare `broker_filtro` su DB (l'utente lo reimposta manualmente)

**`mostra_proiezione`**: campo obsoleto — presente in DB e in `defaultState` ma non più usato dalla UI (vedi task PAC-61 per la rimozione). Per ora: non includere nell'export e non scrivere su DB durante import.

**Fix export config** (in combinazione con prezziStorici/storicoAnnuale):
```js
const { prezziStorici, storicoAnnuale, brokerFiltro, mostraProiezione, ...daEsportare } = stato
const blob = new Blob([JSON.stringify(daEsportare, null, 2)], ...)
```

**Fix import config** (riga 570-574): rimuovere `mostra_proiezione` dall'upsert su config.

## Strategia Scenari — esclusi da export/import

**Struttura**: tabella `scenari` con `(id, user_id, nome, rendimento_annuo, colore)`. Al primo accesso vengono inseriti automaticamente i 3 `SCENARI_DEFAULT` (Pessimistico 4%, Moderato 7%, Ottimistico 10%) se `scenari.length === 0`.

**Decisione**: gli scenari NON devono essere esportati né importati. Sono configurazione UI dell'utente, non dati finanziari storici.

**Comportamento attuale nell'import**:
1. Cancella tutti gli scenari esistenti (riga 513: `DELETE FROM scenari WHERE user_id`)
2. Se `data.scenari` ha elementi, li reinserisce (riga 556–566)

**Comportamento atteso dopo il fix**:
- Export: `scenari` esclusi dal JSON
- Import: scenari esistenti **preservati** (né cancellati né reinseriti)
- Se l'utente non ha ancora scenari (account nuovo): al prossimo caricamento vengono inseriti i `SCENARI_DEFAULT` automaticamente dal codice già esistente (riga 147)—nessuna modifica al caricamento necessaria

**Fix**:
1. Export — aggiungere `scenari` alla destructuring di esclusione:
```js
const { prezziStorici, storicoAnnuale, brokerFiltro, mostraProiezione, scenari, ...daEsportare } = stato
```
2. Import — rimuovere il blocco `DELETE FROM scenari` (riga 513) e il blocco insert scenari (riga 556–566)

**Vantaggio**: l'utente mantiene i propri scenari personalizzati dopo un import (non vengono sovrascritti dai dati del file).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Implementazione completata

### Export (`exportJSON`)
- Esclusi dal JSON: `prezziStorici`, `storicoAnnuale`, `brokerFiltro`, `mostraProiezione`, `scenari`
- Aggiunto `brokerNome` in ogni acquisto (lookup da `stato.broker` per UUID → nome)

### Import (`importJSON`)
**Broker**:
- Carica broker esistenti dal DB (`id, nome`)
- Inserisce broker mancanti dal JSON (per nome, senza duplicati)
- Costruisce `Map<nome, dbId>` → `brokerNomi`
- Backward compat: `oldBrokerIdToNome` risolve file JSON senza `brokerNome` usando `data.broker`

**ETF**:
- Insert uno alla volta con `.select('id, isin')` → costruisce `Map<isin, dbId>` → `isinMap`
- `etf_id` negli acquisti risolto da `isinMap.get(etf.isin)` (non più dall'UUID del JSON)

**Acquisti**:
- `broker_id` risolto: `a.brokerNome` (nuovo) → `oldBrokerIdToNome.get(a.brokerId)` (vecchio) → `null`
- `etf_id` sempre corretto grazie a `isinMap`

**Scenari**: rimosso `DELETE FROM scenari` e blocco insert — preservati invariati nel DB e in memoria

**Config**: rimosso `mostra_proiezione` dall'upsert (campo obsoleto, rimosso in PAC-61)

**Stato post-import**:
- `broker`: ricaricato fresco dal DB (UUID corretti)
- `scenari`: preservati dallo stato corrente (non sovrascritti)
- `brokerFiltro`: preservato (stato UI)
<!-- SECTION:FINAL_SUMMARY:END -->
