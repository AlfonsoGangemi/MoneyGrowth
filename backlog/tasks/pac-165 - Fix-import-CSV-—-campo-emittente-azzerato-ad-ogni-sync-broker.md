---
id: PAC-165
title: Fix import CSV — campo emittente azzerato ad ogni sync broker
status: Done
assignee: []
created_date: '2026-08-24 10:45'
updated_date: '2026-08-24 11:03'
labels:
  - bug
  - import-csv
  - api
dependencies: []
modified_files:
  - pac-dashboard/api/_lib/extraetf.js
  - pac-dashboard/api/extraetf-detail.js
  - pac-dashboard/api/import.js
  - pac-dashboard/api/__tests__/import.test.js
  - docs/architecture.md
  - docs/serverless-functions.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
L'import CSV da broker (Trade Republic, Degiro, mapping generico) sovrascrive sempre il campo `emittente` della tabella `etf` a `null`, anche quando l'ETF esiste già e aveva un `emittente` valorizzato (manualmente o via auto-compilazione ExtraETF). Inoltre, per i **nuovi** ETF creati da CSV, anche `asset_class_id` non viene mai valorizzato correttamente (nessun mapping CSV fornisce `assetClassNome`, quindi finisce sempre sull'asset class di default "Azioni").

**Causa**

1. In [pac-dashboard/src/utils/csvParsers.js](pac-dashboard/src/utils/csvParsers.js) (righe 172 e 243) e nel parser legacy TR in [pac-dashboard/src/hooks/useBrokerImport.js:171](pac-dashboard/src/hooks/useBrokerImport.js#L171), ogni entry di `etfMap` viene creata con `emittente: null` hardcoded — nessun mapping CSV (TR, Degiro, generico) estrae un valore di emittente dal file, né di asset class.
2. In [pac-dashboard/api/import.js:87-92](pac-dashboard/api/import.js#L87-L92), quando l'ETF esiste già, l'update esegue:
   ```js
   .update({ nome: etfPayload.nome, emittente: etfPayload.emittente ?? null })
   ```
   Poiché `etfPayload.emittente` arriva sempre `null` dal client, questo azzera l'`emittente` esistente ad ogni sync.
3. Per i nuovi ETF ([api/import.js:94-107](pac-dashboard/api/import.js#L94-L107)), `asset_class_id` è `acMap[etfPayload.assetClassNome] ?? defaultAcId`, ma `etfPayload.assetClassNome` non è mai popolato dal CSV → finisce sempre sul default.

Il commento a riga 77 dello stesso file indica l'intento originale di non sovrascrivere `importo_fisso`, `prezzo_corrente`, `archiviato` — `emittente` è stato dimenticato in questa lista.

**Proposta di fix**

1. Nell'update dell'ETF esistente in `api/import.js`, rimuovere `emittente` dal payload di update (o preservare il valore esistente se `etfPayload.emittente` non è fornito), analogamente a come già avviene per `importo_fisso`, `prezzo_corrente` e `archiviato`.

**Estensione: enrichment automatico da ExtraETF**

Quando un ETF (nuovo o esistente) importato da CSV ha `emittente` e/o `asset_class_id` non valorizzati, l'import server-side (`api/import.js`) deve interrogare l'API di extraetf.com (stessa logica già presente in [pac-dashboard/api/extraetf-detail.js](pac-dashboard/api/extraetf-detail.js) — endpoint `https://extraetf.com/api-v2/detail/?isin=...`) per recuperare `emittente` e `assetClassNome`, e valorizzare solo i campi effettivamente mancanti, senza mai sovrascrivere valori già presenti in DB.

Per rimanere nel limite di 12 Serverless Functions su Vercel Hobby (vedi CLAUDE.md), la logica di chiamata a ExtraETF (fetch, parsing risposta, `ASSET_CLASS_MAP`) va estratta in un helper condiviso (es. `api/_lib/extraetf.js`) riusato sia da `api/extraetf-detail.js` sia da `api/import.js`, invece di creare un nuovo endpoint o duplicare il fetch.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 L'update dell'ETF esistente in api/import.js non azzera più emittente quando il payload CSV non lo fornisce
- [x] #2 Un emittente già valorizzato (manualmente o via ExtraETF) sopravvive a un successivo import/sync CSV per lo stesso ISIN
- [x] #3 Se in futuro un mapping CSV fornisce un emittente valido, questo può comunque aggiornare il campo (comportamento non regressivo)
- [x] #4 Aggiunto/aggiornato test che copre il caso: import CSV su ETF esistente con emittente già impostato → emittente invariato dopo l'import
- [x] #5 Per ogni ETF importato (nuovo o esistente) con emittente o asset_class mancanti, il backend interroga l'API ExtraETF per recuperare i valori mancanti e valorizza solo i campi effettivamente vuoti
- [x] #6 La chiamata a ExtraETF non sovrascrive mai un emittente o asset_class già presente in DB
- [x] #7 Se ExtraETF non risponde, va in errore o non trova l'ISIN, l'import prosegue comunque (enrichment best-effort, non blocca l'inserimento di ETF/acquisti)
- [x] #8 Logica di chiamata a ExtraETF condivisa tra api/extraetf-detail.js e api/import.js tramite helper comune (es. api/_lib/extraetf.js), senza creare nuove serverless function e restando nel limite di 12 su Vercel Hobby
- [x] #9 Aggiunto/aggiornato test che copre l'enrichment automatico da ExtraETF durante import CSV di un nuovo ETF e di un ETF esistente con campi mancanti
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Estrarre `fetchExtraEtfDetail(isin)` in nuovo helper `pac-dashboard/api/_lib/extraetf.js` (fetch + ASSET_CLASS_MAP + parsing, ritorna null su errore/non trovato, mai eccezione).
2. Refactor `pac-dashboard/api/extraetf-detail.js` per usare l'helper, comportamento HTTP invariato (rate limit, validazione, status code).
3. In `pac-dashboard/api/import.js`:
   - estendere la SELECT esistente per includere anche `emittente, asset_class_id`
   - per ETF (nuovo o esistente) con emittente o asset_class_id mancanti, chiamare l'helper una sola volta, best-effort (try/catch)
   - ETF esistente: update include emittente/asset_class_id solo se erano null in DB e l'enrichment ha prodotto un valore; mai overwrite con null
   - ETF nuovo: emittente/asset_class_id valorizzati da enrichment se disponibile, altrimenti fallback ai default attuali
4. Nuovo test `pac-dashboard/api/__tests__/import.test.js` con mock supabase + fetch: emittente esistente preservato, emittente mancante arricchito, nuovo ETF arricchito, fallimento ExtraETF non blocca import.
5. Aggiornare docs/architecture.md (nuovo file api/_lib/extraetf.js) e docs/README.md se pertinente.
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
Creato api/_lib/extraetf.js: fetchExtraEtfDetail(isin) estrae fetch+parsing gia' presenti in extraetf-detail.js, ritorna { ok, data } o { ok:false, reason, status } (mai eccezione).

Refactor api/extraetf-detail.js per usare l'helper mappando i reason su 502/404 come prima (comportamento HTTP invariato, 8 test esistenti verdi).

api/import.js: la SELECT dell'ETF esistente ora include anche emittente e asset_class_id. Enrichment chiamato una sola volta per ETF, solo se emittente o asset_class_id mancanti (client-side CSV non li fornisce mai). Update/insert valorizzano emittente/asset_class_id solo se assenti, senza mai sovrascrivere un valore gia' presente.

Nuovo test api/__tests__/import.test.js (4 casi): emittente/asset_class gia' presenti -> nessuna chiamata ExtraETF; campi mancanti su ETF esistente -> arricchiti; nuovo ETF -> arricchito; fallimento rete ExtraETF -> import prosegue comunque con emittente null.

Suite completa: 147 test passati (8 file), lint pulito sui file toccati.

Aggiornati docs/architecture.md (nuova riga api/_lib/extraetf.js, nota su import.js) e docs/serverless-functions.md (punto 3 della logica di merge, descrizione assetClassNome, sezione extraetf-detail.js).
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
**Problema**: l'import CSV da broker azzerava sempre `emittente` sull'ETF esistente (`.update({ emittente: etfPayload.emittente ?? null })`, e il CSV non fornisce mai questo campo) e, per i nuovi ETF, non valorizzava mai `asset_class_id` in modo corretto (finiva sempre sul default "Azioni").

**Fix**
- `api/import.js`: la SELECT dell'ETF esistente ora include anche `emittente, asset_class_id`. L'update/insert valorizza questi campi solo quando sono effettivamente mancanti — mai più un overwrite con `null`.

**Estensione — enrichment ExtraETF**
- Nuovo helper condiviso `api/_lib/extraetf.js` (`fetchExtraEtfDetail(isin)`), estratto dalla logica già presente in `api/extraetf-detail.js`. Ritorna `{ ok: true, data }` o `{ ok: false, reason, status? }`, mai un'eccezione — nessuna nuova serverless function (limite 12 su Vercel Hobby).
- `api/extraetf-detail.js` refattorizzato per usare l'helper, comportamento HTTP identico (verificato dagli 8 test esistenti, tutti verdi).
- `api/import.js`: per ogni ETF (nuovo o esistente) con `emittente`/`asset_class_id` mancanti, viene interrogato ExtraETF una sola volta, best-effort — un fallimento (rete, 404, JSON invalido) non blocca l'import, l'ETF/i suoi acquisti vengono comunque salvati.

**Test**: nuovo `api/__tests__/import.test.js` (4 casi — campi già presenti/non toccati, ETF esistente arricchito, nuovo ETF arricchito, fallimento ExtraETF gestito). Suite completa: 147 test passati su 8 file, lint pulito.

**Docs**: aggiornati `docs/architecture.md` (nuova riga per `api/_lib/extraetf.js`) e `docs/serverless-functions.md` (logica di merge, campo `assetClassNome`, riferimento all'helper condiviso).

**Non testato manualmente**: l'endpoint reale `extraetf.com/api-v2/detail` (nessuna chiamata di rete reale eseguita — solo unit test con `fetch` mockato).
<!-- SECTION:FINAL_SUMMARY:END -->
