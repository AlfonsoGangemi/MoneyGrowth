---
id: PAC-6
title: 'Grafico: serie storica prezzi ETF da etf_prezzi_storici'
status: Done
assignee: []
created_date: '2026-03-10 16:08'
updated_date: '2026-03-12 10:39'
labels:
  - feature
  - frontend
  - grafico
dependencies:
  - PAC-3
references:
  - spec/function.md
  - src/components/GraficoPortafoglio.jsx
  - src/utils/calcoli.js
  - src/hooks/usePortafoglio.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Arricchire il grafico del portafoglio con una serie storica dei prezzi mensili, calcolata a partire dai dati della tabella `etf_prezzi_storici` (implementata in PAC-3).

### Obiettivo

Per ogni mese in cui è disponibile un prezzo storico, calcolare il **valore del portafoglio** moltiplicando le quote accumulate fino a quella data per il prezzo del mese corrispondente. Questo produce una curva storica "reale" più continua rispetto all'attuale, che si basa solo sui punti di acquisto.

### Logica di recupero del prezzo

Per ogni punto mensile `(anno, mese)` da rappresentare nel grafico:

1. Cerca il prezzo esatto in `etf_prezzi_storici` per `(isin, anno, mese)`
2. Se non esiste → usa il **primo valore precedente disponibile** (il record più recente con data `< (anno, mese)`)
3. Se non esiste nessun valore precedente → il punto viene omesso dal grafico

### Logica di calcolo del valore

```
quote_accumulate(etf, mese) = somma delle quote_frazionate degli acquisti con data ≤ ultimo giorno del mese
prezzo(etf, mese)           = prezzo_storico(isin, anno, mese) ?? ultimo_prezzo_precedente(isin, anno, mese)
valore_etf(mese)            = quote_accumulate(etf, mese) × prezzo(etf, mese)
valore_portafoglio(mese)    = Σ valore_etf(mese) per tutti gli ETF attivi
```

### Integrazione nel grafico

- Sostituisce (o affianca) la serie storica attuale in `GraficoPortafoglio.jsx`
- La serie storica prezzi e quella degli acquisti devono risultare visivamente coerenti sullo stesso asse Y

### Dipendenza

Richiede che la tabella `etf_prezzi_storici` sia popolata (PAC-3). Senza dati storici il grafico torna al comportamento attuale.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Il grafico mostra una serie storica calcolata sui prezzi mensili di etf_prezzi_storici
- [x] #2 Se per un mese non esiste un prezzo esatto, viene usato il carry-forward dell'ultimo prezzo storico disponibile
- [x] #3 Se non esiste alcun prezzo storico per l'ETF in quel mese, viene usato il prezzoUnitario dell'acquisto più recente con data ≤ fine mese
- [x] #4 Un ETF contribuisce 0 solo se non ha ancora acquisti in quel mese (non ancora presente nel portafoglio)
- [x] #5 Se non ci sono dati storici disponibili per nessun ETF, il grafico mostra il comportamento attuale senza errori
- [x] #6 Gli ETF archiviati sono esclusi dal calcolo
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Piano implementativo

### Step 1 — `usePortafoglio.js`: caricamento `etf_prezzi_storici`

1. Dopo il fetch degli ETF (il caricamento dipende dagli ISIN), aggiungere una query Supabase:
   ```js
   supabase.from('etf_prezzi_storici').select('*').in('isin', isins)
   ```
   dove `isins` è la lista degli ISIN degli ETF dell'utente.
   > Nota: va fatto in un `await` separato dopo `etfData`, non nel `Promise.all` iniziale.

2. Aggiungere `prezziStorici: []` allo stato iniziale.

3. Popolare `stato.prezziStorici` con i record restituiti (array di `{ isin, anno, mese, prezzo }`).

4. Nessuna modifica alle funzioni di scrittura: `salvaPrezzoStorico` è già presente.

---

### Step 2 — `calcoli.js`: nuova funzione `serieStoricaDaPrezziStorici`

**Firma:**
```js
export function serieStoricaDaPrezziStorici(etfList, prezziStorici)
```

**Logica:**
1. Costruire una mappa `prezziMap[isin][yyyy-MM]` → prezzo, a partire da `prezziStorici`.
2. Determinare il range temporale: dal primo acquisto (fra tutti gli ETF) al mese corrente.
3. Iterare mese per mese sulla timeline. Per ogni ETF in ogni mese:
   - Calcolare `quoteAccumulate` considerando solo gli acquisti con `data <= fine mese`.
   - Se `quoteAccumulate === 0` → contributo 0 (ETF non ancora presente nel portafoglio).
   - Altrimenti, determinare il prezzo con questa catena di fallback a 3 livelli:
     1. Prezzo esatto: `prezziMap[isin][yyyy-MM]`
     2. Carry-forward: ultimo `prezziMap[isin][chiave]` con chiave ≤ `yyyy-MM`
     3. `prezzoUnitario` dell'acquisto più recente con `data <= fine mese` (stesso meccanismo di `serieStoricaAggregata`)
   - `valoreEtf = quoteAccumulate × prezzo`
   - `valoreGiorno = Σ valoreEtf` per tutti gli ETF
