---
id: PAC-42
title: >-
  Fix: formattare i valori monetari nella scheda ETF con separatore delle
  migliaia
status: Done
assignee: []
created_date: '2026-03-13 18:04'
updated_date: '2026-03-13 19:20'
labels:
  - ui
  - fix
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nella scheda ETF (ETFCard) i valori monetari non mostrano il separatore delle migliaia. Vanno formattati con il punto come separatore (es. `€1.234` invece di `€1234`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tutti i valori monetari in ETFCard usano il separatore delle migliaia con il punto (locale it-IT)
- [ ] #2 Il formato è coerente su tutti i campi della scheda (valore attuale, versato, rendimento, ecc.)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiornata la funzione `fmt` in ETFCard da `toLocaleString('it-IT')` a `Intl.NumberFormat('it-IT')` per garantire esplicitamente il separatore delle migliaia con punto (locale italiana) su tutti i valori numerici della scheda.
<!-- SECTION:FINAL_SUMMARY:END -->
