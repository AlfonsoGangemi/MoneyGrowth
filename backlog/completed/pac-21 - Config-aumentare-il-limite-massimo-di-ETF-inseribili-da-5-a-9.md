---
id: PAC-21
title: 'Config: aumentare il limite massimo di ETF inseribili da 5 a 9'
status: Done
assignee: []
created_date: '2026-03-12 07:34'
updated_date: '2026-03-12 08:22'
labels: []
dependencies: []
references:
  - 'pac-dashboard/src/hooks/usePortafoglio.js:153'
  - 'pac-dashboard/src/components/Dashboard.jsx:401'
  - spec/function.md
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Il limite attuale di 5 ETF per utente è hardcoded in due punti del codice. Va portato a 9 e la documentazione aggiornata di conseguenza.

**Occorrenze da modificare**:

1. `pac-dashboard/src/hooks/usePortafoglio.js` riga 153 — guard nell'hook che blocca l'inserimento:
   ```js
   if (stato.etf.length >= 5) return   // → >= 9
   ```

2. `pac-dashboard/src/components/Dashboard.jsx` riga 401 — condizione che nasconde il pulsante "Aggiungi ETF":
   ```jsx
   {port.etf.length < 5 && (   // → < 9
   ```

**Documentazione da aggiornare**:
- `spec/function.md` — verificare se il limite è citato e aggiornarlo a 9
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Il guard in usePortafoglio.js usa >= 9 al posto di >= 5
- [x] #2 La condizione in Dashboard.jsx usa < 9 al posto di < 5
- [x] #3 La documentazione in spec/function.md riflette il nuovo limite di 9 ETF
- [x] #4 Non sono presenti altre occorrenze del valore 5 usate come limite ETF nel codebase
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiornate tutte e tre le occorrenze del limite: `usePortafoglio.js:153` (guard `>= 5` → `>= 9`), `Dashboard.jsx:401` (condizione `< 5` → `< 9`), `spec/function.md` riga 4 (documentazione aggiornata a 9 ETF).
<!-- SECTION:FINAL_SUMMARY:END -->
