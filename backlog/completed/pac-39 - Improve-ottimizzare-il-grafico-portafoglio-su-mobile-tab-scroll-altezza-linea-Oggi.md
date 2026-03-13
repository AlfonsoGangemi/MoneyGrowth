---
id: PAC-39
title: >-
  Improve: ottimizzare il grafico portafoglio su mobile (tab scroll, altezza,
  linea Oggi)
status: Done
assignee: []
created_date: '2026-03-13 17:27'
updated_date: '2026-03-13 17:32'
labels:
  - ui
  - mobile
  - improve
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Migliorare la visualizzazione del grafico portafoglio su mobile con tre interventi:\n\n**Tab ETF scrollabili orizzontalmente**: i chip ETF diventano scrollabili su una sola riga invece di andare a capo su più righe, liberando spazio verticale prima del grafico.\n\n**Altezza grafico ridotta su mobile**: passare a un'altezza più contenuta su schermi piccoli (es. h-48 invece di h-64) così grafico e card ETF sono visibili insieme senza troppo scroll.\n\n** Rimuovere la label "Oggi" flottante**.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 I chip ETF nel grafico sono su una singola riga scrollabile orizzontalmente su mobile, senza wrap
- [x] #2 Il grafico ha altezza ridotta su mobile rispetto a desktop
- [x] #3 La label 'Oggi' è eliminata
<!-- AC:END -->
