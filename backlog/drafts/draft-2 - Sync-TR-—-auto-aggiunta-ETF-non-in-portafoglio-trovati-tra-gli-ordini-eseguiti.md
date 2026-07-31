---
id: DRAFT-2
title: Sync TR — auto-aggiunta ETF non in portafoglio trovati tra gli ordini eseguiti
status: Draft
assignee: []
created_date: '2026-05-04 11:14'
labels:
  - backend
  - pro
  - post-mvp
milestone: m-3
dependencies:
  - PAC-133
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Estensione post-MVP di PAC-133: quando il sync Trade Republic trova ordini eseguiti per un ISIN non ancora presente nel portafoglio PAC dell'utente, aggiungere automaticamente l'ETF invece di skippare la transazione.

## Comportamento attuale (MVP — PAC-133)
Le transazioni per ISIN sconosciuti vengono skippate e conteggiate in `skippedUnknownEtf`. L'utente vede un avviso "X transazioni ignorate per ETF non in portafoglio".

## Comportamento target (questa task)
1. Per ogni ISIN skippato, fetch dei metadati ETF da ExtraETF (o fonte già in uso nel progetto): nome, ISIN, valuta
2. Creazione automatica dell'ETF nel portafoglio dell'utente con i dati recuperati
3. Import delle transazioni skippate ora che l'ETF esiste
4. Notifica all'utente: "1 nuovo ETF aggiunto automaticamente: iShares Core MSCI World (IE00B4L5Y983)"

## Domande aperte da risolvere prima di iniziare
- Quale fonte dati usare per i metadati del nuovo ETF? (ExtraETF già integrato?)
- L'ETF aggiunto automaticamente deve avere un piano PAC configurato o basta la lista transazioni?
- Cosa fare se i metadati dell'ISIN non vengono trovati? (skip con avviso manuale)

## Note
- Demandata a post-MVP per non bloccare il rilascio del sync base
- Il contatore `skippedUnknownEtf` in PAC-133 è il punto di aggancio per questa funzionalità
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 ETF non in portafoglio trovati nel sync TR vengono aggiunti automaticamente
- [ ] #2 Metadati ETF (nome, ISIN, valuta) recuperati da fonte esterna
- [ ] #3 Transazioni precedentemente skippate vengono importate dopo l'aggiunta
- [ ] #4 Notifica all'utente per ogni nuovo ETF aggiunto
- [ ] #5 Fallback gestito se metadati ISIN non disponibili (avviso manuale)
<!-- AC:END -->
