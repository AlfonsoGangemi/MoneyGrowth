---
id: PAC-52
title: 'Feature: modalità privacy — nascondi/mostra importi monetari'
status: Done
assignee: []
created_date: '2026-03-13 21:11'
updated_date: '2026-03-13 21:35'
labels:
  - feature
  - ui
  - privacy
dependencies: []
references:
  - pac-dashboard/src/components/Dashboard.jsx
  - pac-dashboard/src/components/Indicatori.jsx
  - pac-dashboard/src/components/ETFCard.jsx
  - pac-dashboard/src/components/TabellaProiezione.jsx
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiungere una CTA (toggle) nella navbar per attivare/disattivare la modalità privacy. Quando attiva, tutti gli importi monetari (€) e percentuali sensibili vengono sostituiti con `••••`.

**Scope visivo:**
- Sezione Indicatori: tutti i valori KPI
- ETFCard: prezzoCorrente, importoFisso, investito, valore, rendimento netto, CAGR, lista acquisti
- TabellaProiezione: totale versato, valori scenari
- GraficoPortafoglio: tooltip e assi con importi

**Implementazione suggerita:**
- Stato `privacyMode` (boolean) in `Dashboard.jsx`, passato come prop o tramite context
- Funzione helper `fmtPrivacy(valore, fmt, privacyMode)` oppure uso diretto di `privacyMode ? '••••' : fmt(valore)` nei componenti
- Il toggle è un pulsante icona occhio nella navbar (accanto all'email utente)
- Lo stato non persiste al refresh (solo in memoria)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Toggle visibile nella navbar (icona occhio)
- [ ] #2 Quando attivo, tutti gli importi € e % sensibili mostrano ••••
- [ ] #3 ETFCard, Indicatori, TabellaProiezione coperti
- [ ] #4 Lo stato non persiste al refresh
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementata modalità privacy tramite stato `privacyMode` in Dashboard.jsx con toggle icona occhio nella navbar. Il prop viene propagato a Indicatori, ETFCard, TabellaProiezione e GraficoPortafoglio. Helper locale `pv(f)` in ogni componente sostituisce i valori monetari con `••••`. Le percentuali relative (ROI) restano visibili. Lo stato non persiste al refresh.
<!-- SECTION:FINAL_SUMMARY:END -->
