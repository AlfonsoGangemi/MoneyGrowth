---
id: PAC-161
title: >-
  Accorpare endpoint OAuth discovery ed ExtraETF per liberare slot Serverless
  Function
status: Done
assignee: []
created_date: '2026-08-05 08:07'
updated_date: '2026-08-26 14:55'
labels: []
dependencies: []
references:
  - docs/serverless-functions.md
  - pac-dashboard/vercel.json
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Il progetto è a 12/12 Serverless Function su Vercel (limite piano Hobby, vedi CLAUDE.md), senza margine per aggiungere nuovi endpoint (es. il futuro endpoint di analisi avanzate di PAC-153). Due coppie di file sono accorpabili senza impatto funzionale.

## 1. OAuth discovery — metadata.js + protected-resource.js

`api/oauth/metadata.js` (17 righe) e `api/oauth/protected-resource.js` (11 righe) sono entrambi endpoint statici GET-only che restituiscono un documento di discovery OAuth/MCP, già mappati via rewrite in `vercel.json`:
- `/.well-known/oauth-authorization-server` → `/api/oauth/metadata`
- `/.well-known/oauth-protected-resource` → `/api/oauth/protected-resource`

Possono essere accorpati in un unico file (es. `api/oauth/discovery.js`) che distingue i due documenti tramite un query param aggiunto nella destination del rewrite (`?type=as` / `?type=pr`), senza cambiare nessuna URL esterna né toccare `authorize.js`/`token.js`/`register.js` (flusso OAuth vero e proprio, da lasciare separati per chiarezza e per non introdurre rischio su codice di autenticazione).

## 2. ExtraETF — extraetf-detail.js + extraetf-quotes.js

A differenza della coppia OAuth, questi endpoint non hanno URL esterne fisse da rispettare: sono chiamati solo dal frontend dello stesso repo (`Dashboard.jsx`, `useWatchlist.js`, `useETFQuotes.js`, `ETFCard.jsx`, `backfillPrezzi.js`), quindi il merge è più semplice — nessun `vercel.json` da toccare, basta accorpare i due handler e aggiornare le ~3 chiamate `fetch()` lato client.

`api/extraetf-quotes.js` dispatcha già oggi su query param (`date_from` presente → storico REST, singolo o batch via `isins`; assente → real-time via WebSocket, richiede `isins` plurale). `api/extraetf-detail.js` usa invece solo `isin` singolare, senza `date_from` né `isins` plurale — quindi si inserisce come un terzo ramo naturale nello stesso dispatch, senza ambiguità con gli altri due:
1. `date_from` presente → storico (come oggi)
2. `date_from` assente + `isins` plurale → real-time WS (come oggi)
3. `date_from` assente + `isin` singolare (no `isins`) → NUOVO: dettaglio fondo (logica di extraetf-detail.js)

