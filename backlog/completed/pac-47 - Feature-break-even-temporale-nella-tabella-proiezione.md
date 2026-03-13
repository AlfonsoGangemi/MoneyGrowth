---
id: PAC-47
title: 'Feature: break-even temporale nella tabella proiezione'
status: Done
assignee: []
created_date: '2026-03-13 19:13'
updated_date: '2026-03-13 20:47'
labels:
  - feature
  - ui
  - indicatori
dependencies: []
references:
  - pac-dashboard/src/components/TabellaProiezione.jsx
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Evidenziare nella tabella proiezione la prima riga in cui il valore proiettato supera il totale versato (break-even), per ogni scenario. I dati `totaleVersato` e `valoriScenari[].valore` sono già disponibili nelle righe.

Implementazione suggerita: aggiungere un'icona o un bordo colorato sulla prima riga in cui `valore > totaleVersato` per ciascuna colonna scenario.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 La prima riga dove valore > totaleVersato è visivamente distinta per ogni scenario
- [ ] #2 L'evidenziazione funziona correttamente anche su mobile (scenario singolo visibile)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiunto highlighting break-even in `TabellaProiezione.jsx`: precomputa per ogni scenario la prima riga in cui `valore > totaleVersato`, evidenzia la cella con sfondo verde (`bg-emerald-900/20`), testo verde (`text-emerald-400`) e indicatore ↑ con tooltip "Break-even".
<!-- SECTION:FINAL_SUMMARY:END -->
