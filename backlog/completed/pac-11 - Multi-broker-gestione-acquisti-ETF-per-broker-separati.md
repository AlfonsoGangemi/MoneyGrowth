---
id: PAC-11
title: 'Multi-broker: gestione acquisti ETF per broker separati'
status: Done
assignee: []
created_date: '2026-03-11 07:48'
updated_date: '2026-03-11 12:40'
labels:
  - feature
  - frontend
  - database
dependencies:
  - PAC-8
references:
  - src/components/AcquistoForm.jsx
  - src/components/Dashboard.jsx
  - src/hooks/usePortafoglio.js
  - src/utils/calcoli.js
  - spec/model.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiungere la gestione di più broker (es. Degiro, Trade Republic) trattando ogni broker come un account separato. Gli acquisti di uno stesso ETF vengono tracciati indipendentemente per broker, con la possibilità di visualizzare il portafoglio aggregato o filtrato per broker.

---

### Modello dati

**Nuova tabella `broker`:**

```sql
CREATE TABLE broker (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid REFERENCES auth.users NOT NULL,
  nome       text NOT NULL,
  colore     text NOT NULL DEFAULT '#6366f1',
  archiviato boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, nome)
);

ALTER TABLE broker ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user own" ON broker
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

**Modifica tabella `acquisti`** — aggiungere FK obbligatoria al broker:

```sql
ALTER TABLE acquisti
  ADD COLUMN broker_id uuid NOT NULL REFERENCES broker(id) ON DELETE RESTRICT;
```

`broker_id` è **NOT NULL**: ogni acquisto deve essere associato a un broker.

**Modifica tabella `portafoglio_storico_annuale`** — aggiungere FK al broker:

```sql
ALTER TABLE portafoglio_storico_annuale
  ADD COLUMN broker_id uuid NOT NULL REFERENCES broker(id) ON DELETE RESTRICT;

-- Il vincolo di unicità diventa (user_id, anno, broker_id)
ALTER TABLE portafoglio_storico_annuale
  DROP CONSTRAINT portafoglio_storico_annuale_user_id_anno_key;
ALTER TABLE portafoglio_storico_annuale
  ADD CONSTRAINT portafoglio_storico_annuale_user_id_anno_broker_key
  UNIQUE (user_id, anno, broker_id);
```

Il valore del portafoglio è persistito **per broker**: il totale aggregato si ottiene sommando i record dello stesso anno.

**Modifica tabella `config`** — persistere il filtro broker attivo:

```sql
ALTER TABLE config
  ADD COLUMN broker_filtro uuid[] NOT NULL DEFAULT '{}';
