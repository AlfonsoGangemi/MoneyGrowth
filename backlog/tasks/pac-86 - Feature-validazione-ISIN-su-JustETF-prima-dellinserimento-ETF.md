---
id: PAC-86
title: 'Feature: validazione ISIN su JustETF prima dell''inserimento ETF'
status: Done
assignee: []
created_date: '2026-03-23 12:09'
updated_date: '2026-03-23 12:23'
labels:
  - feature
  - validation
  - ux
dependencies: []
references:
  - 'https://www.justetf.com/it/etf-profile.html?isin=IE00BFMXXD54#panoramica'
  - pac-dashboard/api/justetf-proxy.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Prima di salvare un nuovo ETF, verificare che l'ISIN inserito esista realmente su JustETF.

## Comportamento atteso

Quando l'utente inserisce un ISIN nel form di aggiunta ETF, chiamare il proxy `/api/justetf-proxy` con l'endpoint quote e verificare che la risposta contenga dati validi.

- Se la risposta JSON contiene dati → l'ETF esiste, si procede con il salvataggio
- Se la risposta JSON è vuota (`{}` o priva di `latestQuote`) → ISIN inesistente, mostrare errore all'utente

## Dettagli tecnici

- Endpoint da usare: `api/etfs/{ISIN}/quote` tramite il proxy esistente (`/api/justetf-proxy`)
- Un ISIN inesistente restituisce HTTP 200 ma con JSON vuoto — la validazione deve controllare la presenza di `latestQuote.raw`
- Stessa logica già usata in `ETFCard.jsx` → `aggiornaPrezzoAPI()`: se `!prezzo` l'ISIN è invalido
- Non serve un proxy aggiuntivo né parsing HTML
- La validazione deve avvenire al submit del form, con stato loading/error visibile nell'UI
- Bloccare il submit finché la validazione non è completata

## UX

- Mostrare uno spinner accanto al campo ISIN durante la verifica
- In caso di ISIN non valido: messaggio inline "ISIN non trovato su JustETF"
- In caso di errore di rete: warning non bloccante (permettere comunque il salvataggio)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Inserendo un ISIN valido il form si salva normalmente
- [x] #2 Inserendo un ISIN inesistente appare un errore inline e il salvataggio è bloccato
- [x] #3 Durante la verifica è visibile uno stato di loading sul campo ISIN
- [x] #4 Un errore di rete non blocca il salvataggio (warning non bloccante)
- [x] #5 La validazione avviene via proxy (nessuna chiamata diretta a JustETF dal browser)
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Per un ISIN inesistente il proxy restituisce HTTP 200 con tutti i campi null:

```json
{ "latestQuote": null, "latestQuoteDate": null, ... }
```

La validazione deve quindi controllare `data.latestQuote === null` (non JSON vuoto).
Condizione di ISIN invalido: `!data.latestQuote || data.latestQuote.raw == null`
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementata validazione ISIN in `Dashboard.jsx` → `handleAggiungiETF` (reso async).

- Chiamata al proxy `/api/justetf-proxy` con `api/etfs/{ISIN}/quote` al submit
- ISIN non trovato: `data.latestQuote === null` → stato `not_found`, salvataggio bloccato, bordo rosso + messaggio inline
- Errore di rete: stato `network_error`, warning amber non bloccante, salvataggio procede
- Loading: spinner animato sovrapposto al campo ISIN, bottone submit disabilitato
- Reset validazione al cambio ISIN e alla chiusura modal
- Aggiunte chiavi i18n `isin_non_trovato` e `isin_verifica_errore` in `it.js` ed `en.js`
<!-- SECTION:FINAL_SUMMARY:END -->
