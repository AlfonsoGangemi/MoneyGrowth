---
id: PAC-49
title: Fix separatore migliaia assente per valori < 10.000
status: Done
assignee: []
created_date: '2026-03-13 19:44'
updated_date: '2026-07-30 13:46'
labels:
  - bug
  - ux
dependencies: []
references:
  - pac-dashboard/src/components/TabellaProiezione.jsx
modified_files:
  - pac-dashboard/src/components/TabellaProiezione.jsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problema

`Intl.NumberFormat('it-IT', { style: 'currency', ... })` non applica il separatore delle migliaia per valori compresi tra 1.000 e 9.999 in alcuni browser/ambienti. Il comportamento atteso è "2.381 €" ma viene mostrato "2381 €".

## Dove si manifesta

- Tabella **Storico** (colonne "Totale versato" e "Valore reale") — valori tipo 2.381 €, 5.906 €
- Tabella **Proiezione** (colonna "Totale versato" e incrementi scenari) — stessa funzione `fmt`

## File

- `pac-dashboard/src/components/TabellaProiezione.jsx` — funzione `fmt` (righe 4–11)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Valori come 2381 vengono mostrati come "2.381 €" in tutti i browser moderni
- [x] #2 Il separatore è presente sia nella tabella Storico che nella tabella Proiezione
- [x] #3 Nessuna regressione sul formato decimali (es. rendimenti percentuali)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiunto `useGrouping: true` esplicito alla funzione `fmt` in TabellaProiezione.jsx. Il bug era causato dal comportamento di ICU/Node dove per valori tra 1.000 e 9.999 il raggruppamento delle migliaia non veniva applicato di default con `Intl.NumberFormat('it-IT', {style:'currency', ...})`. Verificato con test manuali: 999 €, 2.381 €, 12.381 €, 0 €, -2.381 € — tutti corretti, nessuna regressione su fmtPct (percentuali).
<!-- SECTION:FINAL_SUMMARY:END -->
