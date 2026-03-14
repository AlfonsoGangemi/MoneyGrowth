---
id: PAC-61
title: 'Cleanup: rimuovere campo mostra_proiezione obsoleto da DB e modello'
status: Done
assignee: []
created_date: '2026-03-14 16:01'
updated_date: '2026-03-14 17:00'
labels:
  - cleanup
  - database
  - tech-debt
dependencies:
  - PAC-60
references:
  - pac-dashboard/src/hooks/usePortafoglio.js
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Il campo `mostra_proiezione` nella tabella `config` è obsoleto: la UI non lo usa più ma è ancora presente nel DB, nel `defaultState` e nella funzione `setMostraProiezione` di `usePortafoglio.js`.

## Cosa rimuovere

| Dove | Cosa |
|---|---|
| DB Supabase | Colonna `mostra_proiezione` dalla tabella `config` (`ALTER TABLE config DROP COLUMN mostra_proiezione`) |
| `usePortafoglio.js` | Campo `mostraProiezione: true` nel `defaultState` (riga 17) |
| `usePortafoglio.js` | Lettura `config?.mostra_proiezione ?? true` nel caricamento (riga 218) |
| `usePortafoglio.js` | Funzione `setMostraProiezione` (riga 437–442) e relativa voce nel return (se presente) |
| `usePortafoglio.js` | Scrittura `mostra_proiezione` nell'`upsert` config durante import (riga 573) |
| `spec/model.md` | Riferimento al campo nella documentazione del modello dati |
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Colonna `mostra_proiezione` rimossa dalla tabella `config` su Supabase (migration SQL documentata)
- [ ] #2 Campo `mostraProiezione` rimosso da `defaultState` in usePortafoglio.js
- [ ] #3 Funzione `setMostraProiezione` rimossa da usePortafoglio.js
- [ ] #4 Nessun riferimento a `mostra_proiezione` rimane nel codice frontend
- [ ] #5 spec/model.md aggiornato per riflettere la rimozione
- [ ] #6 La dashboard si carica senza errori dopo la rimozione
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rimosso `mostra_proiezione` da:\n- `usePortafoglio.js`: defaultState, setStato al load, funzione `setMostraProiezione`, return object\n- `docs/model.md`: definizione colonna nel schema SQL + nota migrazione `ALTER TABLE config DROP COLUMN IF EXISTS mostra_proiezione;`
<!-- SECTION:FINAL_SUMMARY:END -->
