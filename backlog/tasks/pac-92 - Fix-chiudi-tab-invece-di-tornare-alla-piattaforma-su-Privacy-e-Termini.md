---
id: PAC-92
title: Fix - chiudi tab invece di tornare alla piattaforma su Privacy e Termini
status: Done
assignee: []
created_date: '2026-03-24 10:22'
updated_date: '2026-03-24 10:57'
labels:
  - fix
  - ux
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Le pagine `/privacy` e `/termini` hanno un link "Torna all'applicazione" che naviga a `/`. Il comportamento desiderato è che il click chiuda sempre la tab, senza mai redirigere alla piattaforma.

## Comportamento attuale

Il link usa una logica condizionale (`onclick`) che chiude la tab solo se `window.opener` è valorizzato o `window.history.length <= 1`. In tutti gli altri casi reindirizza a `/`.

## Comportamento desiderato

Il click sul link "Torna all'applicazione" chiude sempre la tab corrente (`window.close()`), senza fallback alla navigazione.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Cliccando 'Torna all'applicazione' su /privacy la tab viene sempre chiusa
- [x] #2 Cliccando 'Torna all'applicazione' su /termini la tab viene sempre chiusa
- [x] #3 Non avviene alcuna navigazione verso / o altre pagine
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rimossa la logica condizionale dal onclick. Entrambe le pagine ora chiamano sempre event.preventDefault() + window.close() senza fallback alla navigazione.
<!-- SECTION:FINAL_SUMMARY:END -->