```

`broker_filtro` è un array di UUID: contiene gli ID dei broker selezionati nel filtro dashboard. Array vuoto (`{}`) significa "tutti i broker aggregati" (comportamento di default).

---

### Broker di default

Al primo accesso, se l'utente non ha ancora broker configurati, viene creato automaticamente un broker **"Default"** in `usePortafoglio`. Tutti gli acquisti esistenti (pre-migrazione) vengono associati a questo broker tramite migrazione manuale su Supabase.

Flusso di creazione automatica:
- All'avvio di `usePortafoglio`, se `broker.length === 0`, viene inserito `{ nome: 'Default', colore: '#6366f1' }` per quell'utente
- Il broker creato diventa il default preselezionato nel form di acquisto

---

### Gestione broker

- Pannello dedicato (o sezione in impostazioni) per aggiungere, rinominare, archiviare ed eliminare broker
- Campi: **nome** (es. "Degiro"), **colore** (color picker)
- **Archiviazione**: un broker archiviato non compare nel selettore del form di acquisto ma i suoi acquisti restano visibili nel grafico e negli indicatori (filtrabili)
- **Eliminazione**: consentita solo se il broker non ha acquisti associati (ON DELETE RESTRICT lo impone a DB)
- Lista broker visibile come filtro rapido nella dashboard; i broker archiviati sono collassati o marcati

---

### Form di acquisto (`AcquistoForm.jsx`)

- Aggiungere un selettore **Broker** nella testata del form (prima dei checkbox ETF)
- Mostra solo i broker non archiviati
- Default: il broker di default dell'utente (o l'ultimo usato)
- Il broker selezionato si applica a tutti gli ETF dell'acquisto corrente

---

### Dashboard e filtri

- Aggiungere un **filtro broker** in cima alla dashboard (chip selezionabili, multi-selezione)
- Il filtro attivo è **persistito** in `config.broker_filtro` (array di UUID) e sincronizzato su Supabase ad ogni cambio
- Default: array vuoto = tutti i broker aggregati (inclusi archiviati)
- Quando si filtra per uno o più broker:
  - Indicatori (ROI, CAGR, ecc.) calcolati solo sugli acquisti del/dei broker selezionati
  - Grafico mostra solo le serie relative ai broker selezionati
  - Tabella proiezioni usa solo le quote accumulate dai broker selezionati
- I broker archiviati sono visibili nel filtro ma distinti visivamente (es. badge "archiviato")

---

### Indicatori per broker

- Gli indicatori in `Indicatori.jsx` devono supportare il filtraggio per `broker_id`
- La funzione `valoreAttuale` e le altre in `calcoli.js` ricevono già gli acquisti filtrati — nessuna modifica alla logica di calcolo, solo al filtro a monte

---

### Impatto su storico e proiezioni

- `portafoglio_storico_annuale` persiste il valore **per broker** (colonna `broker_id NOT NULL`)
- Il valore aggregato del portafoglio per un anno si ottiene sommando tutti i record con lo stesso `(user_id, anno)`
- Le proiezioni future usano il valore aggregato come base; il dettaglio per broker è calcolato on-the-fly

---

### Migrazione dati esistenti

Prima di aggiungere i vincoli `NOT NULL`:
1. Creare il broker "Default" per ogni utente che ha acquisti/storico
2. Aggiornare tutti gli acquisti esistenti con il `broker_id` del broker "Default" del rispettivo utente
3. Aggiornare tutti i record di `portafoglio_storico_annuale` con il `broker_id` del broker "Default"
4. Aggiungere le colonne `broker_id NOT NULL` e aggiornare i vincoli di unicità
5. Aggiungere la colonna `broker_filtro uuid[] NOT NULL DEFAULT '{}'` alla tabella `config`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Tabella `broker` creata con colonna `archiviato boolean NOT NULL DEFAULT false`, RLS e UNIQUE (user_id, nome)
- [x] #2 Colonna `broker_id uuid NOT NULL REFERENCES broker(id) ON DELETE RESTRICT` aggiunta alla tabella `acquisti`
- [x] #3 Colonna `broker_id uuid NOT NULL` aggiunta a `portafoglio_storico_annuale`; vincolo UNIQUE aggiornato a (user_id, anno, broker_id)
- [x] #4 Colonna `broker_filtro uuid[] NOT NULL DEFAULT '{}'` aggiunta alla tabella `config`
- [x] #5 All'avvio, se l'utente non ha broker, viene creato automaticamente un broker 'Default' in `usePortafoglio`
- [x] #6 Pannello gestione broker: aggiunta, rinomina, archiviazione, eliminazione (solo se senza acquisti)
- [x] #7 Il form di acquisto mostra solo i broker non archiviati; default: broker 'Default'
- [x] #8 Il filtro broker nella dashboard è persistito in `config.broker_filtro` e sincronizzato su Supabase ad ogni cambio; array vuoto = tutti aggregati
- [x] #9 I broker archiviati sono visibili nel filtro ma distinti visivamente
- [x] #10 Indicatori, grafico e tabella proiezioni rispettano il filtro broker attivo
- [x] #11 `spec/model.md` aggiornato con tabella broker, colonne aggiunte e strategia di migrazione
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Analisi dell'esistente

- `usePortafoglio` gestisce stato globale con `defaultState = { etf, scenari, orizzonteAnni, mostraProiezione }`; il caricamento usa `Promise.all` su 3 tabelle
- `Dashboard.jsx` passa `etfAttivi` (filtrati per `!archiviato`) a `Indicatori`, `GraficoPortafoglio`, `TabellaProiezione`; il filtro broker basta applicarlo qui a monte
- `Indicatori.jsx`, `GraficoPortafoglio.jsx`, `TabellaProiezione.jsx` ricevono già `etfList` — nessuna modifica necessaria se il filtraggio avviene in `Dashboard`
- `AcquistoForm.jsx` riceve `etfList` e `onAggiungi`; va aggiunto `brokerList` e `brokerId` negli item

---

## File da modificare

### 1. `spec/model.md`

Aggiungere alla sezione Schema SQL:
- Tabella `broker` con `archiviato`
- `ALTER TABLE acquisti ADD COLUMN broker_id uuid NOT NULL REFERENCES broker(id) ON DELETE RESTRICT`
- `ALTER TABLE portafoglio_storico_annuale ADD COLUMN broker_id ...` + aggiornamento UNIQUE
- `ALTER TABLE config ADD COLUMN broker_filtro uuid[] NOT NULL DEFAULT '{}'`
- Sezione migrazione dati esistenti (4 step)
- RLS su `broker`
- Frontend model: aggiungere `brokerId` su Acquisto, `broker` e `brokerFiltro` su stato globale

---

### 2. `src/hooks/usePortafoglio.js`

**`defaultState`** — aggiungere:
```js
broker: [],
brokerFiltro: [],   // [] = tutti aggregati
```

**`mapAcquisto`** — aggiungere:
```js
brokerId: row.broker_id,
```

**`carica()`** — aggiungere broker alla `Promise.all`:
```js
const [etfRes, scenariRes, configRes, brokerRes] = await Promise.all([
  ...esistenti,
  supabase.from('broker').select('*').eq('user_id', user.id).order('created_at'),
])
```
Mappare con `mapBroker`:
```js
function mapBroker(row) {
  return { id: row.id, nome: row.nome, colore: row.colore, archiviato: row.archiviato }
}
```
Leggere `broker_filtro` da config:
```js
brokerFiltro: config?.broker_filtro ?? [],
```

**Creazione broker "Default"** — dopo il caricamento, se `broker.length === 0`:
```js
if (broker.length === 0) {
  const { data: def } = await supabase
    .from('broker')
    .insert({ user_id: user.id, nome: 'Default', colore: '#6366f1' })
    .select().single()
  if (def) broker = [mapBroker(def)]
}
```

**`aggiungiAcquistiMultipli`** — aggiungere `broker_id` nel payload:
```js
broker_id: item.brokerId,
```

**`importJSON`** — flatMap acquisti: aggiungere `broker_id: a.brokerId`

**Nuove funzioni esposte:**
```js
// CRUD broker
const aggiungiBroker = useCallback(async (nome, colore) => { ... })
const aggiornaBroker = useCallback(async (id, campi) => { ... })  // nome, colore, archiviato
const eliminaBroker  = useCallback(async (id) => { ... })  // fallisce se ON DELETE RESTRICT

