---
id: PAC-2
title: Rimuovere la leggenda dal grafico del portafoglio
status: Done
assignee: []
created_date: '2026-03-10 15:04'
updated_date: '2026-03-12 07:52'
labels:
  - ui
  - frontend
dependencies: []
references:
  - src/components/GraficoPortafoglio.jsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Eliminare la leggenda visualizzata nel componente `GraficoPortafoglio.jsx` per semplificare l'interfaccia e ridurre il rumore visivo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La leggenda non è più visibile nel grafico storico
- [x] #2 La rimozione non altera il comportamento delle serie (tooltip, linee, colori)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Piano implementativo

Task minimo: 2 modifiche in un unico file.

### Step 1 — Rimuovere l'import di `Legend`
File: `pac-dashboard/src/components/GraficoPortafoglio.jsx` riga 10

```js
// Rimuovere questa riga dall'import recharts:
Legend,
```

### Step 2 — Rimuovere il componente `<Legend>` dal JSX
File: `pac-dashboard/src/components/GraficoPortafoglio.jsx` righe 105-107

```jsx
// Rimuovere questo blocco:
<Legend
  wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 12 }}
/>
```

### Verifica
- Le linee del grafico (storico + proiezioni scenari) rimangono invariate
- Il tooltip continua a funzionare
- Nessun warning React per import inutilizzato
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rimosso `Legend` dall'import recharts e il componente `<Legend>` dal JSX in `GraficoPortafoglio.jsx`. Tooltip, linee e colori invariati.
<!-- SECTION:FINAL_SUMMARY:END -->
