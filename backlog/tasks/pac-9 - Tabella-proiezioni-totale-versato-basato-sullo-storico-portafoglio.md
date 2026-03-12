---
id: PAC-9
title: 'Tabella proiezioni: totale versato basato sullo storico portafoglio'
status: Done
assignee: []
created_date: '2026-03-10 16:48'
updated_date: '2026-03-12 16:10'
labels:
  - feature
  - frontend
  - calcoli
  - proiezioni
dependencies:
  - PAC-7
  - PAC-8
  - PAC-10
references:
  - src/components/TabellaProiezione.jsx
  - src/utils/calcoli.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Il calcolo del **totale versato** nelle righe di proiezione deve partire dal valore reale persistito in `portafoglio_storico_annuale`, invece di calcolare sempre da zero (`versamentoMensile × anno × 12`).

### Logica

Sia **A** il `totale_versato` dell'anno più recente presente in `portafoglio_storico_annuale` (anno **Y**).

Per ogni anno di proiezione con `annoCalendario`:

```
n = annoCalendario - Y
totale_versato = A + (versamentoMensile × 12 × n)
```

Se non esiste nessun record in `portafoglio_storico_annuale`, si assume **A = 0** e **Y = annoCorrente - 1**, che coincide col comportamento attuale (`versamentoMensile × annoProiezione × 12`).

### Esempio

| Situazione | A | versamentoMensile | Anno proiezione | Totale versato |
|---|---|---|---|---|
| Storico presente, Y=2025 | €12.400 | €400/mese | 2026 | €12.400 + €400×12×1 = €17.200 |
| Storico presente, Y=2025 | €12.400 | €400/mese | 2027 | €12.400 + €400×12×2 = €21.800 |
| Nessuno storico | €0 | €400/mese | 2026 (anno 1) | €0 + €400×12×1 = €4.800 |

### Implementazione

Solo `TabellaProiezione.jsx` va modificato: prima del loop righe, calcolare `ultimoStorico` (record con `anno` massimo in `storicoAnnuale`) e usarlo come base per le righe di proiezione.

```js
// Fuori dal loop, prima delle righe
const ultimoStorico = storicoAnnuale.length > 0
  ? storicoAnnuale[storicoAnnuale.length - 1]
  : null
const annoBaseVersato = ultimoStorico?.anno ?? (annoCorrente - 1)
const baseVersato = ultimoStorico?.totaleVersato ?? 0

// Dentro il loop, riga proiezione (sostituisce la riga attuale)
const totaleVersato = baseVersato + versamentoMensile * 12 * (annoCalendario - annoBaseVersato)
```

> **Nota**: `idx` per la proiezione resta invariato (`annoProiezione * 12 - 1`) perché il grafico parte sempre da oggi, indipendentemente dallo storico.

### Stato dipendenze

- PAC-7 ✅ — righe reali + prop `storicoAnnuale`
- PAC-8 ✅ — tabella DB `portafoglio_storico_annuale`
- PAC-27 ✅ — backfill automatico al caricamento (era PAC-10 nel piano originale)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Le righe di proiezione calcolano il totale versato come `A + (quota_pac × 12 × n)` dove A è il `totale_versato` dell'ultimo anno in `portafoglio_storico_annuale`
- [x] #2 Se non esiste nessun record storico, A=0 e il comportamento è identico a quello attuale
- [x] #3 Le righe statistiche (anni passati, PAC-7) mostrano il `totale_versato` persistito direttamente, senza ricalcolo
- [x] #4 `usePortafoglio.js` carica `storicoAnnuale` da Supabase al mount e lo espone nello stato globale
- [x] #5 `TabellaProiezione.jsx` riceve `storicoAnnuale` come prop e lo usa per determinare il punto di partenza del calcolo
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Modificato `TabellaProiezione.jsx`: prima del loop righe, viene calcolato `ultimoStorico` (ultimo record in `storicoAnnuale`), `annoBaseVersato` e `baseVersato`. Le righe di proiezione usano `baseVersato + versamentoMensile * 12 * (annoCalendario - annoBaseVersato)` invece di `versamentoMensile * annoProiezione * 12`. Se `storicoAnnuale` è vuoto, `baseVersato=0` e `annoBaseVersato=annoCorrente-1`, comportamento identico all'attuale.
<!-- SECTION:FINAL_SUMMARY:END -->
