---
id: PAC-101
title: Unifica card "Valore portafoglio" e "Rendimento netto" negli indicatori
status: Done
assignee: []
created_date: '2026-04-03 17:16'
updated_date: '2026-04-05 21:07'
labels: []
dependencies: []
references:
  - src/components/Indicatori.jsx
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nella sezione indicatori portafoglio, sostituire le card "Valore portafoglio" e "Rendimento netto" con una card unica che mostra una **barra orizzontale impilata** con i valori in gioco.

**Caso positivo (netto ≥ 0):**
```
[████████████████████░░░░░]
 investito (azzurro)  guadagno (verde)
 €23.400              +€2.700
```
La barra è larga quanto il valore totale (investito + guadagno). Le due sezioni mostrano le proporzioni visivamente.

**Caso negativo (netto < 0):**
```
[████████████████░░░░░░░░░]
 valore attuale (az.)  perdita (rosso)
 €21.800               -€1.600
```
La barra è larga quanto il capitale investito. La sezione rossa rappresenta la perdita.

I valori numerici sono mostrati sotto la barra, allineati alle rispettive sezioni. Nessun tooltip — tutto visibile, funziona uguale su mobile e desktop.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 La card unificata sostituisce le due card separate ('Valore portafoglio' e 'Rendimento netto')
- [ ] #2 Con rendimento positivo: barra divisa in investito (azzurro) + guadagno (verde), valori numerici sotto
- [ ] #3 Con rendimento negativo: barra divisa in valore attuale (azzurro) + perdita (rosso), valori numerici sotto
- [ ] #4 La barra mostra le proporzioni corrette tra le sezioni
- [ ] #5 Privacy mode oscura i valori numerici sotto la barra
- [ ] #6 Layout funzionante su mobile e desktop senza tooltip
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Passi di implementazione

1. **Aggiungere chiavi i18n** in `it.js` / `en.js`: `kpi_portafoglio_label`, `kpi_guadagno`, `kpi_perdita`

2. **Creare `KpiPortafoglio`** in `Indicatori.jsx`:
   - Props: `totInvestito`, `totValore`, `netto`, `privacyMode`, `pv`
   - Calcolo larghezze % delle sezioni della barra:
     - Positivo: `pctInvestito = totInvestito / totValore * 100`, `pctGuadagno = netto / totValore * 100`
     - Negativo: `pctValore = totValore / totInvestito * 100`, `pctPerdita = Math.abs(netto) / totInvestito * 100`
   - Barra: `div` flex con due sezioni colorate e `transition-all`
     - Sezione principale (investito / valore attuale): `bg-blue-500 dark:bg-blue-600`
     - Sezione guadagno: `bg-green-500 dark:bg-green-400`
     - Sezione perdita: `bg-red-500 dark:bg-red-400`
   - Sotto la barra: due colonne (flex justify-between) con label + valore numerico
     - Label e valore principale: `text-slate-500 dark:text-slate-400`
     - Valore guadagno: `text-green-600 dark:text-green-400`
     - Valore perdita: `text-red-500 dark:text-red-400`

3. **Sostituire** le due `<Kpi>` esistenti (`rendimento_netto` e `valore_portafoglio`) con `<KpiPortafoglio>`, assegnandole `col-span-2` nella griglia

4. **Chiavi i18n** da aggiungere a `it.js` e `en.js`
<!-- SECTION:PLAN:END -->