Nota da decidere in fase di implementazione: `extraetf-detail.js` ha un rate limiter per-IP (60/min) che `extraetf-quotes.js` non ha — va deciso se applicarlo solo al ramo dettaglio o all'intero file accorpato. Il file risultante andrebbe rinominato in modo più generico (es. `api/extraetf.js`), dato che non gestirebbe più solo quotazioni.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 metadata.js e protected-resource.js sono accorpati in un unico file api/oauth/discovery.js
- [x] #2 Le due URL esterne /.well-known/oauth-authorization-server e /.well-known/oauth-protected-resource continuano a restituire esattamente lo stesso JSON di oggi (nessuna breaking change per i client OAuth/MCP)
- [x] #3 docs/architecture.md e docs/serverless-functions.md sono aggiornati per riflettere il file unico
- [x] #4 extraetf-detail.js e extraetf-quotes.js sono accorpati in un unico file (es. api/extraetf.js)
- [x] #5 Il conteggio delle Serverless Function scende di 2 (da 12 a 10) sommando entrambi i merge di questo task
- [x] #6 Le chiamate fetch() lato client (Dashboard.jsx, useWatchlist.js, useETFQuotes.js, ETFCard.jsx, backfillPrezzi.js) sono aggiornate al nuovo endpoint e continuano a restituire esattamente le stesse risposte di oggi
- [x] #7 Il rate limiting esistente su extraetf-detail.js non viene perso nel merge
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. `api/oauth/discovery.js` sostituisce `metadata.js` + `protected-resource.js`: dispatch su `req.query.type` ('as'/'pr'), iniettato dal rewrite Vercel via querystring nella destination.
2. `vercel.json`: le due rewrite `.well-known/*` puntano a `/api/oauth/discovery?type=as` e `?type=pr`.
3. `api/extraetf.js` sostituisce `extraetf-quotes.js` + `extraetf-detail.js`: dispatch su `date_from` (storico), `isins` senza `date_from` (real-time WS), `isin` singolare (dettaglio). Rate limiter (60/min/IP) condiviso su tutti e tre i rami — entrambi i file originali lo avevano già identico, nessuna decisione di trade-off necessaria.
4. Contestualmente (con conferma utente) chiuso anche PAC-162: rimosso da subito il ramo storico single-ISIN dead-code (`handleHistory`) invece di portarlo nel file accorpato — `handleHistoryBatch` resta l'unico percorso storico.
5. `vite.config.js` (routing dev locale): aggiornato per instradare `/api/extraetf` e i due path `.well-known/*` verso i nuovi handler.
6. Chiamate `fetch()` lato client aggiornate in Dashboard.jsx (×3), ETFCard.jsx, useWatchlist.js (×2), useETFQuotes.js, backfillPrezzi.js.
7. Test: rinominato `extraetf-detail.test.js` → `extraetf.test.js`, import aggiornato, aggiunti test di dispatch tra i rami e di rate limiting condiviso.
8. Docs aggiornate: docs/architecture.md (tabelle api/, hooks, config), docs/serverless-functions.md (panoramica + sezioni dettagliate riscritte), docs/deploy.md (esempio vercel.json).
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Accorpati i due file OAuth discovery e i due file ExtraETF, portando il conteggio Serverless Function da 12/12 (limite piano Hobby Vercel raggiunto) a 10/12 — 2 slot liberi per PAC-157 (Stripe: checkout + webhook).

**OAuth discovery**: `api/oauth/discovery.js` sostituisce `metadata.js`+`protected-resource.js`, dispatch via `?type=as`/`?type=pr` iniettato dal rewrite in `vercel.json`. Verificato manualmente che entrambe le risposte sono byte-identiche a quelle dei file originali (incluso `OPTIONS` → 204).

**ExtraETF**: `api/extraetf.js` sostituisce `extraetf-quotes.js`+`extraetf-detail.js` con dispatch a 3 rami (storico / real-time WS / dettaglio fondo) sugli stessi query param già in uso. Rate limiter 60 req/min/IP condiviso — entrambi i file originali lo avevano già identico, nessun trade-off da fare come ipotizzato nella descrizione del task.

**Scope esteso a PAC-162 (con conferma utente)**: durante il merge è emerso che il ramo storico single-ISIN (`handleHistory`, attivabile con `isin=` invece di `isins=`) era dead code mai raggiunto da alcun chiamante reale (già verificato in PAC-162). Anziché portarlo nel file accorpato, è stato rimosso subito: `handleHistoryBatch` è ora l'unico percorso storico, gestisce correttamente anche un singolo ISIN. PAC-162 chiuso contestualmente.

**Consumer aggiornati**: Dashboard.jsx, ETFCard.jsx, useWatchlist.js, useETFQuotes.js, backfillPrezzi.js (fetch verso `/api/extraetf` invece di `/api/extraetf-quotes` o `/api/extraetf-detail`); `vite.config.js` per il routing dev locale.

**Test**: `extraetf-detail.test.js` rinominato in `extraetf.test.js`, import aggiornato, aggiunti 5 nuovi test (dispatch storico/batch/default, 400 su `date_from` senza `isins`, rate limit condiviso a 429). Suite completa: 8 file, 152 test passati (era 151, +1 netto dopo rimozione/aggiunta). Nessun errore ESLint sui file toccati (solo warning pre-esistenti già tracciati in PAC-164).

**Documentazione**: docs/architecture.md, docs/serverless-functions.md, docs/deploy.md aggiornati. docs/oauth-pkce-analysis.md lasciato invariato (documento di analisi storica PAC-117, non riferimento vivente).

**Rischi/follow-up**: nessun test automatico per `oauth/discovery.js` (verificato solo manualmente, come già era per i file originali che non avevano test). Deploy su Vercel non ancora verificato in produzione — da controllare al primo deploy che le due URL `.well-known` rispondano correttamente tramite il nuovo rewrite.
<!-- SECTION:FINAL_SUMMARY:END -->
