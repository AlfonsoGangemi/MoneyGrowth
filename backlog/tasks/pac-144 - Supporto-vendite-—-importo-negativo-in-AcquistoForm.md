---
id: PAC-144
title: Supporto vendite — importo negativo in AcquistoForm
status: Done
assignee: []
created_date: '2026-05-14 11:55'
labels:
  - feature
  - portafoglio
dependencies: []
references:
  - pac-dashboard/src/components/AcquistoForm.jsx
  - pac-dashboard/src/hooks/usePortafoglio.js
  - pac-dashboard/src/utils/calcoli.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiungere supporto per le vendite di ETF tramite importo negativo nel form acquisti. Una vendita si registra esattamente come un acquisto, con importo negativo, che produce quote_frazionate negative riducendo il totale accumulato.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Il campo importo in AcquistoForm accetta valori negativi (rimosso min='0.01')
- [ ] #2 calcolaQuote mostra le quote anche per importi negativi (imp !== 0 invece di imp > 0)
- [ ] #3 Il filtro di validazione al submit accetta importoInvestito !== 0
- [ ] #4 Le funzioni di calcolo in calcoli.js (totaleQuote, totaleInvestito, valoreAttuale, calcolaROI) gestiscono correttamente quote e importi negativi senza modifiche aggiuntive
- [ ] #5 La validazione import JSON in usePortafoglio.js già accetta valori negativi (controlla === 0, non < 0)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Modifiche minime a AcquistoForm.jsx: rimosso attributo min='0.01' dall'input importo, aggiornata condizione in calcolaQuote (imp > 0 → imp !== 0) e nel filtro di validazione submit (importoInvestito > 0 → importoInvestito !== 0). Nessuna modifica necessaria al resto della pipeline (hook, calcoli, validazione JSON import).
<!-- SECTION:FINAL_SUMMARY:END -->
