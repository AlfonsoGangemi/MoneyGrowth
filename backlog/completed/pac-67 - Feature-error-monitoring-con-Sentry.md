---
id: PAC-67
title: 'Feature: error monitoring con Sentry'
status: Done
assignee: []
created_date: '2026-03-15 09:47'
updated_date: '2026-03-21 10:57'
labels:
  - feature
  - monitoring
  - release
milestone: m-0
dependencies: []
references:
  - pac-dashboard/src/main.jsx
  - pac-dashboard/.env.example
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nessun sistema di monitoraggio errori in produzione. Gli errori JavaScript e le eccezioni non gestite passano inosservati.

## Cosa fare

- Aggiungere `@sentry/react` come dipendenza
- Inizializzare Sentry in `main.jsx` con DSN da variabile d'ambiente `VITE_SENTRY_DSN`
- Wrappare `App` con `Sentry.ErrorBoundary`
- Aggiungere `VITE_SENTRY_DSN` a `.env.example` e alla documentazione deploy

## Note
- Sentry ha un piano gratuito sufficiente per un progetto personale
- Non raccogliere dati utente sensibili nei breadcrumb (disabilitare capturing di input values)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sentry inizializzato in main.jsx con DSN da env var
- [ ] #2 ErrorBoundary attivo sull'app
- [ ] #3 Errori JavaScript catturati e visibili su Sentry dashboard
- [ ] #4 VITE_SENTRY_DSN aggiunto a .env.example
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementato Sentry error monitoring in pac-dashboard:
- Installato @sentry/react@10.45.0
- Creato src/instrument.js con Sentry.init() (Error Monitoring + Tracing + Session Replay con maskAllText/blockAllMedia per privacy dati finanziari)
- Aggiornato src/main.jsx: import instrument.js come primo import, reactErrorHandler() su createRoot per React 19
- Aggiornato vercel.json CSP: aggiunto https://*.sentry.io e https://o*.ingest.sentry.io in connect-src, blob: in img-src e worker-src per Session Replay Web Worker
- DSN configurabile via VITE_SENTRY_DSN (già presente in .env.example); Sentry disabilitato se DSN non impostato
<!-- SECTION:FINAL_SUMMARY:END -->
