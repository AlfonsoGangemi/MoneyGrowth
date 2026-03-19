---
id: PAC-73
title: Fix - validazione schema JSON in importazione dati
status: Done
assignee: []
created_date: '2026-03-19 08:18'
updated_date: '2026-03-19 08:55'
labels:
  - bug
  - security
  - data-integrity
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La funzione `importJSON()` in `usePortafoglio.js` esegue il parsing del file JSON senza validare lo schema. Un file malformato o con struttura errata può corrompere i dati dell'utente silenziosamente (es. date in formato errato, importi negativi, acquisti orfani).

Aggiungere validazione strutturale prima di procedere con l'import.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 File JSON con schema non valido viene rifiutato con messaggio d'errore chiaro
- [x] #2 Vengono validati: presenza dei campi obbligatori, formato data yyyy-MM-dd, importi numerici positivi, coerenza etf-acquisti
- [x] #3 Un JSON valido continua a importarsi correttamente
- [x] #4 Nessuna scrittura su Supabase se la validazione fallisce
<!-- AC:END -->
