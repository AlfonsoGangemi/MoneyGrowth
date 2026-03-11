---
id: PAC-13
title: 'Script CLI: conversione CSV acquisti → JSON importabile (multi-broker)'
status: Done
assignee: []
created_date: '2026-03-11 07:50'
updated_date: '2026-03-11 15:03'
labels:
  - tooling
  - script
dependencies: []
references:
  - src/hooks/usePortafoglio.js
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Script Node.js standalone (`tools/csv-to-json.mjs`) che produce un file JSON compatibile con `importJSON` a partire da due CSV e un file seed (export JSON dalla dashboard).

---

## Flusso in 3 fasi

### Fase 1 — Creazione broker (manuale, già completata)
L'utente crea i broker direttamente nella dashboard, poi esporta il JSON corrente (`Export JSON`). Il file esportato contiene i broker con i loro UUID reali generati da Supabase.

### Fase 2 — CSV ETF
Crea le entry ETF nel JSON di output.

```csv
isin;nome;emittente
IE00B4L5Y983;iShares Core MSCI World;iShares
IE00B5BMR087;iShares Core S&P 500;iShares
```

| Colonna | Note |
|---|---|
| `isin` | Chiave univoca; UUID ETF generato deterministicamente dall'ISIN |
| `nome` | Nome dell'ETF |
| `emittente` | Emittente (opzionale, stringa vuota se assente) |

`importoFisso` e `prezzoCorrente` non sono nel CSV → impostati a `0` (l'utente li aggiorna dopo l'import).

### Fase 3 — CSV Acquisti
Crea gli acquisti nel JSON di output.

```csv
broker;data;isin;nome;valore;qta;fee;totale_investito
Default;15/01/2024;IE00B4L5Y983;iShares Core MSCI World;10,912;10;1,00;110,12
Degiro;15/01/2024;IE00B5BMR087;iShares Core S&P 500;35,10;4,273504;0;150,00
```

| Colonna | Formato | Note |
|---|---|---|
| `broker` | stringa | Nome del broker; risolto in UUID tramite il file seed |
| `data` | `dd/mm/yyyy` | Data acquisto |
| `isin` | stringa | Collega l'acquisto all'ETF |
| `nome` | stringa | Ignorato se l'ISIN è nel CSV ETF; usato come fallback nome |
| `valore` | numero (virgola decimale) | **Prezzo unitario** per quota (€) |
| `qta` | numero (virgola decimale) | Quote frazionate già note |
| `fee` | numero (virgola decimale) | Commissione in € (default `0` se assente o colonna mancante) |
| `totale_investito` | numero (virgola decimale) | Opzionale; usato solo per **validazione**: deve essere `≈ valore × qta + fee` (tolleranza ±0,02 €); warning se diverge |

**Formato CSV fisso:**
- Separatore colonne: `;`
- Separatore decimale: `,`
- Formato data: `dd/mm/yyyy`

**Derivazione campi JSON:**
- `prezzoUnitario` = `valore`
- `quoteFrazionate` = `qta`
- `importoInvestito` = `valore × qta` *(senza fee, come da modello dati)*
- `fee` = `fee`

---

## Utilizzo

```bash
node tools/csv-to-json.mjs \
  --seed export.json \        # export dalla dashboard (contiene broker UUID)
  --etf etf.csv \             # CSV fase 2 (facoltativo se ETF già nel seed)
  --acquisti acquisti.csv     # CSV fase 3
  --out output.json           # default: acquisti.json nella stessa cartella
```

Il file `--seed` è l'export JSON scaricato dalla dashboard dopo aver creato i broker in Fase 1. Lo script legge i broker dal seed e costruisce il mapping `nome → UUID`. Se un broker nel CSV non è trovato nel seed, lo script si ferma con errore e mostra i nomi non riconosciuti.

---

## Formato JSON di output

Rispetta esattamente la struttura attesa da `importJSON`:

