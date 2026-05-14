---
id: PAC-143
title: Import CSV broker — selezione colonne da header dopo upload
status: In Progress
assignee: []
created_date: '2026-05-08 14:55'
updated_date: '2026-05-12 09:06'
labels:
  - ux
  - import
  - broker
dependencies: []
references:
  - pac-dashboard/src/components/BrokerImportPanel.jsx
  - pac-dashboard/src/hooks/useBrokerImport.js
  - pac-dashboard/src/utils/csvParsers.js
  - pac-dashboard/src/utils/csvParsers.test.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Dopo che l'utente carica un file CSV nel pannello import broker, mostrare un passaggio intermedio di mappatura delle colonne prima di avviare l'import. Il mapping confermato viene persistito per broker su Supabase, così gli import successivi dallo stesso broker non richiedono una nuova configurazione.

## Contesto

Il parser attuale (`parseTrCsv` in `useBrokerImport.js`) riconosce solo il formato esatto di Trade Republic. Se l'utente carica un CSV da un altro broker o con colonne in ordine diverso, il parser restituisce `null` e l'import fallisce con il messaggio "File non riconosciuto".

## Comportamento atteso

### Primo import da un broker (nessun mapping salvato)
1. L'utente trascina o seleziona un file CSV nella drop zone di `BrokerImportPanel`
2. Il sistema legge la prima riga (header) del CSV e mostra una UI di mappatura colonne
3. Per ogni campo richiesto (data, ISIN/simbolo, importo, prezzo, quote, commissione, transaction_id) l'utente seleziona la colonna corrispondente da un `<select>` popolato con i nomi delle colonne del CSV
4. I campi obbligatori (data, ISIN, importo) sono marcati con `*`; quelli facoltativi (prezzo, quote, fee, transaction_id) hanno un'opzione "—" di default
5. Se il CSV è riconosciuto come Trade Republic, le colonne vengono pre-selezionate automaticamente (ma rimangono modificabili)
6. L'utente conferma la mappatura → parte il parse con il parser generico
7. Se il parse produce un dataset valido (anche solo righe duplicate, `inserted === 0` è accettato): il mapping viene **salvato** su `broker.csv_mapping`
8. Viene mostrato il riepilogo `{ inserted, skipped, total }`

### Import successivi dallo stesso broker (mapping già salvato)
1. L'utente carica un CSV — il mapping viene caricato da `broker.csv_mapping`
2. La UI di mappatura colonne viene **saltata**; l'import parte direttamente
3. È sempre disponibile un link "Modifica mapping" per tornare alla UI di mappatura ed aggiornarlo manualmente

### Mapping non valido (formato CSV cambiato)
- Se il parse con il mapping salvato restituisce `null` (dataset vuoto o parse fallito): il mapping salvato viene **cancellato** (`broker.csv_mapping = null`) e la UI di mappatura viene mostrata di nuovo
- Errori server (rete, 500, PRO gate) non resettano il mapping

## Schema DB

Aggiungere colonna alla tabella `broker` esistente:
```sql
ALTER TABLE broker ADD COLUMN csv_mapping JSONB DEFAULT NULL;
```

## Forma del mapping

```js
{
  date: number,       // indice colonna — obbligatorio
  isin: number,       // indice colonna — obbligatorio
  amount: number,     // indice colonna — obbligatorio
  name: number|null,
  price: number|null,
  shares: number|null,
  fee: number|null,
  txId: number|null,
  category: number|null,  // se presente filtra TRADING
  type: number|null,      // se presente filtra BUY/SELL
}
```

Quando `category` e `type` sono null → tutte le righe con ISIN valido vengono importate (broker generico). Quando sono impostati → filtro TRADING BUY/SELL come `parseTrCsv` (formato TR).

## File coinvolti

- `pac-dashboard/src/components/BrokerImportPanel.jsx` — aggiunge step di mappatura tra upload e import; carica/salva/resetta mapping
- `pac-dashboard/src/hooks/useBrokerImport.js` — `importCsvWithMapping`; operazioni CRUD su `broker.csv_mapping`
- `pac-dashboard/src/utils/csvParsers.js` — nuovo file con funzioni esportabili e testabili
- `pac-dashboard/src/i18n/it.js` e `en.js` — nuove chiavi per la UI di mappatura

## Note tecniche

