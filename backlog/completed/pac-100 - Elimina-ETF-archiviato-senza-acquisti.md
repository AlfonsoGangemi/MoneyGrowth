---
id: PAC-100
title: Elimina ETF archiviato senza acquisti
status: Done
assignee: []
created_date: '2026-04-03 11:37'
updated_date: '2026-04-03 12:59'
labels:
  - ux
  - etf
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Un ETF archiviato privo di acquisti è inutile e occupa spazio nel portafoglio. L'utente deve poter eliminarlo definitivamente.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Il pulsante di eliminazione è visibile solo sugli ETF archiviati senza acquisti
- [x] #2 L'eliminazione richiede una conferma esplicita prima di procedere
- [x] #3 L'ETF viene eliminato da Supabase e rimosso dallo stato locale
- [x] #4 Se l'ETF ha acquisti (anche archiviato) il pulsante non è presente
<!-- AC:END -->
