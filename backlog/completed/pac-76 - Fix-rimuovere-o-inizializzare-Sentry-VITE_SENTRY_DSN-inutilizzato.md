---
id: PAC-76
title: Fix - rimuovere o inizializzare Sentry (VITE_SENTRY_DSN inutilizzato)
status: Done
assignee: []
created_date: '2026-03-19 08:18'
updated_date: '2026-03-21 10:57'
labels:
  - chore
  - monitoring
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
`VITE_SENTRY_DSN` è definito in `.env.example` ma non viene mai letto né usato nel codice (né in `main.jsx` né in `App.jsx`). La variabile crea aspettativa di error monitoring che non esiste.

Scegliere: implementare Sentry (`@sentry/react`) oppure rimuovere la variabile da `.env.example` e dalla documentazione.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 O Sentry è inizializzato in main.jsx con VITE_SENTRY_DSN e cattura errori React non gestiti
- [ ] #2 O VITE_SENTRY_DSN è rimosso da .env.example e dal task PAC-67
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Vedi PAC-67 — stessa implementazione. Sentry integrato in pac-dashboard con instrument.js + reactErrorHandler su createRoot (React 19).
<!-- SECTION:FINAL_SUMMARY:END -->
