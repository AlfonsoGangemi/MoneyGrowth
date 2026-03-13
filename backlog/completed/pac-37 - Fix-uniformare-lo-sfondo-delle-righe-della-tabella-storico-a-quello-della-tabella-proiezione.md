---
id: PAC-37
title: >-
  Fix: uniformare lo sfondo delle righe della tabella storico a quello della
  tabella proiezione
status: Done
assignee: []
created_date: '2026-03-13 16:59'
updated_date: '2026-03-13 19:16'
labels:
  - ui
  - fix
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Le righe della tabella storico hanno sfondo `bg-emerald-950/30` con bordo sinistro `border-l-emerald-700`, mentre le righe della tabella proiezione usano `hover:bg-slate-800/60` senza sfondo fisso. Lo stile visivo deve essere coerente tra le due tabelle.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Le righe della tabella storico hanno lo stesso sfondo delle righe della tabella proiezione
- [ ] #2 Il bordo sinistro verde (border-l-emerald-700) della tabella storico viene rimosso
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Rimosso `bg-emerald-950/30` e `border-l-2 border-l-emerald-700` dalle righe della tabella storico. Sostituito con `transition-colors hover:bg-slate-800/60`, identico alle righe della tabella proiezione.
<!-- SECTION:FINAL_SUMMARY:END -->
