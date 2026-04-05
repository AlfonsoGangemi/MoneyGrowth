---
id: PAC-103
title: 'PAC-101B: KpiPortafoglio col-span-1 con valori inline e barra decorativa'
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
Implementazione B di PAC-101: card occupa col-span-1. Valori numerici inline sopra, barra orizzontale sotto come elemento decorativo/proporzionale.

**Layout:**
```
Portafoglio
€23.400 → +€2.700
[██████████████░░░░░░]
```

Caso negativo:
```
Portafoglio
€21.800 → -€1.600
[████████████░░░░░░░░]
```

I valori sono leggibili sopra la barra; la barra rinforza visivamente la proporzione senza richiedere spazio per le label sotto.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Sostituisce le card 'Valore portafoglio' e 'Rendimento netto' con col-span-1
- [x] #2 Valori numerici principali e secondari mostrati inline sopra la barra
- [x] #3 Barra orizzontale impilata proporzionale sotto i valori
- [x] #4 Colori palette sito: blu/verde/rosso come da piano PAC-101
- [x] #5 Privacy mode oscura i valori monetari
- [x] #6 Layout corretto su mobile e desktop
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Implementazione

Sostituisce le card "Valore portafoglio" e "Rendimento netto" con un nuovo componente `KpiPortafoglio` in `Indicatori.jsx`.

**Layout finale (col-span-1):**
```
Portafoglio
€26.100  (+€2.700)
[████████████████░░░░]
```
- Valore totale portafoglio in bianco/neutro (`text-slate-900 dark:text-white`)
- Guadagno/perdita tra parentesi inline, colorato (verde se positivo, rosso se negativo)
- Barra orizzontale impilata: sezione blu proporzionale all'investito (caso positivo) o al valore attuale (caso negativo), sezione verde/rossa proporzionale al guadagno/perdita
- Privacy mode oscura entrambi i valori numerici
- Nessun tooltip — tutto visibile su mobile e desktop

**Chiavi i18n aggiunte:** `kpi_portafoglio_label`, `kpi_guadagno`, `kpi_perdita`, `kpi_investito`, `kpi_valore_attuale` in `it.js` e `en.js`

**Note:** PAC-102 (variante col-span-2) scartata dopo prova visiva. PAC-101 chiuso come supertask.
<!-- SECTION:FINAL_SUMMARY:END -->
