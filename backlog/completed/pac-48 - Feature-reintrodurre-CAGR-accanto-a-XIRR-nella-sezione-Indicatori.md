---
id: PAC-48
title: 'Feature: reintrodurre CAGR accanto a XIRR nella sezione Indicatori'
status: Done
assignee: []
created_date: '2026-03-13 19:14'
updated_date: '2026-03-13 20:47'
labels:
  - feature
  - indicatori
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Reintrodurre il **CAGR** (Compound Annual Growth Rate) come indicatore complementare allo XIRR. Mentre lo XIRR considera il timing esatto dei flussi, il CAGR misura il tasso di crescita annualizzato semplice dal valore iniziale a quello attuale, ignorando i versamenti intermedi. Utile come riferimento rapido e intuitivo.

Formula:
```
CAGR = (valoreAttuale / valoreIniziale)^(1/anni) - 1
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 CAGR mostrato accanto a XIRR nella sezione Indicatori
- [ ] #2 Calcolato dal primo acquisto al valore attuale
- [ ] #3 Mostrato in % con 1 decimale
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiunto KPI "CAGR" in `Indicatori.jsx` usando `cagr` già restituito da `indicatoriPortafoglio`. Visibile solo se `durataM >= 1`. Grid aggiornato a `xl:grid-cols-8`.
<!-- SECTION:FINAL_SUMMARY:END -->
