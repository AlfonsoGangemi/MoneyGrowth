---
id: PAC-87
title: 'Config: verifica configurazione Sentry (DSN, eventi, ambienti)'
status: To Do
assignee: []
created_date: '2026-03-23 12:22'
updated_date: '2026-03-23 12:36'
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
- [ ] #2 Un errore reale in produzione appare come issue nella dashboard Sentry
- [ ] #3 Gli eventi includono l'utente ID (Sentry.setUser)
- [ ] #4 In sviluppo locale Sentry è disabilitato o non invia eventi reali
<!-- AC:END -->