4. Aggiungere punto "oggi" con `prezzoCorrente` di ciascun ETF.
5. Restituire array `[{ data: 'yyyy-MM-dd', valore }]`.
   - I punti mensili usano il primo giorno del mese; "oggi" usa la data reale.

**Edge case — nessun prezzo storico disponibile:**
Se `prezziStorici` è vuoto, la mappa è vuota e il fallback ricade sempre sul `prezzoUnitario` degli acquisti → la funzione produce la stessa serie di `serieStoricaAggregata`, con cadenza mensile invece che per data acquisto. Il componente può usare comunque questa funzione senza comportamenti anomali.

---

### Step 3 — `GraficoPortafoglio.jsx`: uso della nuova funzione

1. Aggiungere `prezziStorici` come prop (default `[]`).
2. Nel `useMemo` per `datiGrafico`:
   - Vista aggregata: usa sempre `serieStoricaDaPrezziStorici(etfDaUsare, prezziStorici)` (se `prezziStorici` è vuoto il fallback interno garantisce comunque un risultato corretto).
   - Vista singolo ETF: invariata (`serieStorica`).
3. Aggiornare import in cima al file.

---

### Step 4 — `Dashboard.jsx`: passare `prezziStorici` come prop

Aggiungere `prezziStorici={port.prezziStorici}` dove viene usato `GraficoPortafoglio`.

---

### File da modificare

| File | Modifica |
|---|---|
| `src/hooks/usePortafoglio.js` | Caricamento `etf_prezzi_storici`, stato `prezziStorici` |
| `src/utils/calcoli.js` | Nuova funzione `serieStoricaDaPrezziStorici` |
| `src/components/GraficoPortafoglio.jsx` | Prop `prezziStorici`, uso nuova funzione nella vista aggregata |
| `src/components/Dashboard.jsx` | Passaggio prop `prezziStorici` |
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Nota di design: nessun auto-popolamento da acquisti

**Idea valutata:** al momento dell'inserimento di un acquisto, salvare automaticamente il `prezzoUnitario` in `etf_prezzi_storici` (solo se non presente) per garantire copertura storica.

**Problema identificato:** se l'utente successivamente modifica il `prezzoUnitario` dell'acquisto, il prezzo storico salvato diventa inconsistente e non c'è modo affidabile di sanare l'anomalia. Un "aggiorna se uguale al vecchio valore" non è robusto perché potrebbe sovrascrivere un prezzo manuale più accurato.

**Decisione:** le due sorgenti restano indipendenti:
- `acquisti.prezzoUnitario` = prezzo pagato, dato contabile immutabile
- `etf_prezzi_storici` = serie prezzi di mercato, gestita esplicitamente dall'utente tramite PAC-3

Il fallback a 3 livelli in `serieStoricaDaPrezziStorici` usa `prezzoUnitario` come proxy *in lettura* per i mesi senza prezzo storico, senza mai scrivere nulla — questo è il punto di integrazione corretto tra le due sorgenti.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Implementazione

### `usePortafoglio.js`
- Aggiunto `prezziStorici: []` a `defaultState`
- Dopo il fetch degli ETF, query `etf_prezzi_storici` filtrata per ISIN degli ETF dell'utente
- `prezziStorici` esposto nello stato

### `calcoli.js`
- Nuova funzione `serieStoricaDaPrezziStorici(etfList, prezziStorici)`:
  - Timeline mensile dal primo acquisto al mese precedente quello corrente
  - Fallback a 3 livelli per il prezzo: (1) esatto da `etf_prezzi_storici`, (2) carry-forward, (3) `prezzoUnitario` acquisto più recente
  - ETF senza acquisti in un dato mese → contributo 0
  - Punto finale "oggi" con `prezzoCorrente`

### `GraficoPortafoglio.jsx`
- Import aggiornato: `serieStoricaAggregata` sostituita con `serieStoricaDaPrezziStorici`
- Prop `prezziStorici = []` aggiunta; props non più utilizzate (`scenari`, `orizzonteAnni`, `mostraProiezione`) rimosse
- Vista aggregata usa la nuova funzione; vista singolo ETF invariata

### `Dashboard.jsx`
- `GraficoPortafoglio` riceve `prezziStorici={port.prezziStorici}`; props non più necessarie rimosse
<!-- SECTION:FINAL_SUMMARY:END -->