// Filtro persistito
const setBrokerFiltro = useCallback(async (ids) => {
  await supabase.from('config').upsert({ user_id: user.id, broker_filtro: ids })
  setStato(s => ({ ...s, brokerFiltro: ids }))
}, [user])
```

---

### 3. `src/components/AcquistoForm.jsx`

**Props**: aggiungere `brokerList` (solo non archiviati, passato da Dashboard)

**Stato**: aggiungere `brokerId` con default primo broker della lista:
```js
const [brokerId, setBrokerId] = useState(brokerList[0]?.id ?? '')
```

**UI**: aggiungere `<select>` broker sopra la lista ETF:
```jsx
<div>
  <label className="block text-xs text-slate-400 mb-1">Broker</label>
  <select
    value={brokerId}
    onChange={e => setBrokerId(e.target.value)}
    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-400"
  >
    {brokerList.map(b => (
      <option key={b.id} value={b.id}>{b.nome}</option>
    ))}
  </select>
</div>
```

**`handleSubmit`**: includere `brokerId` negli item:
```js
.map(r => ({ ..., brokerId }))
```

---

### 4. `src/components/Dashboard.jsx`

**Logica filtro broker** — derivare `etfFiltrate` dagli ETF attivi applicando il filtro sugli acquisti:
```js
const brokerAttivi = port.broker.filter(b => !b.archiviato)
const etfFiltrate = port.brokerFiltro.length === 0
  ? port.etf
  : port.etf.map(e => ({
      ...e,
      acquisti: e.acquisti.filter(a => port.brokerFiltro.includes(a.brokerId)),
    }))
