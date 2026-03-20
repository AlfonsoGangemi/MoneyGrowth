---
id: PAC-78
title: Test - aggiungere unit test per calcoli finanziari (calcoli.js)
status: Done
assignee: []
created_date: '2026-03-19 08:19'
updated_date: '2026-03-19 13:26'
labels:
  - test
  - reliability
milestone: m-0
dependencies: []
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Il file `utils/calcoli.js` (435 righe) contiene tutte le formule finanziarie critiche (XIRR Newton-Raphson, TWRR, ATWRR, CAGR, Max Drawdown, volatilità) ma non ha alcun test. Un errore in questi calcoli ha impatto diretto sui dati finanziari mostrati all'utente.

Aggiungere test Vitest con casi reali e casi limite.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Test per calcolaIRR/XIRR: caso normale, convergenza lenta, flussi negativi
- [ ] #2 Test per calcolaTWRR e ATWRR: sequenza acquisti multipli
- [ ] #3 Test per calcolaCAGR: durata < 1 anno, durata > 1 anno
- [ ] #4 Test per serieStoricaDaPrezziStorici: carry-forward prezzi, acquisto più recente
- [ ] #5 Test per importoInvestito e valoreAttuale con acquisti multipli
- [ ] #6 Coverage > 80% su calcoli.js
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Piano di implementazione

### Setup (prerequisiti)
Vitest non è installato. Aggiungere:
- `vitest` come devDependency
- Script `"test": "vitest run"` e `"test:coverage": "vitest run --coverage"` in package.json
- Configurare `test: { environment: 'node' }` in vite.config.js (o vitest.config.js separato)
- Nessun mock necessario: calcoli.js non ha side-effect né dipendenze browser

### File da creare
`pac-dashboard/src/utils/calcoli.test.js`

### Struttura test per funzione

#### totaleInvestito / valoreAttuale (AC#5)
- Array vuoto → 0
- Acquisto singolo con fee → importoInvestito + fee
- Acquisti multipli → somma corretta
- valoreAttuale = totaleQuote * prezzoCorrente

#### calcolaCAGR (AC#3)
- Durata < 1 mese → 0
- Durata ~12 mesi, rendimento noto → valore atteso entro tolerance
- Durata > 1 anno → esponente frazionario corretto
- inv === 0 → 0

#### calcolaTWRR / calcolaATWRR (AC#2)
- Array vuoto → 0
- Acquisto singolo: prezzo invariato → 0%, prezzo raddoppiato → 100%
- Due acquisti: verifica moltiplicazione sotto-periodi
- ATWRR: annualizzazione geometrica corretta

#### calcolaIRR / XIRR (AC#1)
- Array vuoto o valoreFinale ≤ 0 → null
- Acquisto singolo, prezzo invariato dopo 1 anno → IRR ≈ 0%
- Acquisto singolo, +10% dopo 1 anno → IRR ≈ 10%
- Più acquisti mensili con rendimento noto (caso PAC realistico)
- Flussi tutti negativi (convergenza impossibile) → null

#### serieStoricaDaPrezziStorici (AC#4)
- ETF senza acquisti → []
- ETF singolo, prezzo esatto disponibile → valore corretto
- Carry-forward: mese senza prezzo storico usa l'ultimo disponibile
- Livello 3 fallback: nessun prezzo storico → usa prezzoUnitario acquisto
- Punto "oggi" usa prezzoCorrente

#### calcolaMaxDrawdown / calcolaVolatilita (bonus, utili per coverage)
- Serie < 2 punti → null
- Serie monotona crescente → maxDrawdown = 0
- Drawdown noto → valore atteso

### Strategia date nei test
Usare `vi.setSystemTime` di Vitest per fissare "oggi" e rendere i test deterministici (calcolaDurataM, calcolaIRR usano `new Date()`).

### Coverage
Con questi test si stima >85% su calcoli.js (le uniche righe difficili da coprire sono casi limite di convergenza di Newton-Raphson già gestiti).
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Installato Vitest e @vitest/coverage-v8. Aggiunto `test` e `test:coverage` agli script di package.json. Configurato `test: { environment: 'node' }` in vite.config.js. Creato `src/utils/calcoli.test.js` con 55 test che coprono tutte le funzioni di calcolo (totaleInvestito, valoreAttuale, calcolaROI, calcolaRendimentoNetto, calcolaDurataM, calcolaCAGR, calcolaTWRR, calcolaATWRR, calcolaIRR, serieStorica, serieStoricaAggregata, serieStoricaDaPrezziStorici, calcolaMaxDrawdown, calcolaVolatilita, calcolaProiezione, indicatoriPortafoglio). Coverage finale: 97.89% statements, 100% functions, 99.46% lines.
<!-- SECTION:FINAL_SUMMARY:END -->
