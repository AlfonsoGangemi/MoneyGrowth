---
id: PAC-7
title: >-
  Tabella proiezioni: righe anni passati mostrano dati reali al posto della
  proiezione
status: Done
assignee: []
created_date: '2026-03-10 16:31'
updated_date: '2026-03-12 15:32'
labels:
  - feature
  - frontend
  - ui
  - proiezioni
dependencies:
  - PAC-3
  - PAC-8
references:
  - src/components/TabellaProiezione.jsx
  - src/utils/calcoli.js
  - src/hooks/usePortafoglio.js
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Nella tabella delle proiezioni, le righe corrispondenti ad **anni già trascorsi** devono mostrare i **dati reali persistiti** anziché la proiezione stimata.

### Logica di classificazione delle righe

Una riga "Anno N" diventa **riga statistica** se:
- L'anno N è già terminato (anno < anno corrente)
- Esiste almeno un record in `portafoglio_storico_annuale` per quell'anno (valore persistito disponibile)
- Altrimenti rimane una **riga proiezione** (comportamento attuale)

### Contenuto della riga statistica

| Colonna | Valore |
|---|---|
| Anno | "Anno N" (invariato) |
| Totale versato | Somma reale degli `importo_investito` degli acquisti entro l'anno N |
| Colonne scenari | Sostituita da: **valore portafoglio reale persistito** + rendimento assoluto (€) e percentuale (%) rispetto al totale versato |

Il valore del portafoglio è: `Σ (quote_accumulate_etf × ultimo_prezzo_storico_anno)` per gli ETF attivi, **persistito** nella tabella `portafoglio_storico_annuale` al momento in cui diventa disponibile l'ultimo prezzo storico di quell'anno in `etf_prezzi_storici`.

### Calcolo e Persistenza

**Scelta: persistenza.**

- Il valore del portafoglio a fine anno va calcolato e salvato appena è disponibile l'ultimo prezzo storico dell'anno in `etf_prezzi_storici`
- Il momento ideale è quando viene eseguito l'upsert mensile del prezzo in `etf_prezzi_storici` per il mese 12 (o comunque l'ultimo mese dell'anno per cui esiste un prezzo)
- La tabella `portafoglio_storico_annuale` persiste `(user_id, anno, valore, totale_versato, aggiornato_il)`
- In lettura, `TabellaProiezione.jsx` riceve i valori persistiti e li usa direttamente per le righe anni passati

### Schema DB suggerito

```sql
CREATE TABLE portafoglio_storico_annuale (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid REFERENCES auth.users NOT NULL,
  anno          int NOT NULL,
  valore        numeric(14,2) NOT NULL,   -- Σ quote × prezzo storico fine anno
  totale_versato numeric(14,2) NOT NULL,  -- Σ importo_investito acquisti ≤ fine anno
  aggiornato_il timestamptz DEFAULT now(),
  UNIQUE (user_id, anno)
);

-- RLS: ogni utente vede e modifica solo i propri record
ALTER TABLE portafoglio_storico_annuale ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user own" ON portafoglio_storico_annuale
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

### Triggering dell'aggiornamento

Il calcolo e l'upsert in `portafoglio_storico_annuale` avviene in `usePortafoglio.js`:
- Dopo ogni upsert mensile in `etf_prezzi_storici` (funzione già presente per PAC-3)
- Se il prezzo appena salvato appartiene all'anno passato (anno < anno corrente), ricalcola `Σ (quote × prezzo)` per tutti gli ETF attivi con gli acquisti fino a fine anno e fa upsert in `portafoglio_storico_annuale`

### Distinguibilità visiva

Le righe statistiche devono essere visivamente distinte da quelle proiezione, ad esempio con un colore di sfondo diverso o un badge "Reale".
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Le righe corrispondenti ad anni già trascorsi (anno < anno corrente) con un valore persistito in `portafoglio_storico_annuale` mostrano dati reali
- [x] #2 La colonna 'Totale versato' mostra la somma reale degli importi investiti entro quell'anno
- [x] #3 Le colonne scenario sono sostituite da una singola colonna con: valore reale persistito, rendimento assoluto (€) e rendimento percentuale (%)
- [x] #4 Le righe statistiche sono visivamente distinte da quelle di proiezione (colore, badge o stile differente)
- [x] #5 Le righe anni futuri (senza valore persistito) continuano a mostrare la proiezione invariata
- [x] #6 Dopo ogni upsert mensile in `etf_prezzi_storici` per un anno passato, viene ricalcolato e persistito il valore in `portafoglio_storico_annuale`
- [x] #7 Schema DB `portafoglio_storico_annuale` con RLS per user_id, chiave univoca (user_id, anno)
- [x] #8 `TabellaProiezione.jsx` riceve i valori storici come prop e li usa per classificare le righe
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Piano di implementazione

*(DB già presente da PAC-8: tabella `portafoglio_storico_annuale` + RLS)*

---

### Step 1 — `usePortafoglio.js`: carica `storicoAnnuale` al mount

- Aggiungere `storicoAnnuale: []` a `defaultState`
- Nel `Promise.all` di `carica()`, aggiungere quinta query:
  ```js
  supabase
    .from('portafoglio_storico_annuale')
    .select('anno, valore, totale_versato')
    .eq('user_id', user.id)
    .order('anno')
  ```
- Mappare in camelCase: `{ anno, valore: Number(r.valore), totaleVersato: Number(r.totale_versato) }`
- Includere nel `setStato`
- Esporre `storicoAnnuale` nel return

---

### Step 2 — `usePortafoglio.js`: `aggiornaStoricoAnnuale(anno)`

Funzione interna `useCallback` che:
1. Legge dallo stato gli ETF non archiviati + `prezziStorici`
2. Calcola `totaleVersato` = `Σ acquisti.filter(data ≤ '{anno}-12-31').importoInvestito`
3. Calcola `valore` = per ogni ETF non archiviato:
   - quote accumulate = `Σ acquisti.filter(data ≤ '{anno}-12-31').quoteFrazionate`
   - prezzo fine anno = `prezziStorici.find(isin, anno, mese max)?.prezzo` (fallback `prezzoCorrente`)
   - `valore += quote × prezzo`
4. Upsert su `portafoglio_storico_annuale`
5. Aggiorna `stato.storicoAnnuale` localmente (insert/replace per `anno`)

Dipendenze `useCallback`: `[stato.etf, stato.prezziStorici, user]`

---

### Step 3 — `usePortafoglio.js`: trigger in `salvaPrezzoStorico`

Dopo l'upsert in `etf_prezzi_storici`, se `anno < new Date().getFullYear()`:
```js
await aggiornaStoricoAnnuale(anno)
```

Nota: `salvaPrezzoStorico` viene già chiamato da `aggiornaETF` dopo ogni aggiornamento prezzo. Aggiungere `aggiornaStoricoAnnuale` nelle sue dipendenze.

---

### Step 4 — `Dashboard.jsx`: passa prop a `TabellaProiezione`

```jsx
<TabellaProiezione
  storicoAnnuale={port.storicoAnnuale}
  {/* ...props esistenti */}
