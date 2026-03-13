---
id: PAC-38
title: >-
  Feature: mostrare badge broker e sfondo diverso per ETF non appartenenti al
  broker selezionato
status: Done
assignee: []
created_date: '2026-03-13 17:12'
updated_date: '2026-03-13 20:16'
labels:
  - ui
  - feature
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nella visualizzazione delle ETF card, aggiungere indicatori visivi che mostrino a quale broker appartengono gli acquisti di ogni ETF e segnalino quando l'ETF non appartiene al broker attualmente selezionato nel filtro.\n\n**Badge broker**: per ogni broker che ha almeno un acquisto sull'ETF, mostrare un piccolo badge colorato (colore del broker) — senza testo, solo il dot/badge.\n\n**Sfondo diverso per broker non selezionato**: se è attivo un filtro broker e l'ETF non ha acquisti su quei broker, mostrare la card con uno sfondo visivamente attenuato/diverso rispetto alle card che appartengono ai broker selezionati.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Per ogni ETF card, vengono mostrati i badge (dot colorato) dei broker che hanno almeno un acquisto su quell'ETF
- [x] #2 I badge broker sono visivamente compatti e non ingombrano il layout
- [x] #3 Se è attivo un filtro broker e l'ETF non ha acquisti su quel broker, la card ha uno sfondo visivamente attenuato/diverso
- [x] #4 Se nessun filtro broker è attivo, tutte le card hanno lo stesso sfondo
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Analisi stato attuale

- `ETFCard` riceve `etf` con `acquisti` già filtrati per `brokerFiltro` (lo fa `etfFiltrate` in Dashboard)
- Per i **badge broker** servono i broker con acquisti sull'ETF dai dati **non filtrati** (`port.etf`) — altrimenti con filtro attivo non si vedrebbero i dot degli altri broker
- Per lo **sfondo attenuato** basta sapere se `brokerFiltro` è attivo e se l'ETF non ha acquisti nel filtro corrente (cioè `etf.acquisti.length === 0` dopo il filtering)
- `port.broker` ha `id`, `nome`, `colore` — usato per mappare `brokerId` → colore dot

### File coinvolti

1. `pac-dashboard/src/components/Dashboard.jsx` — calcolo `brokerPerETF` + nuove prop
2. `pac-dashboard/src/components/ETFCard.jsx` — ricezione prop + rendering badge + sfondo

---

## Step 1 — Calcola `brokerPerETF` in `Dashboard.jsx`

Dopo `const limitRaggiunto = ...`, aggiungere:

```js
// Per ogni ETF, lista dei broker objects che hanno almeno un acquisto (dati non filtrati)
const brokerPerETF = Object.fromEntries(
  port.etf.map(e => [
    e.id,
    [...new Set(e.acquisti.map(a => a.brokerId))]
      .map(id => port.broker.find(b => b.id === id))
      .filter(Boolean),
  ])
)
```

---

## Step 2 — Passa nuove prop agli ETF attivi in `Dashboard.jsx`

Nella griglia degli ETF attivi (`etfAttivi.map`), aggiungere:

```jsx
<ETFCard
  ...
  brokerAcquisti={brokerPerETF[etf.id] ?? []}
  attenuata={port.brokerFiltro.length > 0 && etf.acquisti.length === 0}
/>
```

`attenuata` è `true` solo se c'è un filtro broker attivo E l'ETF non ha acquisti per quei broker.

---

## Step 3 — Aggiungi prop e badge dot in `ETFCard.jsx`

Aggiungere `brokerAcquisti` e `attenuata` ai parametri della funzione.

Inserire i badge dot subito dopo il link ISIN (sotto `</a>`):

```jsx
{brokerAcquisti.length > 0 && (
  <div className="flex items-center gap-1 mt-1.5">
    {brokerAcquisti.map(b => (
      <span
        key={b.id}
        className="w-2 h-2 rounded-full flex-shrink-0"
        style={{ backgroundColor: b.colore }}
        title={b.nome}
      />
    ))}
  </div>
)}
```

---

## Step 4 — Applica sfondo attenuato in `ETFCard.jsx`

Modificare la classe del `div` root della card:

```jsx
// prima
<div className="bg-slate-800 border border-slate-700 rounded-2xl p-5 flex flex-col gap-4">

// dopo
<div className={`border rounded-2xl p-5 flex flex-col gap-4 ${
  attenuata
    ? 'bg-slate-800/40 border-slate-800'
    : 'bg-slate-800 border-slate-700'
}`}>
```

---

## Note

- I badge dot mostrano SEMPRE tutti i broker con acquisti sull'ETF, indipendentemente dal filtro attivo — così l'utente vede subito perché una card è attenuata
- Per gli ETF archiviati la card ha già `opacity-50` applicata dal wrapper in Dashboard — non serve agire su di loro
- Nessuna modifica a `usePortafoglio.js` o logica di business
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementati badge broker dot e sfondo attenuato nelle ETFCard.\n\n**Dashboard.jsx**: aggiunto `brokerPerETF` (mappa etfId → lista broker con acquisti, dati non filtrati da `port.etf`). Passate prop `brokerAcquisti` e `attenuata` agli ETF attivi.\n\n**ETFCard.jsx**: aggiunte prop `brokerAcquisti` e `attenuata`. Badge dot colorati visibili sotto il link ISIN (sempre, indipendentemente dal filtro). Sfondo della card diventa `bg-slate-800/40 border-slate-800` quando `attenuata === true`.
<!-- SECTION:FINAL_SUMMARY:END -->
