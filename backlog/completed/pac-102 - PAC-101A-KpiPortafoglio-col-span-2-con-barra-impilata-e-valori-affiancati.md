---
id: PAC-102
title: 'PAC-101A: KpiPortafoglio col-span-2 con barra impilata e valori affiancati'
status: Done
assignee: []
created_date: '2026-04-05 20:49'
updated_date: '2026-04-05 21:07'
labels: []
dependencies:
  - PAC-101
references:
  - src/components/Indicatori.jsx
  - src/i18n/it.js
  - src/i18n/en.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementazione A di PAC-101: card occupa col-span-2 nella griglia indicatori. Barra orizzontale impilata full-width, valori numerici affiancati sotto alle rispettive sezioni.

**Layout:**
```
Portafoglio
[████████████████████░░░░░]
€23.400              +€2.700
investito            guadagno
```

Caso negativo:
```
[████████████████░░░░░░░░░]
€21.800              -€1.600
valore attuale       perdita
```
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Sostituisce le card 'Valore portafoglio' e 'Rendimento netto' con col-span-2
- [ ] #2 Barra impilata con sezioni proporzionali ai valori
- [ ] #3 Valori numerici e label allineati sotto le rispettive sezioni della barra
- [ ] #4 Colori palette sito: blu/verde/rosso come da piano PAC-101
- [ ] #5 Privacy mode oscura i valori monetari
- [ ] #6 Layout corretto su mobile e desktop
<!-- AC:END -->