```json
{
  "etf": [
    {
      "id": "<uuid-deterministico-da-isin>",
      "nome": "iShares Core MSCI World",
      "isin": "IE00B4L5Y983",
      "emittente": "iShares",
      "importoFisso": 0,
      "prezzoCorrente": 0,
      "archiviato": false,
      "acquisti": [
        {
          "id": "<uuid>",
          "data": "2024-01-15",
          "importoInvestito": 109.12,
          "prezzoUnitario": 10.912,
          "quoteFrazionate": 10,
          "fee": 1.00,
          "brokerId": "<uuid-broker>"
        }
      ]
    }
  ],
  "broker": [ ... ],
  "scenari": [],
  "orizzonteAnni": 10,
  "mostraProiezione": true
}
```

Le date vengono convertite da `dd/mm/yyyy` a `yyyy-mm-dd` nel JSON di output. Il campo `broker` viene copiato direttamente dal seed.

---

## Validazioni e messaggi

- `--seed` non fornito → **errore bloccante**
- Broker nel CSV non trovato nel seed → **errore bloccante** con elenco nomi non risolti
- ISIN nel CSV acquisti non presente nel CSV ETF e non nel seed → warning + riga saltata
- `qta = 0` o `valore = 0` → warning + riga saltata
- `totale_investito` presente e diverge da `valore × qta + fee` di più di 0,02 € → warning (riga inclusa comunque)
- Data non parsabile come `dd/mm/yyyy` → warning + riga saltata
- Più di 5 ISIN distinti → warning (limite piattaforma)

---

## Collocazione

`tools/csv-to-json.mjs` nella root del repository (fuori da `pac-dashboard/`). Nessuna dipendenza npm esterna: solo `fs`, `crypto`, `path`, `url` (Node.js native).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Lo script accetta --seed, --etf, --acquisti, --out come argomenti CLI
- [ ] #2 Il JSON prodotto è importabile tramite importJSON senza modifiche manuali
- [ ] #3 I broker UUID vengono letti dal seed; un nome broker non trovato blocca l'esecuzione con errore chiaro
- [ ] #4 Gli ETF sono raggruppati per ISIN con UUID deterministici dall'ISIN
- [ ] #5 prezzoUnitario = valore, quoteFrazionate = qta, importoInvestito = valore × qta (senza fee)
- [ ] #6 Se presente, totale_investito è usato come controllo: warning se diverge da valore×qta+fee di più di 0,02 €
- [ ] #7 Separatore colonne: ; (punto e virgola fisso)
- [ ] #8 Separatore decimale: , (virgola fissa)
- [ ] #9 Formato data input: dd/mm/yyyy; output JSON: yyyy-mm-dd
- [ ] #10 Righe non valide producono warning su stderr e vengono saltate senza bloccare l'elaborazione
- [ ] #11 Warning se il CSV contiene più di 5 ISIN distinti
- [ ] #12 Nessuna dipendenza npm esterna: solo API Node.js native
- [ ] #13 La prima riga di etf.csv e acquisti.csv (intestazione) viene saltata e non processata come dato
<!-- AC:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
La prima riga di entrambi i CSV (etf.csv e acquisti.csv) è l'intestazione e viene sempre saltata dallo script.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Creato `tools/csv-to-json.mjs` — script Node.js ESM standalone (zero dipendenze esterne) che converte ETF e acquisti da CSV al formato JSON di importazione PAC-Dashboard.

**Funzionalità implementate:**
- CLI: `--seed`, `--etf`, `--acquisti`, `--out`
- Parsing CSV con separatore `;`, decimali `,`, date `dd/mm/yyyy` → `yyyy-mm-dd`
- Skip automatico riga di intestazione (entrambi i CSV)
- UUID ETF deterministici da ISIN via SHA-256
- UUID acquisti casuali via `crypto.randomUUID()`
- Mapping broker: nome (case-insensitive) → UUID letto dal seed
- `importoInvestito = valore × qta`, `prezzoUnitario = valore`, `quoteFrazionate = qta`
- Validazione opzionale `totale_investito` con tolleranza ±0.02 €
- Output JSON compatibile con `importJSON` di `usePortafoglio.js`
- Broker, scenari, config copiati dal seed invariati
<!-- SECTION:FINAL_SUMMARY:END -->
