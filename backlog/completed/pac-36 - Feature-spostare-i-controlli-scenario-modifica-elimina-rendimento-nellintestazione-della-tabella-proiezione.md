---
id: PAC-36
title: >-
  Feature: spostare i controlli scenario (modifica/elimina rendimento)
  nell'intestazione della tabella proiezione
status: Done
assignee: []
created_date: '2026-03-13 16:49'
updated_date: '2026-03-13 16:52'
labels:
  - ui
  - refactor
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Attualmente i chip scenario con i controlli di modifica/eliminazione si trovano nell'intestazione separata sopra la tabella proiezione. L'obiettivo è integrarli direttamente nell'intestazione `<thead>` della tabella stessa, in modo che ogni colonna scenario abbia i controlli inline nel proprio header.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Ogni intestazione di colonna scenario nella tabella proiezione contiene il nome del scenario, il rendimento (cliccabile per modifica), e il pulsante elimina con conferma
- [x] #2 L'intestazione separata con i chip scenario viene rimossa
- [x] #3 Il pulsante '+ Scenario' viene spostato in un posto coerente (es. accanto al titolo 'Proiezione' o sotto la tabella)
- [x] #4 Il comportamento di modifica rendimento (inline input) e cancellazione con conferma rimane invariato
- [x] #5 Su mobile la navigazione tra scenari funziona ancora correttamente
<!-- AC:END -->
