---
id: PAC-71
title: >-
  Feature - doppia lingua (IT/EN) per pagine Privacy Policy e Termini di
  Servizio
status: Done
assignee: []
created_date: '2026-03-19 08:00'
updated_date: '2026-03-19 12:27'
labels:
  - i18n
  - ui
  - legal
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Le pagine Privacy Policy (`Privacy.jsx`) e Termini di Servizio (`Termini.jsx`) sono attualmente solo in italiano. Aggiungere supporto multilingua IT/EN coerente con il sistema i18n già presente nel resto dell'app (`useLocale`, `i18n/it.js`, `i18n/en.js`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La pagina Privacy si aggiorna automaticamente quando l'utente cambia lingua tramite LinguaToggle
- [x] #2 La pagina Termini si aggiorna automaticamente quando l'utente cambia lingua tramite LinguaToggle
- [x] #3 I testi EN sono tradotti correttamente (non solo traduzione automatica)
- [x] #4 Il LinguaToggle è visibile e funzionante anche sulle pagine /privacy e /termini
- [x] #5 Le chiavi di traduzione sono aggiunte a i18n/it.js e i18n/en.js (o i testi sono gestiti come oggetti locali nei componenti)
- [x] #6 Nessuna regressione sulla Dashboard e LandingPage
<!-- AC:END -->
