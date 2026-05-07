---
id: PAC-133
title: Endpoint POST /api/import — merge incrementale acquisti in formato backup
status: Done
assignee: []
created_date: '2026-05-02 14:10'
updated_date: '2026-05-07 18:02'
labels:
  - api
  - csv
  - import
  - tr-sync
milestone: m-4
dependencies:
  - PAC-131
references:
  - 'https://github.com/cdamken/Trade_Republic_Connector'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementare due endpoint Vercel serverless per l'import CSV da broker, usando il **formato JSON del backup esistente** come payload. Questo evita di definire uno schema custom e riusa la struttura già nota dall'export/import UI.

## 1. `GET /api/import/check` — verifica PRO (leggero)
Legge `config.is_pro` → `{ allowed: true/false }`.

## 2. `POST /api/import` — merge incrementale (principale)

### Formato payload
Il client invia un JSON **nel formato backup esistente** (`etf-backup-*.json`), limitato agli ETF/acquisti del broker. Il campo `tr_transaction_id` è opzionale in ogni acquisto e viene usato come chiave di dedup.

```json
{
  "broker": [{ "nome": "Trade Republic", "colore": "#ffa500" }],
  "etf": [
    {
      "nome": "Core Stoxx Europe 600 UCITS ETF (Acc)",
      "isin": "LU0908500753",
      "emittente": "Amundi",
      "importoFisso": 0,
      "prezzoCorrente": 296.875,
      "archiviato": false,
      "assetClassNome": "Azioni",
      "acquisti": [
        {
          "data": "2026-04-16",
          "importoInvestito": 100,
          "prezzoUnitario": 300.8,
          "quoteFrazionate": 0.3324,
          "fee": 0,
          "brokerNome": "Trade Republic",
          "tr_transaction_id": "TR-abc123"
        }
      ]
    }
  ]
}
```

### Logica server-side (merge, NON delete+replace)
1. Verifica Bearer token → `auth.getUser(token)` → `user_id`
2. Verifica `config.is_pro = true` per l'utente (403 se FREE)
3. Per ogni `broker` nel payload: upsert in `broker` (ON CONFLICT nome DO NOTHING)
4. Per ogni `etf` nel payload: upsert in `etf` per `(user_id, isin)` — aggiorna solo `nome`, `emittente`; NON tocca `importo_fisso`, `prezzo_corrente`, `archiviato`
5. Per ogni `acquisto`: INSERT in `acquisti` con:
   - dedup primario: `ON CONFLICT (tr_transaction_id) DO NOTHING` se `tr_transaction_id` presente
   - dedup fallback: `ON CONFLICT (etf_id, data, importo_investito) DO NOTHING`
   - `sync_source` = valore passato nell'header o nel payload (es. `'ui_upload'`, `'telegram_bot'`)
6. Scrive riga in `broker_sync_log`
7. Risponde `{ inserted, skipped, total }`

### Vendite
`importoInvestito` e `quoteFrazionate` negativi sono validi — nessuna validazione che richieda valori positivi.

