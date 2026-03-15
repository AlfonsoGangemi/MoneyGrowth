---
id: PAC-63
title: 'Bug: tabella storico non filtra per broker selezionati'
status: Done
assignee: []
created_date: '2026-03-14 17:52'
updated_date: '2026-03-15 10:08'
labels:
  - bug
  - broker
  - storico
  - filtro
milestone: m-0
dependencies: []
references:
  - pac-dashboard/src/hooks/usePortafoglio.js
  - pac-dashboard/src/components/TabellaProiezione.jsx
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La tabella storico annuale mostra i valori aggregati di tutti i broker, ignorando il filtro broker attivo (`brokerFiltro`).

## Comportamento atteso
Quando uno o più broker sono selezionati nel filtro, la tabella storico deve mostrare solo il totale versato e il valore reale dei broker selezionati.

## Comportamento osservato
La tabella mostra sempre il totale di tutti i broker indipendentemente dalla selezione.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Con filtro broker attivo, la tabella storico mostra solo i dati dei broker selezionati (versato + valore reale)
- [ ] #2 Con filtro vuoto (tutti i broker), il comportamento rimane invariato
- [ ] #3 Il grafico portafoglio e la tabella storico sono coerenti tra loro rispetto al filtro applicato
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rinominato stato `storicoAnnuale` → `storicoPerBroker` (record raw per-broker). Il valore `storicoAnnuale` è ora derivato nel return dell'hook filtrando `storicoPerBroker` per `brokerFiltro` prima di passare ad `aggregaPerAnno`. Tutti i consumer ricevono già lo storico filtrato correttamente.
<!-- SECTION:FINAL_SUMMARY:END -->
