---
id: PAC-96
title: 'Feature: aggiunta campo asset_class agli strumenti finanziari'
status: To Do
assignee: []
created_date: '2026-03-31 15:07'
updated_date: '2026-04-01 12:47'
labels: []
milestone: m-1
dependencies: []
references:
  - src/components/AcquistoForm.jsx
  - src/components/ETFCard.jsx
  - src/hooks/usePortafoglio.js
  - spec/model.md
  - spec/function.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Ogni strumento finanziario (ETF/fondo) nel portafoglio deve essere associato a una categoria di asset class. Questo campo permette future analisi di diversificazione e visualizzazioni per categoria (es. breakdown Azioni vs Obbligazioni vs Materie prime).

Contesto del modello dati:
- Gli strumenti sono gestiti tramite Supabase (tabella esistente per gli ETF/strumenti)
- Il frontend usa usePortafoglio.js per CRUD e stato globale
- Il form di inserimento acquisto è in AcquistoForm.jsx
- Le card riepilogative per ETF sono in ETFCard.jsx

Modello dati scelto: tabella dedicata asset_class
- Si crea una tabella separata `asset_class` (id, nome, visibile) con i 7 valori ammessi
- La tabella è accessibile in lettura da tutti gli utenti autenticati (RLS: SELECT pubblico per autenticati, INSERT/UPDATE/DELETE negato agli utenti normali)
- La tabella degli strumenti finanziari aggiunge una FK `asset_class_id` che referenzia `asset_class.id`
- Il frontend carica i valori "visibile=true" dalla tabella al mount (non hardcoded)

Valori da inserire nella tabella asset_class:
Azioni, Obbligazioni, Materie prime, Immobili, Mercato monetario, Portafogli di ETF, Criptovalute

Valore di default: Azioni
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 La RLS sulla tabella `asset_class` consente SELECT a tutti gli utenti autenticati e nega INSERT/UPDATE/DELETE agli utenti normali
- [x] #2 La tabella degli strumenti finanziari ha la colonna `asset_class_id` (FK verso asset_class.id, NOT NULL, default = id di 'Azioni')
- [ ] #3 Il modello dati frontend (struttura JSON in usePortafoglio.js) riflette il campo asset_class_id e/o il nome risolto tramite JOIN o lookup
- [ ] #4 Il campo asset_class è visibile nella ETFCard.jsx o in un'altra vista riepilogativa dello strumento
- [ ] #5 L'hook usePortafoglio.js include asset_class_id nelle operazioni di creazione e aggiornamento verso Supabase
- [x] #6 I record esistenti mantengono i dati invariati (backfill con id di 'Azioni')
- [ ] #7 Nell'export JSON, ogni ETF include il campo `assetClassNome` (stringa, es. "Azioni") al posto di `assetClassId`, in modo che il file sia portabile tra account senza dipendere dagli UUID
- [ ] #8 Nell'import JSON, il campo `assetClassNome` viene risolto cercando il corrispondente record in `asset_class` per nome; se non trovato o se la voce corrispondente ha visibile=false, viene assegnato il default 'Azioni'
- [x] #9 Esiste la tabella Supabase `asset_class` con colonne id (PK), nome (text, NOT NULL, UNIQUE) e visibile (boolean, NOT NULL, DEFAULT=true), popolata con i 7 valori: solo 'Azioni' ha visibile=true, le restanti 6 voci hanno visibile=false
- [ ] #10 Il file `public/etflens-backup.schema.json` include il campo `assetClassNome` (type: string) nell'oggetto ETF, come campo required
- [x] #11 Esiste una migration SQL completa: creazione tabella asset_class (id, nome, visibile), seed dei 7 valori (solo 'Azioni' con visibile=true, le altre 6 con visibile=false), aggiunta FK sulla tabella strumenti, backfill dei record esistenti con l'id di 'Azioni'
- [ ] #12 Tutti i `<select>` per la scelta dell'asset class (form nuovo ETF in Dashboard e ModificaETFModal in ETFCard) mostrano solo le voci con `visibile=true`, usando `stato.assetClasses` già filtrato in `caricaDati` con `.eq('visibile', true)`
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Ordine di esecuzione

