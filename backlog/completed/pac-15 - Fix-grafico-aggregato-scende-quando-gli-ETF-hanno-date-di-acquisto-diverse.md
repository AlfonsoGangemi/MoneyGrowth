---
id: PAC-15
title: 'Fix: grafico aggregato scende quando gli ETF hanno date di acquisto diverse'
status: Done
assignee:
  - Claude
created_date: '2026-03-11 19:29'
updated_date: '2026-03-11 19:53'
labels:
  - bug
  - grafico
dependencies: []
references:
  - pac-dashboard/src/components/GraficoPortafoglio.jsx
  - pac-dashboard/src/utils/calcoli.js
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problema

Il grafico storico aggregato mostra **cali di valore** in corrispondenza di date in cui solo alcuni ETF hanno un acquisto. Il portafoglio non dovrebbe mai scendere (in assenza di vendite), ma visivamente lo fa.

## Causa radice

La funzione `serieStorica` (calcoli.js:159) produce un punto `{ data, valore }` **solo nelle date in cui quell'ETF ha un acquisto**. Il componente `GraficoPortafoglio` aggrega i punti di tutti gli ETF sommando per data in una `Map`:

```js
for (const etf of etfDaUsare) {
  const serie = serieStorica(etf.acquisti, etf.prezzoCorrente)
  for (const punto of serie) {
    mapStorico.set(punto.data, (mapStorico.get(punto.data) ?? 0) + punto.valore)
  }
}
```

Quando due ETF hanno date di acquisto **diverse**, ogni punto nella mappa contiene solo il contributo degli ETF che hanno un acquisto in quella data esatta. Gli altri ETF vengono ignorati invece di essere portati avanti con il loro ultimo valore noto.

### Esempio

| Data | ETF A | ETF B | Aggregato (attuale) | Aggregato (corretto) |
|---|---|---|---|---|
| 01/01 | 200 € | 150 € | **350 €** | 350 € |
| 15/01 | 420 € | — | **420 €** ← calo! | 420 € + ultimo valore ETF B |
| 01/02 | — | 310 € | **310 €** ← calo! | ultimo valore ETF A + 310 € |
| oggi | 450 € | 320 € | **770 €** | 770 € |

Il valore al `15/01` dovrebbe essere `420 € (ETF A) + valore aggiornato di ETF B a quella data`, non solo `420 €`.

## Soluzione attesa

Costruire una **timeline unificata** con tutte le date di acquisto di tutti gli ETF. Per ogni data della timeline, calcolare il valore di **ciascun ETF** usando l'ultimo prezzo disponibile in quel momento (carry-forward), poi sommare i contributi.

In `serieStorica` o in un nuovo helper, per ogni punto della timeline ogni ETF deve contribuire con:

```
quoteAccumulate_ETF × prezzoUnitario_dell'ultimo_acquisto_fino_a_quella_data
```

e per l'ultimo punto (oggi) con `prezzoCorrente`.

## File coinvolti

- `pac-dashboard/src/utils/calcoli.js` — funzione `serieStorica`
- `pac-dashboard/src/components/GraficoPortafoglio.jsx` — logica di aggregazione nel `useMemo`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Il grafico aggregato non mostra mai un calo in corrispondenza di date in cui solo un sottoinsieme di ETF ha un acquisto
- [ ] #2 Per ogni data della timeline, tutti gli ETF contribuiscono al valore aggregato con il loro ultimo prezzo noto (carry-forward)
- [ ] #3 Il grafico per singolo ETF continua a funzionare correttamente
- [ ] #4 Il punto finale (oggi) usa sempre prezzoCorrente per tutti gli ETF
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Piano implementativo

### Approccio
Aggiungere una nuova funzione `serieStoricaAggregata` in `calcoli.js` dedicata alla vista aggregata multi-ETF. La funzione `serieStorica` esistente rimane invariata (usata per la vista singolo ETF).

### File coinvolti
- `pac-dashboard/src/utils/calcoli.js` — aggiunta helper `serieStoricaAggregata`
- `pac-dashboard/src/components/GraficoPortafoglio.jsx` — refactor `useMemo` per usare il nuovo helper nella vista aggregata

---

### Step 1 — `calcoli.js`: aggiungere `serieStoricaAggregata(etfList)`

Posizione: dopo `serieStorica` (riga 184).

**Algoritmo in 3 fasi:**

**Fase 1 — Timeline unificata**
- Raccogliere tutte le date di acquisto di tutti gli ETF in un `Set` (deduplicazione automatica)
- Convertire in array ordinato cronologicamente

**Fase 2 — Valore aggregato per ogni data**
Per ogni data della timeline:
- Per ogni ETF:
  - Sommare le `quoteFrazionate` degli acquisti con `data <= dataCorrente` → `quoteAccumulate`
  - Trovare il `prezzoUnitario` dell'ultimo acquisto con `data <= dataCorrente` → carry-forward
  - Contributo ETF = `quoteAccumulate × ultimoPrezzoUnitario`
- Sommare i contributi di tutti gli ETF → valore del punto

**Fase 3 — Punto "oggi"**
- Se oggi non è già in timeline: aggiungere punto con `Σ (quoteAccumulate_etf × etf.prezzoCorrente)`

**Firma:**
```js
export function serieStoricaAggregata(etfList)
// restituisce: [{ data: 'yyyy-MM-dd', valore: number }, ...]
```

---

### Step 2 — `GraficoPortafoglio.jsx`: refactor `useMemo`

Sostituire la logica manuale con Map (righe 49-60) con:

```js
// Vista aggregata
const punti = serieStoricaAggregata(etfDaUsare)
const datiGrafico = punti.map(p => ({ data: p.data, storico: p.valore }))

// Vista singolo ETF (invariata)
const serie = serieStorica(etf.acquisti, etf.prezzoCorrente)
const datiGrafico = serie.map(p => ({ data: p.data, storico: p.valore }))
```

Aggiornare l'import di `calcoli.js` per includere `serieStoricaAggregata`.

---

### Casi limite
| Caso | Comportamento |
|---|---|
| Oggi coincide con una data di acquisto | Non duplicare il punto finale |
| ETF con `prezzoCorrente = 0` | Contribuisce 0, non blocca |
| Un solo ETF | Risultato equivalente a `serieStorica` |
| ETF senza acquisti | Ignorato (contribuisce 0) |
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Risolto il bug di calo artificiale nel grafico portafoglio aggregato.

**Causa**: `GraficoPortafoglio` sommava i valori per data tramite una Map; date con acquisti di un solo ETF producevano valori incompleti (altri ETF non contribuivano).

**Soluzione**:
- Aggiunta `serieStoricaAggregata(etfList)` in `calcoli.js`: costruisce una timeline unificata di tutte le date di acquisto, calcola il valore di ogni ETF con carry-forward del prezzo precedente, aggiunge un punto "oggi" con `prezzoCorrente`.
- Refactoring `useMemo` in `GraficoPortafoglio.jsx`: vista aggregato → `serieStoricaAggregata`, vista singolo ETF → `serieStorica` invariata.

**File modificati**:
- `pac-dashboard/src/utils/calcoli.js` — aggiunta `serieStoricaAggregata`
- `pac-dashboard/src/components/GraficoPortafoglio.jsx` — import aggiornato + useMemo semplificato
<!-- SECTION:FINAL_SUMMARY:END -->
