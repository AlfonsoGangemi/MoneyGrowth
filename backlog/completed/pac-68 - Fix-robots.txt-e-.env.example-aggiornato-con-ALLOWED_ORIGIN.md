---
id: PAC-68
title: 'Fix: robots.txt e .env.example aggiornato con ALLOWED_ORIGIN'
status: Done
assignee: []
created_date: '2026-03-15 09:47'
updated_date: '2026-03-15 09:56'
labels:
  - fix
  - deploy
  - release
milestone: m-0
dependencies: []
references:
  - pac-dashboard/public/
  - pac-dashboard/.env.example
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Due piccole mancanze rilevate prima del deploy:

1. **robots.txt** assente in `public/` — aggiungere file base che permette l'indicizzazione della landing ma non della dashboard autenticata
2. **.env.example** incompleto — aggiungere `ALLOWED_ORIGIN` (introdotto con PAC-58) e `VITE_SENTRY_DSN` (PAC-67)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 public/robots.txt presente con regole base
- [x] #2 .env.example aggiornato con tutte le variabili d'ambiente richieste
<!-- AC:END -->