1. SQL migration su Supabase (manuale via SQL editor)
2. `usePortafoglio.js` — modello dati + CRUD + export/import
3. `Dashboard.jsx` — form nuovo ETF + modal modifica ETF
4. `ETFCard.jsx` — mostra asset class
5. `public/etflens-backup.schema.json` — aggiorna schema

---

## Step 1 — SQL migration (Supabase SQL editor)

Eseguire la migration documentata in `docs/model.md` § "Migrazione PAC-96":

```sql
-- Crea tabella e seed (già nel modello, solo se non esiste)
CREATE TABLE IF NOT EXISTS asset_class (
  id       uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  nome     text    NOT NULL UNIQUE,
  visibile boolean NOT NULL DEFAULT true
);

INSERT INTO asset_class (nome, visibile) VALUES
  ('Azioni',             true),
  ('Obbligazioni',       false),
  ('Materie prime',      false),
  ('Immobili',           false),
  ('Mercato monetario',  false),
  ('Portafogli di ETF',  false),
  ('Criptovalute',       false)
ON CONFLICT (nome) DO NOTHING;

ALTER TABLE asset_class ENABLE ROW LEVEL SECURITY;
CREATE POLICY "asset_class_select_autenticati"
  ON asset_class FOR SELECT TO authenticated USING (true);

-- Aggiungi FK nullable, backfill, imposta NOT NULL + default
ALTER TABLE etf ADD COLUMN IF NOT EXISTS asset_class_id uuid REFERENCES asset_class(id);

DO $$
DECLARE azioni_id uuid;
BEGIN
  SELECT id INTO azioni_id FROM asset_class WHERE nome = 'Azioni';
  UPDATE etf SET asset_class_id = azioni_id WHERE asset_class_id IS NULL;
  EXECUTE format(
    'ALTER TABLE etf ALTER COLUMN asset_class_id SET DEFAULT %L::uuid', azioni_id
  );
END $$;

ALTER TABLE etf ALTER COLUMN asset_class_id SET NOT NULL;
```

---

## Step 2 — `src/hooks/usePortafoglio.js`

### 2a. Helper e stato

Aggiungere helper `mapAssetClass` dopo `mapScenario`:
```js
function mapAssetClass(row) {
  return { id: row.id, nome: row.nome, visibile: row.visibile }
}
```

Aggiungere `assetClasses: []` al `defaultState`.

### 2b. `mapETF` — aggiungere campo

```js
assetClassId: row.asset_class_id,
```

### 2c. `caricaDati` — caricare asset_class

Aggiungere alla `Promise.all` la query:
```js
supabase.from('asset_class').select('*').eq('visibile', true).order('nome')
```

Dopo il destructuring aggiungere controllo errore e mapping:
```js
const assetClasses = (assetClassRes.data || []).map(mapAssetClass)
```

Arricchire ogni ETF con `assetClassNome` risolto dalla lista:
```js
const acMap = new Map(assetClasses.map(ac => [ac.id, ac.nome]))
const etfMappati = etfData.map(row => ({
  ...mapETF(row),
  assetClassNome: acMap.get(row.asset_class_id) ?? 'Azioni',
}))
```

Aggiungere `assetClasses` al `setStato(...)`.

### 2d. `aggiungiETF` — accettare assetClassId

Firma: `aggiungiETF(nome, isin, emittente, importoFisso, assetClassId)`

Aggiungere al `.insert({...})`:
```js
asset_class_id: assetClassId,
```

Aggiornare `setStato` per includere `assetClassNome` nell'ETF aggiunto (lookup da `stato.assetClasses`).

### 2e. `aggiornaETF` — gestire assetClassId

