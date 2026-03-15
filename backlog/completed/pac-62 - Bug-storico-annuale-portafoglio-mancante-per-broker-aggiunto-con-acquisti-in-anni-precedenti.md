---
id: PAC-62
title: >-
  Bug: storico annuale portafoglio mancante per broker aggiunto con acquisti in
  anni precedenti
status: Done
assignee: []
created_date: '2026-03-14 17:51'
updated_date: '2026-03-15 10:08'
labels:
  - bug
  - broker
  - storico
milestone: m-0
dependencies: []
references:
  - pac-dashboard/src/hooks/usePortafoglio.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Quando si aggiunge un nuovo broker e gli si assegnano acquisti con date in anni passati, il record `portafoglio_storico_annuale` per quel broker non viene creato correttamente.

## Comportamento atteso
Il grafico e la tabella storica mostrano il valore del portafoglio per ogni anno in cui ci sono acquisti, per tutti i broker attivi.

## Comportamento osservato
Dopo l'aggiunta di un broker con acquisti in anni precedenti, il totale storico per quel broker è assente (nessun record in `portafoglio_storico_annuale`).

## Causa probabile
Il backfill dello storico annuale viene eseguito al caricamento iniziale in `caricaDati()` solo per le coppie `(anno, brokerId)` non ancora presenti in `portafoglio_storico_annuale`. Se il broker è nuovo, i suoi record non esistono ancora nel DB, ma il backfill potrebbe non intercettare correttamente le nuove coppie oppure il broker_id non è ancora disponibile al momento del calcolo.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Aggiungendo un broker e associandogli acquisti in anni precedenti, al successivo caricamento i record storico annuale per quel broker sono presenti
- [ ] #2 Il grafico e la tabella proiezione mostrano correttamente il valore storico per il nuovo broker
- [ ] #3 Il backfill viene rieseguito correttamente dopo aggiunta/modifica broker
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Aggiunto calcolo immediato dello storico annuale per anni passati dentro `aggiungiAcquistiMultipli`. Ora dopo l'inserimento di acquisti con date passate, lo stato `storicoPerBroker` viene aggiornato nella stessa chiamata `setStato` senza attendere il reload della pagina. Fire-and-forget upsert su DB per sincronizzazione asincrona.
<!-- SECTION:FINAL_SUMMARY:END -->
