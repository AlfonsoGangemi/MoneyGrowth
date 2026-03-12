---
id: PAC-16
title: 'Fix: grafico aggregato esclude lo storico degli ETF archiviati'
status: Done
assignee: []
created_date: '2026-03-11 23:15'
updated_date: '2026-03-12 11:07'
labels:
  - bug
  - grafico
dependencies: []
references:
  - pac-dashboard/src/components/Dashboard.jsx
  - pac-dashboard/src/components/GraficoPortafoglio.jsx
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problema

`GraficoPortafoglio` riceve solo `etfAttivi` come prop `etfList`. Gli ETF archiviati vengono esclusi completamente, quindi il loro contributo storico scompare dal grafico aggregato anche per il periodo in cui erano attivi nel portafoglio.

```jsx
// Dashboard.jsx
const etfAttivi = etfFiltrate.filter(e => !e.archiviato)

<GraficoPortafoglio
  etfList={etfAttivi}   // ← ETF archiviati esclusi
  ...
/>
```

Questo causa una **sottostima del valore storico del portafoglio**: se un ETF è stato venduto/archiviato dopo 2 anni di acquisti, quei 2 anni scompaiono dal grafico.

## Comportamento atteso

- Il grafico **aggregato** deve includere lo storico di tutti gli ETF, attivi e archiviati.
- Gli ETF archiviati contribuiscono al grafico solo per il periodo in cui avevano acquisti; per il punto "oggi" contribuiscono 0 (non hanno `prezzoCorrente` aggiornato).
- Le **viste singolo ETF** (tasto con nome dell'ETF nel selettore del grafico) mostrano **solo gli ETF attivi**.

## Causa

`Dashboard.jsx` riga 253: `etfAttivi = etfFiltrate.filter(e => !e.archiviato)`, passato direttamente a `GraficoPortafoglio`.

## Soluzione attesa

Passare a `GraficoPortafoglio` due prop distinte:
- `etfList` — tutti gli ETF (attivi + archiviati) — usata per la serie storica aggregata
- `etfAttivi` — solo ETF attivi — usata per popolare i bottoni del selettore singolo ETF

Nel componente, la vista aggregata usa tutti gli ETF; le viste singolo ETF usano solo `etfAttivi`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Il grafico aggregato include lo storico degli acquisti degli ETF archiviati
- [x] #2 Il punto 'oggi' degli ETF archiviati non gonfia il valore corrente (contribuisce 0 o viene escluso)
- [x] #3 Le altre sezioni della dashboard (Indicatori, TabellaProiezione, AcquistoForm) continuano a usare solo etfAttivi
- [x] #4 Il selettore di vista mostra solo gli ETF attivi come bottoni singoli
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## File coinvolti

- `pac-dashboard/src/utils/calcoli.js` — funzione `serieStoricaDaPrezziStorici`
- `pac-dashboard/src/components/GraficoPortafoglio.jsx` — props e selettore
- `pac-dashboard/src/components/Dashboard.jsx` — chiamata a `GraficoPortafoglio`

---

## Step 1 — `calcoli.js`: escludere ETF archiviati dal punto "oggi"

Nel blocco "Punto oggi con prezzoCorrente" di `serieStoricaDaPrezziStorici` (righe 326-333), il loop su `etfList` includerà ETF archiviati che non hanno `prezzoCorrente` aggiornato. Aggiungere il guard `if (etf.archiviato) continue` prima di accumulare `valoreOggi`.

```js
// PRIMA
for (const etf of etfList) {
  const quoteAcc = (etf.acquisti || []).reduce((s, a) => s + a.quoteFrazionate, 0)
  valoreOggi += quoteAcc * (etf.prezzoCorrente || 0)
}

// DOPO
for (const etf of etfList) {
  if (etf.archiviato) continue   // ← ETF archiviati non contribuiscono al punto "oggi"
  const quoteAcc = (etf.acquisti || []).reduce((s, a) => s + a.quoteFrazionate, 0)
  valoreOggi += quoteAcc * (etf.prezzoCorrente || 0)
}
```

---

## Step 2 — `GraficoPortafoglio.jsx`: nuova prop `etfAttivi`

Aggiornare la firma del componente per ricevere `etfAttivi` (solo ETF attivi) separato da `etfList` (tutti gli ETF):

```jsx
// PRIMA
export default function GraficoPortafoglio({ etfList, prezziStorici = [] }) {

// DOPO
export default function GraficoPortafoglio({ etfList, etfAttivi, prezziStorici = [] }) {
```

Nel selettore di vista (riga 77), sostituire `etfList.map(...)` con `etfAttivi.map(...)` in modo che i bottoni singoli mostrino solo gli ETF attivi:

```jsx
// PRIMA
{etfList.map(e => (

// DOPO
{etfAttivi.map(e => (
```

Aggiornare le dipendenze dell'`useMemo`:

```js
// PRIMA
}, [etfList, prezziStorici, vista])

// DOPO
}, [etfList, etfAttivi, prezziStorici, vista])
```

---

## Step 3 — `Dashboard.jsx`: passare tutti gli ETF a `GraficoPortafoglio`

Cambiare la chiamata a `GraficoPortafoglio` per passare `etfFiltrate` (attivi + archiviati) come `etfList` e aggiungere la nuova prop `etfAttivi`:

```jsx
// PRIMA
<GraficoPortafoglio
  etfList={etfAttivi}
  prezziStorici={port.prezziStorici}
/>

// DOPO
<GraficoPortafoglio
  etfList={etfFiltrate}
  etfAttivi={etfAttivi}
  prezziStorici={port.prezziStorici}
/>
```

Il guard `{etfAttivi.length > 0 && ...}` che avvolge il componente rimane invariato: il grafico appare solo se ci sono ETF attivi.

---

## Note

- La logica della serie storica mensile (`serieStoricaDaPrezziStorici`) non richiede modifiche: itera già tutti gli ETF in `etfList` per i mesi passati, e il fallback a `prezzoUnitario` funziona correttamente anche per ETF archiviati con acquisti storici.
- Edge case non trattato: se `vista` punta a un ETF che viene archiviato durante la sessione, il bottone scompare ma il grafico mostrerebbe una serie vuota. Da affrontare in task separato se segnalato.
<!-- SECTION:PLAN:END -->