In `aggiornaETF`, nel blocco `const dbCampi = {}`:
```js
if ('assetClassId' in campi) dbCampi.asset_class_id = campi.assetClassId
```

Nel `setStato`, se `assetClassId` presente aggiornare anche `assetClassNome`:
```js
const extra = 'assetClassId' in campi
  ? { assetClassNome: stato.assetClasses.find(ac => ac.id === campi.assetClassId)?.nome ?? 'Azioni' }
  : {}
// merge in s.etf.map(...)
```

### 2f. `exportJSON` — sostituire assetClassId con assetClassNome

Nel mapping `etfConMeta`, aggiungere risoluzione:
```js
// rimuovere assetClassId dall'output, aggiungere assetClassNome
const { id: _etfId, assetClassId, ...etf } = etfFull
const assetClassNome = stato.assetClasses.find(ac => ac.id === assetClassId)?.nome ?? 'Azioni'
return {
  ...etf,
  assetClassNome,
  acquisti: ...
}
```

### 2g. `importJSON` — risolvere assetClassNome → asset_class_id

Prima dell'inserimento ETF, caricare le asset class dal DB:
```js
const { data: acRows } = await supabase.from('asset_class').select('id, nome, visibile')
const acByNome = new Map((acRows || []).map(r => [r.nome, r]))
const azioniId = acRows?.find(r => r.nome === 'Azioni')?.id
```

Nel loop di inserimento ETF, risolvere l'ID:
```js
const acEntry = etf.assetClassNome ? acByNome.get(etf.assetClassNome) : null
const assetClassId = (acEntry?.visibile ? acEntry.id : null) ?? azioniId
```

Passare `asset_class_id: assetClassId` all'insert Supabase.

Aggiungere validazione: `assetClassNome` opzionale (backward-compat con backup senza il campo).

---

## Step 3 — `Dashboard.jsx`

### 3a. `ModificaETFModal`

- Aggiungere prop `assetClasses` alla firma del componente
- Aggiungere stato: `const [assetClassId, setAssetClassId] = useState(etf.assetClassId ?? '')`
- Aggiungere `<select>` prima del pulsante salva:
  ```jsx
  <div>
    <label className="block text-xs text-slate-500 dark:text-slate-400 mb-1">{t('asset_class')}</label>
    <select value={assetClassId} onChange={e => setAssetClassId(e.target.value)} ...>
      {assetClasses.map(ac => <option key={ac.id} value={ac.id}>{ac.nome}</option>)}
    </select>
  </div>
  ```
- In `handleSubmit`, aggiungere `assetClassId` ai campi passati a `onSalva`
- Nel punto di render `<ModificaETFModal>` in Dashboard, passare `assetClasses={port.assetClasses}`

### 3b. Form nuovo ETF (inline in Dashboard)

- Aggiungere stato: `const [assetClassIdETF, setAssetClassIdETF] = useState('')`
- Inizializzare al default 'Azioni' tramite `useEffect` quando `port.assetClasses` è disponibile
- Aggiungere `<select>` al form
- Passare `assetClassIdETF` a `port.aggiungiETF`

---

## Step 4 — `ETFCard.jsx`

Aggiungere badge/testo asset class nel header della card, sotto `emittente`:
```jsx
{etf.assetClassNome && (
  <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">{etf.assetClassNome}</p>
)}
```

---

## Step 5 — `public/etflens-backup.schema.json`

Aggiungere in `properties` dell'oggetto ETF:
```json
"assetClassNome": { "type": "string" }
```

Aggiungere `"assetClassNome"` all'array `required` dell'oggetto ETF.

---

## Note

- La chiave i18n `asset_class` va aggiunta a `src/i18n/it.js` e `src/i18n/en.js`
- La query Supabase su `etf` va aggiornata in `caricaDati` per includere `asset_class_id` (già restituito con `select('*')`)
- Backward compat import: se `assetClassNome` assente nel JSON, usare 'Azioni' come default silenzioso
<!-- SECTION:PLAN:END -->
