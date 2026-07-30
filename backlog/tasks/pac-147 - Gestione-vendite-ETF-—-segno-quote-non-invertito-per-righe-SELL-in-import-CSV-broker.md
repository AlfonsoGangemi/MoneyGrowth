---
id: PAC-147
title: >-
  Gestione vendite ETF — segno quote non invertito per righe SELL in import CSV
  broker
status: Done
assignee: []
created_date: '2026-07-30 09:01'
updated_date: '2026-07-30 10:13'
labels:
  - bug
  - portafoglio
  - import
dependencies: []
references:
  - pac-dashboard/src/utils/csvParsers.js
  - pac-dashboard/src/hooks/useBrokerImport.js
  - pac-dashboard/src/components/Indicatori.jsx
  - pac-dashboard/src/utils/calcoli.js
  - pac-dashboard/src/hooks/usePortafoglio.js
  - pac-dashboard/src/components/Dashboard.jsx
modified_files:
  - pac-dashboard/src/utils/csvParsers.js
  - pac-dashboard/src/hooks/useBrokerImport.js
  - pac-dashboard/src/utils/csvParsers.test.js
  - pac-dashboard/src/hooks/useBrokerImport.test.js
  - pac-dashboard/src/utils/calcoli.js
  - pac-dashboard/src/utils/calcoli.test.js
  - pac-dashboard/src/components/Indicatori.jsx
  - pac-dashboard/src/hooks/usePortafoglio.js
  - pac-dashboard/src/components/Dashboard.jsx
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Le vendite di ETF sono già supportate come acquisti con importo negativo (vedi PAC-144, PAC-141), ma l'import CSV da broker (Trade Republic via `csvParsers.js#parseGenericCsv`/`detectTrMapping` e la variante legacy `useBrokerImport.js#parseTrCsv`) non applica il segno corretto alle quote per le righe di tipo SELL: `quoteFrazionate` viene letto direttamente dalla colonna `shares` del CSV, che riporta sempre un valore positivo indipendentemente dal `type` (BUY/SELL). Solo `importoInvestito` viene negato (`-amount`).

Risultato: importando una vendita da CSV, le quote vengono sommate invece che sottratte, quindi il totale quote di un ETF su quel broker non scende mai (né può arrivare a 0), rompendo tutte le aggregazioni a valle.

Serve gestire esplicitamente il caso in cui, dopo una vendita, le quote di un ETF su un singolo broker risultino pari (o prossime) a 0 — vendita totale della posizione su quel broker. Diversi punti del codice già proteggono da questo caso con il confronto esatto `if (quote === 0) continue` (es. `Indicatori.jsx:176` per "Peso per ETF", `calcoli.js:450` in `distribuzioneAssetClass`, `usePortafoglio.js:82` in `calcolaAnnoStorico`): questo confronto va rilassato a una soglia, perché somme di quote frazionate con arrotondamenti/float possono lasciare residui minimi diversi da zero anche a vendita completata. La soglia va definita come costante centralizzata (es. `QUOTE_EPSILON`) e riusata in tutti i punti interessati, invece di ripetere `=== 0` o un valore letterale in ciascun file. Vanno verificati anche gli altri punti che aggregano `quoteFrazionate` per broker (es. `ETFCard.jsx`, `Dashboard.jsx#brokerPerETF`, eventuale calcolo PMC) e servono test che coprano esplicitamente il caso "vendita totale → quote sotto soglia" end-to-end dal CSV import ai grafici/indicatori.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 In `csvParsers.js#parseGenericCsv` (mapping TR), `quoteFrazionate` viene negato quando la riga è di tipo SELL (coerente con `importoInvestito` già negato)
- [x] #2 Stessa correzione applicata in `useBrokerImport.js#parseTrCsv`
- [x] #3 Nuovo test in `csvParsers.test.js` che verifica che una riga SELL produca `quoteFrazionate` negativo e che il totale quote dell'ETF dopo BUY+SELL sia corretto (non sommato)
- [x] #4 I confronti `quote === 0` in `Indicatori.jsx:176`, `calcoli.js:450` (distribuzioneAssetClass) e `usePortafoglio.js:82` (calcolaAnnoStorico) sono sostituiti con `Math.abs(quote) < QUOTE_EPSILON`, per tollerare residui da arrotondamento float su vendita totale
- [x] #5 Verificato un caso di test end-to-end in cui la vendita azzera (o lascia un residuo sotto `QUOTE_EPSILON`) le quote di un ETF su un broker, e il grafico 'Peso per ETF' lo esclude correttamente senza errori/NaN
- [x] #6 Controllati eventuali altri punti che dividono per il totale quote per broker/ETF (es. PMC in ETFCard.jsx) per assicurare che non producano NaN/Infinity quando le quote sono sotto `QUOTE_EPSILON`
- [x] #7 Nessuna regressione sui test esistenti relativi a import BUY-only e ai calcoli di portafoglio
- [x] #8 `brokerPerETF` in `Dashboard.jsx:603` (lista broker mostrata come pallini colorati su `ETFCard`) mostra un broker solo se il totale quote di quell'ETF su quel broker è ≥ `QUOTE_EPSILON`, escludendo i broker su cui la posizione è stata venduta completamente pur avendo ancora acquisti/vendite storici registrati
- [x] #9 `QUOTE_EPSILON` (valore `0.01`) è definita una sola volta come costante condivisa (es. in `calcoli.js` o in un nuovo modulo di costanti) e importata in tutti i punti che la usano (`Indicatori.jsx`, `calcoli.js`, `usePortafoglio.js`, `Dashboard.jsx`), invece di essere ripetuta come valore letterale o confrontata con `=== 0` in ciascun file
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Corretto il segno delle quote per le righe SELL in entrambi i parser CSV (`csvParsers.js#parseGenericCsv`, `useBrokerImport.js#parseTrCsv`): `quoteFrazionate` ora eredita il segno di `importoInvestito` (coerente con il modello vendite di PAC-144), invece di essere sempre positivo come letto grezzo dalla colonna `shares`. Aggiunti test dedicati in entrambi i file di test che verificano segno negativo e totale corretto dopo BUY+BUY+SELL.

Introdotta la costante condivisa `QUOTE_EPSILON = 0.01` in `calcoli.js` e sostituiti tutti i confronti esatti `quote === 0` con `Math.abs(quote) < QUOTE_EPSILON` in `Indicatori.jsx` (grafico "Peso per ETF"), `calcoli.js#distribuzioneAssetClass` e `usePortafoglio.js#calcolaAnnoStorico`, per tollerare residui da arrotondamento float dopo una vendita totale. Aggiunti test in `calcoli.test.js` che coprono sia il caso quota esattamente 0 sia il residuo float sotto soglia.

`Dashboard.jsx#brokerPerETF` ora calcola la quota netta per broker (non più solo "esiste un acquisto") e mostra un broker sui pallini colorati di `ETFCard` solo se la quota è ≥ `QUOTE_EPSILON`, escludendo i broker su cui la posizione è stata venduta interamente.

Verificato che non esistono altri punti (es. PMC) che dividano per il totale quote in modo non protetto: l'unica altra divisione trovata (`Indicatori.jsx` calcolo `prezzoEq` per XIRR) era già guardata con `totQuote > 0 ? ... : 0`, nessuna modifica necessaria.

Suite di test completa (128 test, 6 file) verde dopo le modifiche, nessuna regressione. Lint verificato sui file toccati: nessun nuovo errore introdotto rispetto allo stato pre-esistente su main.
<!-- SECTION:FINAL_SUMMARY:END -->