### Note
- Entrambi gli endpoint in `api/import.ts` (routing per metodo HTTP) → 1 sola funzione Vercel
- Il mapping preciso CSV TR → formato backup è documentato nelle implementation notes
- Usato sia dall'upload UI (m-4) che dal bot Telegram (m-3) come chiamante
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GET /api/import risponde { allowed: true/false } in base a config.is_pro
- [x] #2 GET /api/import risponde 401 se Bearer token non valido
- [x] #3 POST /api/import accetta payload nel formato backup esistente (etf[], broker[], acquisti con tr_transaction_id opzionale)
- [x] #4 POST /api/import verifica PRO server-side indipendentemente dal check del bot (403 se FREE)
- [x] #5 Upsert ETF per (user_id, isin): non sovrascrive importo_fisso, prezzo_corrente, archiviato
- [x] #6 Dedup acquisti: ON CONFLICT (tr_transaction_id) se presente, altrimenti (etf_id, data, importo_investito)
- [x] #7 Vendite accettate: importoInvestito e quoteFrazionate negativi non generano errore di validazione
- [x] #8 sync_source letto dal campo payload (opzionale, default 'ui_upload'); il caller è responsabile del valore corretto
- [x] #9 Aggiorna broker_sync_log con rows_total, rows_inserted, rows_skipped (anche in caso di errore parziale)
- [x] #10 Risponde { inserted, skipped, total } in JSON
- [x] #11 Entrambi gli endpoint in api/import.js (routing per metodo HTTP) — 1 funzione Vercel
- [x] #12 ETF con archiviato=true: gli acquisti relativi vengono saltati (conteggiati in rows_skipped), l'ETF stesso non viene toccato
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
["1. Completare PAC-140 (spike CSV) per il mapping preciso TR → formato backup", "2. Aggiungere UNIQUE constraint composito (etf_id, data, importo_investito) su acquisti come fallback dedup (migration Supabase)", "3. Implementare api/import.ts: GET /check + POST /import con routing per metodo", "4. Portare server-side la logica broker-upsert e asset_class-lookup da usePortafoglio.js:669-688", "5. Implementare merge acquisti con doppio ON CONFLICT", "6. Scrittura broker_sync_log", "7. Test con payload reale dal bot"]
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Mapping CSV Trade Republic → formato backup (da PAC-140, 2026-05-05)

**File di riferimento:** `pac-dashboard/scripts/samples/tr-export.csv`

### Formato CSV
- Encoding: UTF-8, separatore: `,`, tutti i valori quotati
- Campo data da usare: `date` (ISO `YYYY-MM-DD`) — ignorare `datetime`
- Decimali: punto (`.`), 10 cifre per shares/price

### Filtro righe
```
category === "TRADING" AND type IN ("BUY", "SELL")
```
Ignorare: TRANSFER_INSTANT_INBOUND, TAX_OPTIMIZATION, qualsiasi CASH row.

### Mapping colonne CSV → campo acquisti/payload backup
| Campo acquisti (backup) | Colonna CSV    | Trasformazione                                   |
|-------------------------|----------------|--------------------------------------------------|
| `data`                  | `date`         | diretta (`YYYY-MM-DD`)                           |
| `importoInvestito`      | `amount`       | `-parseFloat(amount)` — BUY: amount è negativo  |
| `prezzoUnitario`        | `price`        | `parseFloat(price)`                              |
| `quoteFrazionate`       | `shares`       | `parseFloat(shares)`                             |
| `fee`                   | `fee`          | `parseFloat(fee) || 0` (sempre vuoto su TR)      |
| `tr_transaction_id`     | `transaction_id` | diretta (UUID v7, dedup primario)              |
| `brokerNome`            | —              | hardcoded `"Trade Republic"`                     |

### Campi ETF da CSV
| Campo ETF (backup) | Colonna CSV | Note                                          |
|--------------------|-------------|-----------------------------------------------|
| `isin`             | `symbol`    | TR chiama "symbol" quello che è l'ISIN        |
| `nome`             | `name`      | nome breve (es. "Core Stoxx Europe 600 EUR (Acc)") |
| `emittente`        | —           | non disponibile nel CSV, lasciare vuoto       |
| `assetClassNome`   | `asset_class` | `"FUND"` → mappare a asset class predefinita |

### tr_transaction_id
UUID v7 — stabile e globalmente univoco per ogni riga TR → chiave dedup primaria confermata.

### Gestione vendite
- BUY: `amount` negativo → `-parseFloat(amount)` = `importoInvestito` positivo
- SELL atteso: `amount` positivo → `-parseFloat(amount)` = `importoInvestito` negativo ✓
- `shares` per SELL: probabilmente negativo in TR → `parseFloat(shares)` già negativo ✓
- (Nessun esempio SELL nel campione — da verificare al primo CSV con vendita)

