---
id: PAC-27
title: 'PAC-10: Popolamento automatico storico annuale al caricamento'
status: Done
assignee: []
created_date: '2026-03-12 15:44'
updated_date: '2026-03-12 15:51'
labels:
  - bug
  - data
dependencies: []
references:
  - pac-dashboard/src/hooks/usePortafoglio.js
  - pac-dashboard/src/components/TabellaProiezione.jsx
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problema

`portafoglio_storico_annuale` viene popolato **solo** quando l'utente salva un prezzo storico manualmente (`salvaPrezzoStorico`), tramite backfill. Se l'utente non ha mai salvato prezzi storici, la tabella rimane vuota e le righe degli anni passati (es. 2024, 2025) nella `TabellaProiezione` appaiono come "proiezione" invece di "reale".

## Trigger attuali

| Trigger | Quando scatta |
|---|---|
| `salvaPrezzoStorico` (backfill) | Solo se l'utente salva manualmente un prezzo storico |
| — | Mai al caricamento app |
| — | Mai quando si aggiunge un acquisto |

## Soluzione attesa

In `carica()` (o subito dopo), per ogni anno passato (`< annoCorrente`) che ha acquisti ma **non** ha ancora un record in `portafoglio_storico_annuale`, chiamare automaticamente `aggiornaStoricoAnnuale(anno)`.

### Logica prezzo da usare

Per ogni ETF, cercare il prezzo più recente disponibile in `etf_prezzi_storici` per quell'anno. Se non esiste nessun prezzo storico per quell'anno, usare `prezzoCorrente` come approssimazione (comportamento già presente in `aggiornaStoricoAnnuale`).

### Dove intervenire

- `usePortafoglio.js` → funzione `carica()`: dopo il `Promise.all`, calcolare gli anni mancanti e lanciare il backfill per ciascuno
- Oppure: `useEffect` separato che reagisce al primo caricamento di `stato.etf` e `stato.storicoAnnuale`

## Note

- Il backfill esistente in `salvaPrezzoStorico` rimane utile per aggiornare il valore quando arriva un prezzo più preciso
- Non ricalcolare anni già presenti in `storicoAnnuale` (evitare scritture inutili)
- Considerare anche il caso anno corrente parziale (non salvare l'anno in corso come "storico definitivo")
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Al primo caricamento, gli anni passati con acquisti ma senza record in portafoglio_storico_annuale vengono calcolati e salvati automaticamente
- [x] #2 La TabellaProiezione mostra righe 'Reale' per gli anni passati con acquisti senza che l'utente debba salvare prezzi storici manualmente
- [x] #3 Non vengono riscritti record già presenti in storicoAnnuale
- [x] #4 L'anno corrente non viene mai salvato come storico definitivo nel backfill automatico
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Estratta funzione pura `calcolaAnnoStorico(anno, etfList, prezziStorici)` a livello di modulo. In `carica()`, dopo il fetch iniziale, viene calcolato il set di anni passati con acquisti ma senza record in `storicoAnnuale` e viene eseguito un batch upsert su `portafoglio_storico_annuale`. Semplificata `aggiornaStoricoAnnuale` per usare la stessa funzione pura. L'anno corrente non viene mai incluso nel backfill.
<!-- SECTION:FINAL_SUMMARY:END -->