/>
```

---

### Step 5 — `TabellaProiezione.jsx`: classificazione righe + UI statistica

**Logica classificazione** (in `useMemo`):
- `annoCorrente = new Date().getFullYear()`
- `storicoMap = Object.fromEntries(storicoAnnuale.map(r => [r.anno, r]))`
- `annoBase` = anno più piccolo in `storicoAnnuale` (o `annoCorrente` se vuoto)
- Per ogni riga `1..orizzonteAnni`: `annoCalendario = annoBase + anno - 1`
  - Se `annoCalendario < annoCorrente && storicoMap[annoCalendario]` → `tipo: 'reale'`
  - Altrimenti → `tipo: 'proiezione'`

**UI riga statistica** (AC #3, #4):
- Sfondo diverso: `bg-slate-800/80 border-l-2 border-emerald-600`
- Badge `Reale` verde accanto all'anno
- Le colonne scenario sostituite da un'unica cella con:
  - Valore reale: `fmt(storico.valore)`
  - Rendimento €: `storico.valore - storico.totaleVersato`
  - Rendimento %: `((storico.valore / storico.totaleVersato - 1) * 100).toFixed(1)%`
- Colonna `Totale versato`: usa `storico.totaleVersato` (non il calcolo formula)

**Header tabella**: colspan dinamico o cella vuota per gestire colonne scenario → 1 nelle righe statistiche

---

### Ordine di esecuzione

```
Step 1 → Step 2 → Step 3  (hook, no UI)
Step 4                      (Dashboard, 1 riga)
Step 5                      (TabellaProiezione, UI)
```
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementazione completa. DB già presente da PAC-8.

**usePortafoglio.js:**
- `storicoAnnuale: []` aggiunto a `defaultState`
- Quinta query parallela su `portafoglio_storico_annuale` nel mount, mappata in camelCase
- `aggiornaStoricoAnnuale(anno)`: calcola `totaleVersato` (Σ acquisti ≤ fine anno) e `valore` (Σ quote × prezzo storico) per tutti gli ETF non archiviati, upsert su DB e aggiornamento stato locale
- `salvaPrezzoStorico`: aggiunto backfill automatico — dopo ogni salvataggio cerca anni passati con prezzi in `etf_prezzi_storici` ma senza record in `storicoAnnuale` e li calcola

**Dashboard.jsx:**
- Aggiunta prop `storicoAnnuale={port.storicoAnnuale}` a `TabellaProiezione`

**TabellaProiezione.jsx:**
- Nuova prop `storicoAnnuale`
- `annoBase` = primo anno in storicoAnnuale (o annoCorrente se vuoto)
- Righe: anni passati con storico + orizzonteAnni di proiezione
- Riga `tipo: 'reale'`: sfondo `bg-emerald-950/30`, bordo sinistro verde, badge "Reale", unica cella con valore reale + rendimento €/% al posto delle colonne scenario
- Riga `tipo: 'proiezione'`: comportamento invariato
- Label = anno di calendario (es. "2024") invece di "Anno N"
<!-- SECTION:FINAL_SUMMARY:END -->
