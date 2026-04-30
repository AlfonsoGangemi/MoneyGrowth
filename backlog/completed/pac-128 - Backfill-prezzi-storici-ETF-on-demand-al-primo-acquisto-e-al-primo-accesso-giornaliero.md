---
id: PAC-128
title: >-
  Backfill prezzi storici ETF on-demand: al primo acquisto e al primo accesso
  giornaliero
status: Done
assignee: []
created_date: '2026-04-30 07:19'
updated_date: '2026-04-30 10:27'
labels:
  - prezzi
  - etf
  - storicizzazione
  - performance
dependencies:
  - PAC-111
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Obiettivo

Implementare un meccanismo di backfill on-demand dei prezzi storici mensili per ogni ETF attivo, attivato in due momenti:

1. **Inserimento acquisto** — quando si inserisce un acquisto per un ISIN, storicizzare tutti i mesi dal giorno dell'acquisto ad oggi per cui non esiste ancora un record in `etf_prezzi_storici`
2. **Primo accesso del giorno** — al caricamento pagina, per ogni ISIN attivo (non archiviato), eseguire il backfill se non già fatto oggi (controllo via localStorage)

---

## Design

### Prezzo mensile
Il prezzo da storiciizzare per ogni mese è il **prezzo dell'ultimo giorno di borsa aperta del mese** (ultimo record disponibile nel range mensile restituito dall'API ExtraETF).

### Endpoint ExtraETF
```
https://quotes.extraetf.com/v1/chart?isin={ISIN}&currency=EUR&ordering=-date&date_from={YYYY-MM-DD}&date_to={YYYY-MM-DD}&interval=1d&extraetf_locale=it
```

### Funzione `backfillETFPrices(isin, dateFrom, forceRefresh?)`

1. Se l'ETF è archiviato → skip
2. Se `forceRefresh !== true`: controlla `localStorage["backfill_last_{isin}"]` — se è uguale alla data odierna → skip
3. Query `etf_prezzi_storici` per l'ISIN → ottieni tutti i `(anno, mese)` già presenti con `data >= dateFrom`
4. Calcola i mesi attesi: da `dateFrom` al mese corrente incluso
5. Identifica i mesi mancanti + il mese corrente (sempre da aggiornare perché il prezzo cambia ogni giorno)
6. Se non ci sono mesi da riempire → aggiorna solo localStorage e termina
7. **Una sola chiamata API**: `date_from = inizio_mese_più_vecchio_mancante`, `date_to = oggi`
8. Raggruppa i risultati per `(anno, mese)` → prendi il prezzo con la data più alta del mese (ultimo giorno di borsa)
9. Upsert su `etf_prezzi_storici` solo i mesi mancanti + il mese corrente
10. Aggiorna `localStorage["backfill_last_{isin}"] = today`

### Buchi e mesi senza dati
Se l'API non restituisce dati per un mese (es. mese interamente festivo), il buco viene **lasciato invariato** — nessuna scrittura per quel mese.

### Trigger al caricamento pagina
Dopo che `usePortafoglio` ha caricato il portafoglio:
- Per ogni ISIN attivo (non archiviato), trova la data del primo acquisto
- Chiama `backfillETFPrices(isin, dataFirstAcquisto)` — il controllo localStorage interno evita call ridondanti nella stessa giornata

### Trigger dopo `aggiungiAcquisto`
- Dopo il salvataggio dell'acquisto, chiama `backfillETFPrices(isin, dataAcquisto, forceRefresh: true)` per quel solo ISIN
- `forceRefresh: true` bypassa il controllo localStorage (potrebbe essere lo stesso giorno di un precedente backfill ma con una data acquisto più vecchia)

---

## Schema DB coinvolto

Tabella `etf_prezzi_storici` — chiave unica `(isin, anno, mese)`:
```sql
INSERT INTO etf_prezzi_storici (isin, anno, mese, prezzo)
VALUES (...)
ON CONFLICT (isin, anno, mese) DO UPDATE SET prezzo = EXCLUDED.prezzo
```

---

## File da modificare

- `src/hooks/usePortafoglio.js` — aggiungere `backfillETFPrices`, chiamarla in init e in `aggiungiAcquisto`
- Valutare se estrarre in `src/utils/backfillPrezzi.js` se la funzione diventa lunga

---

## Note
- Non toccare il flusso esistente `salvaPrezzoStorico` (usato al mount per il mese corrente) — il backfill si aggiunge, non sostituisce
- ETF archiviati: skip completo
- Il proxy ExtraETF esiste già: `api/extraetf-quotes.js` — verificare se supporta `date_from`/`date_to` o se serve estenderlo
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Inserendo un acquisto per ISIN X con data D, i mesi da D a oggi vengono backfillati su etf_prezzi_storici (solo mesi mancanti)
- [x] #2 Il prezzo storicizzato per ogni mese è quello dell'ultimo giorno di borsa aperta del mese
- [x] #3 Al caricamento pagina il backfill avviene al massimo una volta al giorno per ISIN (controllo localStorage)
- [x] #4 Se i prezzi per un mese sono già presenti in DB, non viene eseguita alcuna call API per quel mese
- [x] #5 I buchi causati da mesi senza dati ExtraETF vengono lasciati invariati (nessuna scrittura)
- [x] #6 Il mese corrente viene sempre aggiornato (prezzo cambia ogni giorno)
- [x] #7 Gli ETF archiviati non vengono mai processati dal backfill
- [x] #8 Una sola call API per ISIN per backfill (range date_from → oggi, non una call per mese)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementazione completa su tre file:

- `src/utils/backfillPrezzi.js` — nuova utility `backfillETFPrices(isin, dateFrom, { forceRefresh })`: query mesi esistenti in DB, calcola mesi mancanti + mese corrente, una sola call REST ExtraETF (`/v1/chart`), raggruppa per (anno, mese) tenendo l'ultimo giorno di borsa, upsert su `etf_prezzi_storici`, deduplicazione giornaliera via localStorage.
- `api/extraetf-quotes.js` — aggiunta history mode (`handleHistory`) attivata da `?date_from=`: proxy verso `quotes.extraetf.com/v1/chart` con validazione ISIN e date.
- `src/hooks/usePortafoglio.js` — integrazione backfill: `etfRef` pattern per accesso safe allo stato in closure stale; effect init (post-caricamento, una volta al giorno per ISIN); backfill post-acquisto con `forceRefresh: true` in `aggiungiAcquistiMultipli`.

Fix applicato in chiusura: `acquisti[0].data` sostituito con `reduce` per trovare la data minima effettiva, necessario perché Supabase non garantisce ordine senza `.order('data')` esplicito.
<!-- SECTION:FINAL_SUMMARY:END -->