- La mappatura è per-broker, non per-file: stessa colonna `csv_mapping` per tutti gli import futuri
- Il mapping viene scritto su Supabase con `UPDATE broker SET csv_mapping = $mapping WHERE id = $brokerId`
- Il reset avviene solo quando `parseGenericCsv` restituisce `null` (parse client-side fallito), mai su errori di rete o server
- `parseGenericCsv` riusa la regex ISIN (`/^[A-Z]{2}[A-Z0-9]{10}$/`) e la normalizzazione numerica esistente
- La mappatura non viene cachata in memoria oltre la sessione corrente (ricaricata ad ogni mount)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Dopo il caricamento del file CSV, se non esiste un mapping salvato, appare la UI di selezione colonne con un <select> per ciascun campo dati
- [ ] #2 Se il CSV è riconosciuto come Trade Republic, le colonne vengono pre-selezionate automaticamente (ma modificabili)
- [ ] #3 I campi obbligatori (data, ISIN, importo) sono marcati e bloccano l'import se non mappati
- [x] #4 Il parser generico produce lo stesso risultato di parseTrCsv sul CSV di Trade Republic
- [ ] #5 Il messaggio di errore 'File non riconosciuto' non compare più per CSV con header valido ma formato sconosciuto
- [ ] #6 Se il parse produce un dataset valido (anche con inserted === 0), il mapping viene salvato su broker.csv_mapping
- [ ] #7 Import successivi dallo stesso broker saltano la UI di mappatura e usano il mapping salvato
- [ ] #8 Link 'Modifica mapping' sempre disponibile per tornare alla UI di mappatura e aggiornarlo
- [ ] #9 Se il parse con il mapping salvato fallisce (null), il mapping viene cancellato su Supabase e la UI di mappatura viene mostrata di nuovo
- [ ] #10 Errori server (rete, 500, PRO gate) non resettano il mapping salvato
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Stato avanzamento

### ✅ PASSO 1 — csvParsers.js completo
- `parseGenericCsv(text, mapping)` — parser unificato TR + DEGIRO, 20 test verdi
- `readCsvHeader(text)` → `{ headers, sep }` — legge prima riga CSV, rileva separatore
- `detectTrMapping(headers)` → mapping pre-compilato per Trade Republic oppure null
- `parseCsvRow` disponibile localmente (non esportata)
- Test: `src/utils/csvParsers.test.js` — 20 test + describe per readCsvHeader e detectTrMapping

### ✅ PASSO 2 — useBrokerImport.js completo
- Importa `parseGenericCsv`, `readCsvHeader`, `detectTrMapping` da `csvParsers.js`
- `importCsvWithMapping(brokerId, csvText, mapping)` — usa parseGenericCsv + POST /api/import
- `importCsv(brokerId, csvText)` — backward compat: detectTrMapping → importCsvWithMapping
- `saveBrokerMapping(brokerId, mapping)` — UPDATE broker SET csv_mapping
- `clearBrokerMapping(brokerId)` — UPDATE broker SET csv_mapping = null
- `brokerMappings: Map<brokerId, csv_mapping>` — caricata al mount dalla tabella broker
- Test: `src/hooks/useBrokerImport.test.js` — 13 test (invariati) + 5 todo

### ⏸️ PASSO DB — STOP (eseguire manualmente su Supabase)
```sql
ALTER TABLE broker ADD COLUMN csv_mapping JSONB DEFAULT NULL;
```
Attende conferma utente prima di procedere.

---

## Passi rimanenti

### PASSO 3 — BrokerImportPanel.jsx
Step-machine: `idle → mapping → importing → done`
- Se mapping salvato: salta `mapping`, vai diretto a `importing`
- Se parse fallisce con mapping salvato: `clearBrokerMapping`, torna a `mapping`
- Componente inline `ColumnMappingUI` con `<select>` per ogni campo
- Link "Modifica mapping" sempre visibile

### PASSO 4 — i18n (it.js + en.js)
Chiavi: `broker_import_mapping_titolo`, `broker_import_mapping_conferma`, `broker_import_mapping_cambia_file`, `broker_import_mapping_modifica`, `broker_import_mapping_seleziona`, una chiave per ciascuno dei 7 campi.

---

## Mapping shape implementato

```js
{
  // Indici colonna obbligatori
  date: number, isin: number, amount: number,
  // Indici colonna opzionali
  name: number|null, price: number|null, shares: number|null,
  fee: number|null, txId: number|null,
  // Filtro su valori di colonna (es. TR: category=TRADING + type=BUY/SELL)
  filters: Array<{ col: number, includes: string[] }> | null,
  // Filtro su testo descrizione (es. DEGIRO: 'Acquisto'/'Vendita')
  descCol: number|null, descIncludes: string[]|null,
  // Righe fee separate (es. DEGIRO: 'Costi di transazione')
  feeDescIncludes: string[]|null,
  // Raggruppa per txId e unisce fee (DEGIRO: 2 righe per transazione)
  mergeByTxId: boolean,
  // Normalizzazione numeri ('.' standard, ',' europeo)
  decimalSep: '.' | ',',
  // Normalizzazione date ('iso' YYYY-MM-DD, 'dmy' DD-MM-YYYY)
  dateFormat: 'iso' | 'dmy',
  // Estrae prezzo/quote dal testo descrizione (DEGIRO)
  extractFromDesc: boolean,
}
```
<!-- SECTION:PLAN:END -->
