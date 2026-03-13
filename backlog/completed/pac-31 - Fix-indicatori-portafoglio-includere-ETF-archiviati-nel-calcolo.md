---
id: PAC-31
title: 'Fix indicatori portafoglio: includere ETF archiviati nel calcolo'
status: Done
assignee: []
created_date: '2026-03-13 12:28'
updated_date: '2026-03-13 12:28'
labels: []
dependencies: []
references:
  - pac-dashboard/src/utils/calcoli.js
  - pac-dashboard/src/components/Indicatori.jsx
  - pac-dashboard/src/components/Dashboard.jsx
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La funzione `indicatoriPortafoglio` in `calcoli.js` e il componente `Indicatori.jsx` calcolano totale investito, valore attuale, ROI, CAGR ecc. solo sugli ETF attivi. Gli ETF archiviati hanno acquisti storici reali che devono essere inclusi negli indicatori aggregati del portafoglio.

## Problema

Se un ETF viene archiviato, i suoi acquisti spariscono dal calcolo degli indicatori, falsando tutti i totali (investito, valore, rendimento).

## Comportamento atteso

- `indicatoriPortafoglio` riceve l'intera lista ETF (attivi + archiviati) e li include tutti nel calcolo
- Verificare che in `Dashboard.jsx` (o dove viene chiamata) la funzione riceva `etfList` completa e non filtrata per `archiviato`

## File coinvolti

- `pac-dashboard/src/utils/calcoli.js` — `indicatoriPortafoglio`
- `pac-dashboard/src/components/Indicatori.jsx` — verifica props ricevute
- `pac-dashboard/src/components/Dashboard.jsx` — verifica che passi la lista completa
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Gli acquisti degli ETF archiviati sono inclusi nel totale investito
- [x] #2 Il valore attuale include le quote degli ETF archiviati (con il loro prezzoCorrente)
- [x] #3 ROI, CAGR e altri indicatori riflettono l'intero portafoglio storico
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fix in una riga: `Dashboard.jsx` passava `etfAttivi` a `<Indicatori>`. Cambiato in `etfFiltrate` (lista completa attivi + archiviati, già filtrata per broker). `Indicatori.jsx` e `indicatoriPortafoglio` non richiedevano modifiche.
<!-- SECTION:FINAL_SUMMARY:END -->
