---
id: PAC-43
title: >-
  Fix: formattare i valori monetari nella tabella storico con separatore delle
  migliaia
status: Done
assignee: []
created_date: '2026-03-13 18:05'
updated_date: '2026-03-13 19:20'
labels:
  - ui
  - fix
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nella sezione "Storico" di TabellaProiezione i valori monetari non mostrano il separatore delle migliaia. Vanno formattati con il punto come separatore (es. `€1.234` invece di `€1234`), usando la funzione `fmt` già presente con locale it-IT.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Tutti i valori monetari nella tabella storico usano il separatore delle migliaia (locale it-IT)
- [ ] #2 Il formato è coerente su tutte le colonne: Totale versato, Valore reale, rendimento EUR
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
La funzione `fmt` in TabellaProiezione usava già `Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' })` che include automaticamente il separatore delle migliaia. Aggiunto `minimumFractionDigits: 0` per uniformità con `maximumFractionDigits`.
<!-- SECTION:FINAL_SUMMARY:END -->