const etfAttivi    = etfFiltrate.filter(e => !e.archiviato)
const etfArchiviati = etfFiltrate.filter(e => e.archiviato)
```

**Chip filtro broker** — sezione nuova sopra la griglia ETF (pattern identico ai `ScenarioChip`):
```jsx
{port.broker.length > 1 && (
  <div className="flex items-center gap-2 flex-wrap">
    <span className="text-xs text-slate-400">Broker:</span>
    {/* chip "Tutti" */}
    <button
      onClick={() => port.setBrokerFiltro([])}
      className={`text-xs px-3 py-1 rounded-full border transition-colors ${
        port.brokerFiltro.length === 0
          ? 'bg-blue-600 border-blue-500 text-white'
          : 'border-slate-600 text-slate-400 hover:text-white'
      }`}
    >Tutti</button>
    {port.broker.map(b => (
      <button
        key={b.id}
        onClick={() => {
          const sel = port.brokerFiltro.includes(b.id)
            ? port.brokerFiltro.filter(id => id !== b.id)
            : [...port.brokerFiltro, b.id]
          port.setBrokerFiltro(sel)
        }}
        className={`text-xs px-3 py-1 rounded-full border transition-colors flex items-center gap-1.5 ${
          port.brokerFiltro.includes(b.id)
            ? 'border-transparent text-white'
            : 'border-slate-600 text-slate-400 hover:text-white'
        } ${b.archiviato ? 'opacity-50' : ''}`}
        style={port.brokerFiltro.includes(b.id) ? { backgroundColor: b.colore } : {}}
      >
        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: b.colore }} />
        {b.nome}
        {b.archiviato && <span className="text-xs opacity-70">(arch.)</span>}
      </button>
    ))}
    <button
      onClick={() => setModalGestoreBroker(true)}
      className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
    >
      Gestisci...
    </button>
  </div>
)}
```

**`GestoreBrokerModal`** — nuovo componente inline in Dashboard (simile a `ModificaETFModal`):
- Lista broker con nome, colore, stato archiviato
- Azioni per riga: modifica nome/colore, archivia/ripristina, elimina (con feedback errore se ON DELETE RESTRICT)
- Form in fondo per aggiungere nuovo broker

**Passaggio props aggiornato:**
```jsx
<AcquistoForm
  etfList={etfAttivi}
  brokerList={brokerAttivi}   // ← aggiunto
  onAggiungi={port.aggiungiAcquistiMultipli}
  onChiudi={() => setModalAcquisto(false)}
/>
```

---

## Ordine di implementazione

1. `spec/model.md` — aggiornare schema e frontend model
2. `usePortafoglio.js` — `defaultState`, `mapAcquisto`, `carica`, broker CRUD, `setBrokerFiltro`, `aggiungiAcquistiMultipli`, `importJSON`
3. `AcquistoForm.jsx` — prop `brokerList`, stato `brokerId`, select UI, handleSubmit
4. `Dashboard.jsx` — logica filtro, chip broker, `GestoreBrokerModal`, props aggiornate
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Implementazione PAC-11 completata

### Modifiche apportate

**`spec/model.md`**
- Aggiunta tabella `broker` con `archiviato`, RLS e UNIQUE `(user_id, nome)`
- Aggiunta colonna `broker_id NOT NULL REFERENCES broker(id) ON DELETE RESTRICT` su `acquisti`
- Aggiornata `portafoglio_storico_annuale`: colonna `broker_id NOT NULL`, UNIQUE aggiornato a `(user_id, anno, broker_id)`
- Aggiunta colonna `broker_filtro uuid[] NOT NULL DEFAULT '{}'` su `config`
- Aggiunta sezione migrazione dati esistenti (script SQL per backfill con broker "Default")
- Aggiornato frontend model: `brokerId` su Acquisto, nuovo tipo `Broker`, stato globale `broker`/`brokerFiltro`

**`usePortafoglio.js`**
- `defaultState`: aggiunto `broker: []` e `brokerFiltro: []`
- `mapAcquisto`: aggiunto `brokerId: row.broker_id`
- Aggiunta funzione `mapBroker`
- `carica()`: aggiunto broker alla `Promise.all`; creazione automatica broker "Default" se `broker.length === 0`; lettura `broker_filtro` da config
- `aggiungiAcquistiMultipli`: aggiunto `broker_id: item.brokerId` nel payload
- `importJSON`: aggiunto `broker_id: a.brokerId` nel flatMap acquisti
- Nuove funzioni esposte: `aggiungiBroker`, `aggiornaBroker`, `eliminaBroker`, `setBrokerFiltro`

**`AcquistoForm.jsx`**
- Prop `brokerList` aggiunta
- Stato `brokerId` con default `brokerList[0]?.id`
- `<select>` broker visibile solo se `brokerList.length > 1`
- `handleSubmit`: aggiunto `brokerId` negli item

**`Dashboard.jsx`**
- Componente `GestoreBrokerModal`: lista broker con archivia/ripristina/elimina + form aggiunta nuovo broker
- Filtro `etfFiltrate` derivato da `port.brokerFiltro` (filtra gli acquisti a monte, nessuna modifica necessaria a Indicatori/Grafico/Tabella)
- Chip broker filtro: chip "Tutti" + chip per broker con colore, badge archiviato, toggle multi-selezione; pulsante "Gestisci…"
- `AcquistoForm` riceve `brokerList={brokerAttivi}`
- `GestoreBrokerModal` renderizzato condizionalmente da `modalGestoreBroker`
<!-- SECTION:FINAL_SUMMARY:END -->
