---
id: PAC-162
title: Rimuovere la modalità storico ExtraETF con isin singolare (dead code)
status: Done
assignee: []
created_date: '2026-08-05 08:12'
updated_date: '2026-08-26 14:55'
labels: []
dependencies: []
references:
  - pac-dashboard/api/extraetf-quotes.js
  - docs/serverless-functions.md
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verificato: nessun punto dell'app chiama `/api/extraetf-quotes` con `isin=` singolare. Tutti i chiamanti reali (`Dashboard.jsx:459`, `useWatchlist.js:28`, `useETFQuotes.js:29`, `ETFCard.jsx:44`, `backfillPrezzi.js:117`) usano già `isins=` plurale — anche `backfillPrezzi.js` lo fa per la modalità storico (`date_from` presente), passando dalla batch (`handleHistoryBatch`) anche per un singolo ISIN.

L'unico posto che usa la forma singolare `isin=` per lo storico è l'esempio in `docs/serverless-functions.md:57`, che documenta un ramo di codice (`handleHistory`, righe 41-55 di `api/extraetf-quotes.js`) mai raggiunto da nessun chiamante reale — dead code.

Rimuovere `handleHistory` e il relativo ramo di dispatch (single vs batch su `req.query.isins`) da `api/extraetf-quotes.js`, lasciando solo `handleHistoryBatch` (già gestisce correttamente anche un solo ISIN) per la modalità storico. Aggiornare l'esempio in `docs/serverless-functions.md` per usare `isins=` invece di `isin=`.

Nota: questo file è anche oggetto del merge previsto in PAC-161 (extraetf-detail.js + extraetf-quotes.js) — conviene farlo prima di quel merge, per portare meno codice/rami nel file accorpato.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La funzione handleHistory (ramo isin singolare) e il relativo dispatch sono rimossi da api/extraetf-quotes.js
- [x] #2 handleHistoryBatch resta l'unico percorso per lo storico prezzi e gestisce correttamente sia un singolo ISIN sia più ISIN
- [x] #3 L'esempio in docs/serverless-functions.md usa isins= invece di isin=
- [x] #4 Tutti i chiamanti esistenti (Dashboard.jsx, useWatchlist.js, useETFQuotes.js, ETFCard.jsx, backfillPrezzi.js) continuano a funzionare invariati, dato che già usano isins=
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Chiuso contestualmente a PAC-161 (con conferma esplicita dell'utente), invece di portare il ramo dead-code nel file accorpato e poi rimuoverlo in un secondo passaggio.

Rimosso `handleHistory` (ramo storico single-ISIN via `isin=`) e il relativo dispatch da quello che nel frattempo è diventato `api/extraetf.js` (PAC-161). `handleHistoryBatch` è ora l'unico percorso per lo storico prezzi, gestisce correttamente sia un singolo ISIN sia più ISIN passati in `isins=`.

Aggiornato l'esempio in docs/serverless-functions.md per usare `isins=` invece di `isin=`. Tutti i chiamanti esistenti (Dashboard.jsx, useWatchlist.js, useETFQuotes.js, ETFCard.jsx, backfillPrezzi.js) già usavano `isins=` plurale, quindi nessuna modifica lato client è stata necessaria per questo specifico cleanup.

Verificato con test dedicato: `date_from` presente senza `isins` → 400 "Nessun ISIN valido" (comportamento nuovo e voluto, non regressione — nessun chiamante reale passava mai `isin=` singolare con `date_from`).
<!-- SECTION:FINAL_SUMMARY:END -->
