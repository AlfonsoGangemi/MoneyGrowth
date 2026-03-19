---
id: PAC-75
title: Fix - timeout su fetch JustETF in ETFCard
status: Done
assignee: []
created_date: '2026-03-19 08:18'
updated_date: '2026-03-19 08:55'
labels:
  - bug
  - ux
  - reliability
milestone: m-0
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
La chiamata fetch al proxy JustETF in `ETFCard.jsx` non ha un timeout. Se il server è lento o irraggiungibile, la richiesta resta pendente indefinitamente, bloccando il pulsante di aggiornamento e mostrando il spinner senza risoluzione.

Usare `AbortController` con un timeout ragionevole (es. 10s).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La fetch ha un timeout di 10 secondi tramite AbortController
- [x] #2 Allo scadere del timeout viene mostrato lo stato 'error' come per gli altri errori
- [x] #3 Il cooldown parte comunque al termine della richiesta (timeout incluso)
<!-- AC:END -->
