---
id: PAC-30
title: >-
  Ricalcola scenari proiezione anno per anno partendo dal valore reale
  precedente
status: Done
assignee: []
created_date: '2026-03-12 16:43'
updated_date: '2026-03-13 11:57'
labels: []
dependencies: []
references:
  - pac-dashboard/src/components/TabellaProiezione.jsx
  - pac-dashboard/src/utils/calcoli.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Attualmente `calcolaProiezione` usa la capitalizzazione composta mensile partendo dal valore corrente del portafoglio. Il nuovo approccio deve calcolare ogni anno della proiezione in modo incrementale:

```
valoreAnnoN = (valoreAnnoN-1 + versamentoAnnuo) * (1 + rendimentoScenario)
```

Dove:
- `valoreAnnoN-1` = valore reale dell'anno precedente (da `storicoAnnuale`) se disponibile, altrimenti valore calcolato dello scenario nell'anno precedente
- `versamentoAnnuo` = `versamentoMensile * 12` (solo ETF attivi)
- `rendimentoScenario` = rendimento annuo dello scenario (es. 0.07)

## Comportamento atteso

- Il primo anno di proiezione parte dal valore dell'ultimo anno storico disponibile in `storicoAnnuale`
- Se non c'è storico, parte dal valore attuale del portafoglio
- Ogni anno successivo usa il valore calcolato dell'anno precedente nello stesso scenario
- Il calcolo avviene per anno intero (non più mese per mese con `calcolaProiezione`)
- La logica va implementata direttamente in `TabellaProiezione.jsx` (o in una nuova funzione in `calcoli.js`)

## Impatto

- `calcolaProiezione` in `calcoli.js` non viene più usata da `TabellaProiezione` (potrebbe restare per il grafico)
- `TabellaProiezione.jsx`: sostituire `proiezioniPerScenario` con il nuovo calcolo anno-per-anno
- `GraficoPortafoglio` / `calcoli.js`: verificare se `calcolaProiezione` è ancora usata altrove prima di rimuoverla

## File coinvolti

- `pac-dashboard/src/components/TabellaProiezione.jsx` — logica principale
- `pac-dashboard/src/utils/calcoli.js` — eventuale nuova funzione helper
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Il primo anno di proiezione parte dall'ultimo valore storico reale disponibile
- [x] #2 Ogni anno successivo usa il valore calcolato dello scenario precedente: (valoreAnno-1 + versamentoAnnuo) * (1 + rendimento)
- [x] #3 Il versamento annuo considera solo ETF attivi (non archiviati)
- [x] #4 I valori delle proiezioni sono coerenti con quelli storici (nessun salto artificiale al confine storico/proiezione)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Sostituita la logica `calcolaProiezione` (capitalizzazione mensile) con un calcolo anno per anno: `val = (val + versamentoAnnuo) * (1 + rendimento)`. Il punto di partenza è l'ultimo valore storico reale (`ultimoStorico.valore`) o `valoreOggi` se non c'è storico. Rimossi gli import non più necessari (`calcolaProiezione`, `format` da date-fns).
<!-- SECTION:FINAL_SUMMARY:END -->
