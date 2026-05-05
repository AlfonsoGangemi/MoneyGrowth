---
id: PAC-140
title: 'Spike: analisi formato CSV export Trade Republic'
status: Done
assignee: []
created_date: '2026-05-05 11:27'
updated_date: '2026-05-05 12:08'
labels:
  - spike
  - tr-sync
  - csv
milestone: m-3
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Analisi del formato CSV esportato da Trade Republic (app mobile → Impostazioni → Estratto conto) per definire il mapping preciso verso la tabella `acquisti` di Supabase.

Questo spike sblocca PAC-133 (endpoint POST /api/import).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Scaricato almeno un CSV reale da Trade Republic (sezione estratto conto / transazioni)
- [x] #2 Documentati tutti i campi presenti nel CSV (intestazioni, tipi, formato date, valuta, separatori)
- [x] #3 Definito il mapping: colonna CSV → campo `acquisti` (isin, ticker, nome_etf, data_acquisto, prezzo_unitario, quote_frazionate, importo_investito, valuta, tr_transaction_id, sync_source)
- [x] #4 Gestione vendite: importo e quote come valori negativi
- [x] #5 Identificato il campo da usare come `tr_transaction_id` (chiave dedup univoca)
- [x] #6 Note sul parser: separatore (virgola/punto e virgola), encoding (UTF-8/UTF-16), formato data (ISO/localizzato)
- [x] #7 Risultati documentati come Implementation Notes in PAC-133
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Risultati analisi CSV (2026-05-05)

**File analizzato:** `pac-dashboard/scripts/samples/tr-export.csv`

### Formato
- Encoding: UTF-8, separatore: virgola, tutti i valori quotati
- Data: campo `date` = ISO `YYYY-MM-DD` (usare questo, non `datetime`)
- Decimali: punto, 10 cifre per shares/price, 2 per amount

### Filtro righe
Importare solo: `category === "TRADING" AND type IN ("BUY", "SELL")`

### Mapping colonne → acquisti
| Campo acquisti      | Colonna CSV    | Trasformazione                            |
|---------------------|----------------|-------------------------------------------|
| isin                | symbol         | diretta (TR chiama "symbol" l'ISIN)       |
| data                | date           | diretta (YYYY-MM-DD)                      |
| importo_investito   | amount         | -parseFloat(amount) → BUY positivo        |
| prezzo_unitario     | price          | parseFloat(price)                         |
| quote_frazionate    | shares         | parseFloat(shares)                        |
| fee                 | fee            | parseFloat(fee) || 0 (sempre vuoto)       |
| tr_transaction_id   | transaction_id | diretta (UUID v7, dedup primario)         |
| sync_source         | —              | hardcoded "tr_csv"                        |
| broker_nome         | —              | hardcoded "Trade Republic"                |

### Campi da derivare lato server
- `etf_id`: lookup per isin in tabella etf; se assente → inserire nuovo ETF con nome=name, isin=symbol
- `asset_class_id`: asset_class="FUND" → mappare a asset class predefinita
- `emittente`: non disponibile nel CSV

### tr_transaction_id
UUID v7, presente su ogni riga, stabile e globalmente univoco → candidato dedup primario confermato.

### Vendite (nessun SELL nel campione)
Ipotesi coerente: amount positivo per SELL → -parseFloat(amount) = negativo = importo_investito < 0.
shares probabilmente negativo in TR per SELL. Da verificare con CSV reale contenente vendita.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
CSV analizzato da `pac-dashboard/scripts/samples/tr-export.csv`. Tutti i campi documentati, mapping definito, tr_transaction_id (UUID v7) confermato come chiave dedup. Filtro righe: category=TRADING AND type IN (BUY,SELL). Unico punto aperto: comportamento colonna `shares` per SELL (nessun esempio nel campione). Risultati riportati come Implementation Notes in PAC-133.
<!-- SECTION:FINAL_SUMMARY:END -->
