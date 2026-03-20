---
id: PAC-23
title: 'Test: configurare Vitest e scrivere test con descrizioni in italiano e inglese'
status: To Do
assignee: []
created_date: '2026-03-12 07:36'
labels: []
dependencies: []
references:
  - pac-dashboard/src/utils/calcoli.js
  - pac-dashboard/package.json
  - pac-dashboard/vite.config.js
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Il progetto non ha una suite di test. Va aggiunto Vitest (compatibile con Vite) e scritti i primi test per `calcoli.js`, con descrizioni dei test in doppia lingua (italiano + inglese) tramite blocchi `describe` annidati o helper di localizzazione.

**Setup richiesto**:
1. Installare `vitest` come devDependency
2. Aggiungere script `"test": "vitest"` e `"test:run": "vitest run"` in `package.json`
3. Configurare `vite.config.js` con `test: { environment: 'jsdom' }` se necessario per componenti React

**Struttura test consigliata** (`pac-dashboard/src/utils/calcoli.test.js`):
```js
// Descrizioni doppie: IT + EN
describe('totaleInvestito / totalInvested', () => {
  it('somma tutti gli importi investiti / sums all invested amounts', () => { ... })
})

describe('valoreAttuale / currentValue', () => {
  it('calcola valore con prezzo corrente / computes value with current price', () => { ... })
})

describe('serieStorica / historicalSeries', () => { ... })
describe('serieStoricaAggregata / aggregatedHistoricalSeries', () => { ... })
```

**File da testare in priorità**:
- `pac-dashboard/src/utils/calcoli.js` — funzioni pure, ideali per unit test

**Convenzione lingua**:
- `describe`: nome funzione in formato `nomeIT / nameEN`
- `it`/`test`: descrizione in formato `"descrizione italiana / english description"`

**File coinvolti**:
- `pac-dashboard/package.json` — aggiungere dipendenza e script
- `pac-dashboard/vite.config.js` — aggiungere sezione `test`
- `pac-dashboard/src/utils/calcoli.test.js` — nuovi test
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Vitest installato e configurato nel progetto
- [ ] #2 Script 'test' e 'test:run' presenti in package.json
- [ ] #3 File calcoli.test.js creato con test per le funzioni principali di calcoli.js
- [ ] #4 Tutte le descrizioni describe/it sono in doppia lingua (IT / EN)
- [ ] #5 I test passano con 'npm run test:run'
<!-- AC:END -->
