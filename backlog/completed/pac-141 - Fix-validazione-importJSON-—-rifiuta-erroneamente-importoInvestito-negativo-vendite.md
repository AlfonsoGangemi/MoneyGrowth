---
id: PAC-141
title: >-
  Fix validazione importJSON — rifiuta erroneamente importoInvestito negativo
  (vendite)
status: Done
assignee: []
created_date: '2026-05-05 11:47'
updated_date: '2026-05-05 11:55'
labels:
  - bug
  - import
  - vendite
milestone: m-3
dependencies: []
references:
  - pac-dashboard/src/hooks/usePortafoglio.js#L656
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Bug nella funzione `importJSON` in [usePortafoglio.js](pac-dashboard/src/hooks/usePortafoglio.js): la validazione alla riga 656 rigetta qualsiasi acquisto con `importoInvestito <= 0`, ma le vendite sono rappresentate con valori negativi nel formato backup.

## Comportamento attuale
```js
// riga 656
if (!Number.isFinite(Number(a.importoInvestito)) || Number(a.importoInvestito) <= 0)
  throw errAtteso(`ETF "${etf.nome}": importoInvestito non valido`)
// riga 660
if (!Number.isFinite(Number(a.quoteFrazionate)) || Number(a.quoteFrazionate) < 0)
  throw errAtteso(`ETF "${etf.nome}": quoteFrazionate non valido`)
```

## Problema
Un backup che contiene una vendita (es. `importoInvestito: -1722.1, quoteFrazionate: -17`) non può essere reimportato — la validazione lo blocca con errore anche se il file è stato generato dall'app stessa tramite `exportJSON`.

Esempio dal backup reale: ETF `IE00B3XXRP09` ha un acquisto con `importoInvestito: -1722.1`.

## Fix
Permettere valori negativi per le vendite, mantenendo il check su `NaN` e `0`:

```js
// importoInvestito: ≠ 0, finito (può essere negativo per vendite)
if (!Number.isFinite(Number(a.importoInvestito)) || Number(a.importoInvestito) === 0)
  throw errAtteso(`ETF "${etf.nome}": importoInvestito non valido`)

// quoteFrazionate: può essere negativo per vendite
if (!Number.isFinite(Number(a.quoteFrazionate)) || Number(a.quoteFrazionate) === 0)
  throw errAtteso(`ETF "${etf.nome}": quoteFrazionate non valido`)
```

Verificare anche che il blocco INSERT acquisti su Supabase (riga 738) accetti valori negativi — nessun CHECK constraint lato DB dovrebbe bloccarli.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 importJSON accetta acquisti con importoInvestito < 0 (vendite)
- [ ] #2 importJSON accetta acquisti con quoteFrazionate < 0 (vendite)
- [ ] #3 importJSON continua a rifiutare importoInvestito = 0 o NaN
- [ ] #4 importJSON continua a rifiutare quoteFrazionate = NaN
- [ ] #5 Il backup con ETF IE00B3XXRP09 e vendita -1722.1 viene importato senza errori
- [ ] #6 Nessun CHECK constraint su acquisti in Supabase blocca valori negativi (verificare migration)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fix applicato in `pac-dashboard/src/hooks/usePortafoglio.js` righe 656 e 660:
- `importoInvestito`: condizione cambiata da `<= 0` a `=== 0` → ora accetta valori negativi (vendite)
- `quoteFrazionate`: condizione cambiata da `< 0` a `=== 0` → ora accetta valori negativi (vendite)
Il bug bloccava il ripristino di qualsiasi backup contenente transazioni di vendita.
<!-- SECTION:FINAL_SUMMARY:END -->
