---
id: PAC-40
title: 'Improve: label asse Y del grafico portafoglio dentro il grafico su mobile'
status: Done
assignee: []
created_date: '2026-03-13 17:27'
updated_date: '2026-03-13 17:47'
labels:
  - ui
  - mobile
  - improve
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Le label dell'asse Y (`€0`, `€2000`, ...) occupano spazio orizzontale prezioso su mobile, rendendo il grafico stretto. Su schermi piccoli, spostare le label dentro il grafico (`position: insideTopLeft` o simile) oppure nascondere l'asse Y e mostrare i valori come tooltip inline.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Su mobile le label asse Y non occupano spazio esterno al grafico
- [x] #2 I valori dell'asse Y rimangono leggibili (dentro il grafico o come tooltip)
- [x] #3 Su desktop il comportamento rimane invariato
<!-- AC:END -->
