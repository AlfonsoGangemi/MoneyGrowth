---
id: PAC-72
title: Fix - operazioni DB fire-and-forget in usePortafoglio
status: Done
assignee: []
created_date: '2026-03-19 08:18'
updated_date: '2026-03-19 08:55'
labels:
  - bug
  - database
  - reliability
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
In `usePortafoglio.js` gli `upsert` su `portafoglio_storico_annuale` sono eseguiti con `.then()` senza await e senza gestione degli errori. Se l'operazione fallisce, il DB rimane incoerente ma l'UI non ne è informata.

Righe interessate: ~200 (in `aggiungiAcquisto`) e ~387 (in `aggiungiAcquistiMultipli`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Gli upsert su portafoglio_storico_annuale usano await invece di .then()
- [x] #2 Se l'upsert fallisce, l'errore viene propagato e mostrato all'utente
- [x] #3 Il comportamento transazionale è coerente: se il salvataggio acquisto ha successo ma lo storico fallisce, l'utente è informato
<!-- AC:END -->