### Logica ETF upsert lato server
1. Cercare ETF per `(user_id, isin)` nella tabella `etf`
2. Se non esiste: INSERT con `nome`, `isin`, `emittente=null`, `importoFisso=0`, `archiviato=false`
3. Se esiste: NON sovrascrivere `importo_fisso`, `prezzo_corrente`, `archiviato`
4. Per `asset_class_id`: lookup per `nome` in `asset_classes`; se FUND senza match → usare prima asset class disponibile o null

## Enrichment righe manuali (2026-05-07)

### Problema
L'indice parziale `acquisti_dedup_fallback (etf_id, data, importo_investito) WHERE tr_transaction_id IS NULL` non previene duplicati quando una riga CSV (con `tr_transaction_id IS NOT NULL`) corrisponde a una riga inserita manualmente (con `tr_transaction_id IS NULL`): le due righe hanno predicati diversi — il conflitto non scatta.

### Soluzione: UPDATE-before-INSERT
Prima di ogni INSERT di una riga CSV **con `tr_transaction_id`**, cercare una riga manuale corrispondente:

```js
// Per ogni acquisto con tr_transaction_id presente:
if (acquisto.tr_transaction_id) {
  const { data: existing } = await supabase
    .from('acquisti')
    .select('id')
    .eq('etf_id', etfId)
    .eq('data', acquisto.data)
    .eq('importo_investito', acquisto.importoInvestito)
    .is('tr_transaction_id', null)
    .maybeSingle()

  if (existing) {
    // Enrich: collega la riga manuale al transaction ID reale
    await supabase
      .from('acquisti')
      .update({
        tr_transaction_id: acquisto.tr_transaction_id,
        sync_source: syncSource, // es. 'ui_upload' o 'telegram_bot'
      })
      .eq('id', existing.id)
    skipped++
    continue // non inserire duplicato
  }
}
// Altrimenti: INSERT con ON CONFLICT (tr_transaction_id) DO NOTHING
```

### Comportamento risultante
- Riga manuale già esistente → viene arricchita con `tr_transaction_id` (nessun duplicato)
- Import successivo della stessa riga CSV → `ON CONFLICT (tr_transaction_id) DO NOTHING` (idempotente)
- `rows_skipped` viene incrementato in entrambi i casi: la riga non è stata inserita ex-novo

## Comportamento ETF archiviato (2026-05-07)

Se un ETF esiste già nel DB con `archiviato = true`, i suoi acquisti **non vengono importati**:
- L'upsert ETF avviene normalmente (aggiorna `nome`, `emittente`)
- Dopo l'upsert, recuperare `archiviato` dalla riga risultante
- Se `archiviato = true`: saltare tutti gli acquisti di quell'ETF, aggiungerli a `rows_skipped`
- Non viene restituito errore: l'utente ha archiviato l'ETF intenzionalmente

```js
const { data: etfRow } = await supabase
  .from('etf')
  .upsert({ user_id, isin, nome, emittente }, { onConflict: 'user_id,isin', ignoreDuplicates: false })
  .select('id, archiviato')
  .single()

if (etfRow.archiviato) {
  skipped += etfPayload.acquisti.length
  continue // salta tutti gli acquisti di questo ETF
}
```
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementato `api/import.js` con routing GET/POST su un'unica funzione Vercel. GET restituisce `{ allowed }` da `config.is_pro`. POST esegue merge incrementale: verifica PRO (403 se FREE), upsert broker, SELECT+UPDATE/INSERT ETF (non tocca importo_fisso/prezzo_corrente/archiviato), enrichment righe manuali (UPDATE-before-INSERT se tr_transaction_id presente), dedup via unique violation (23505), skip silenziosi per ETF archiviati. sync_source dal payload (default 'ui_upload'). broker_sync_log scritto sempre, anche in caso di errore parziale. Logiche bot-specifiche (sync_source='telegram_bot') spostate in PAC-137.
<!-- SECTION:FINAL_SUMMARY:END -->
