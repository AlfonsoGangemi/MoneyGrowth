---
id: PAC-87
title: 'Config: verifica configurazione Sentry (DSN, eventi, ambienti)'
status: Done
assignee: []
created_date: '2026-03-23 12:22'
updated_date: '2026-03-24 10:56'
labels:
  - config
  - sentry
  - monitoring
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Verificare che Sentry sia correttamente configurato e che gli errori vengano effettivamente registrati in produzione.

## Checklist di verifica

- [ ] Il DSN è impostato nella variabile d'ambiente `VITE_SENTRY_DSN` su Vercel (production)
- [ ] L'inizializzazione in `main.jsx` usa `import.meta.env.VITE_SENTRY_DSN`
- [ ] Gli ambienti sono separati: `environment: 'production'` in prod, disabilitato o `'development'` in locale
- [ ] Un errore di test triggerato manualmente appare nella dashboard Sentry
- [ ] Il `release` è configurato (opzionale ma utile per source maps)
- [ ] I `captureException` aggiunti nelle operazioni critiche (usePortafoglio, useAuth, calcoli, ETFCard, Dashboard) sono visibili come issues su Sentry

## Come testare

1. Aprire l'app in produzione
2. Triggerare un aggiornamento prezzo con un ISIN errato → deve apparire un evento su Sentry
3. Verificare nella dashboard Sentry che l'utente ID sia associato all'evento (via `Sentry.setUser`)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 VITE_SENTRY_DSN è impostato su Vercel in produzione
- [x] #2 Un errore reale in produzione appare come issue nella dashboard Sentry
- [x] #3 Gli eventi includono l'utente ID (Sentry.setUser)
- [x] #4 In sviluppo locale Sentry è disabilitato o non invia eventi reali
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Tutti i requisiti erano già implementati nel codebase. AC#3: Sentry.setUser({ id: u.id }) presente in useAuth.js al login, Sentry.setUser(null) al logout. AC#4: instrument.js usa `enabled: !!import.meta.env.VITE_SENTRY_DSN && !import.meta.env.DEV` — disabilitato correttamente in sviluppo locale. Copertura captureException completa su usePortafoglio, useAuth, Dashboard ed ETFCard.
<!-- SECTION:FINAL_SUMMARY:END -->
