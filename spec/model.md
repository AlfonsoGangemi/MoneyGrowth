# Modello dati

## Database Supabase

### Schema SQL

```sql
-- ETF
create table etf (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete cascade not null,
  nome            text not null,
  isin            text not null,
  emittente       text default '',
  importo_fisso   numeric not null default 0,
  prezzo_corrente numeric not null default 0,
  archiviato      boolean not null default false,
  created_at      timestamptz default now(),
  constraint etf_user_isin_unique unique (user_id, isin)
);

-- Acquisti
create table acquisti (
  id                uuid primary key default gen_random_uuid(),
  etf_id            uuid references etf(id) on delete cascade not null,
  user_id           uuid references auth.users(id) on delete cascade not null,
  data              date not null,
  importo_investito numeric not null,
  prezzo_unitario   numeric not null,
  quote_frazionate  numeric not null,
  fee               numeric not null default 0,
  created_at        timestamptz default now()
);

-- Scenari di proiezione
create table scenari (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid references auth.users(id) on delete cascade not null,
  nome             text not null,
  rendimento_annuo numeric not null,
  colore           text not null
);

-- Configurazione utente
create table config (
  user_id           uuid references auth.users(id) on delete cascade primary key,
  orizzonte_anni    integer not null default 10,
  mostra_proiezione boolean not null default true
);

-- Storico prezzi mensili ETF (condiviso tra utenti, chiave per ISIN)
create table etf_prezzi_storici (
  id        uuid primary key default gen_random_uuid(),
  isin      text not null,
  anno      integer not null,
  mese      integer not null check (mese between 1 and 12),
  prezzo    numeric(12,4) not null,
  creato_il timestamptz default now(),
  unique (isin, anno, mese)
);

-- Valore del portafoglio per anno, persistito per utente
create table portafoglio_storico_annuale (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users not null,
  anno           integer not null,
  valore         numeric(14,2) not null,
  totale_versato numeric(14,2) not null,
  aggiornato_il  timestamptz default now(),
  unique (user_id, anno)
);
```

### Row Level Security (RLS)

Abilitare RLS su tutte le tabelle; ogni utente vede solo i propri dati:

```sql
alter table etf enable row level security;

create policy "utente vede i propri etf"
  on etf for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table acquisti enable row level security;

create policy "utente vede i propri acquisti"
  on acquisti for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table scenari enable row level security;

create policy "utente vede i propri scenari"
  on scenari for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

alter table config enable row level security;

create policy "utente vede i propri config"
  on config for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- etf_prezzi_storici: lettura e scrittura per tutti gli utenti autenticati
alter table etf_prezzi_storici enable row level security;

create policy "authenticated read etf_prezzi_storici"
  on etf_prezzi_storici for select
  using (auth.role() = 'authenticated');

create policy "authenticated insert etf_prezzi_storici"
  on etf_prezzi_storici for insert
  with check (auth.role() = 'authenticated');

create policy "authenticated update etf_prezzi_storici"
  on etf_prezzi_storici for update
  using (auth.role() = 'authenticated');

-- portafoglio_storico_annuale: ogni utente vede e modifica solo i propri record
alter table portafoglio_storico_annuale enable row level security;

create policy "utente vede il proprio storico annuale"
  on portafoglio_storico_annuale for all
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
```

### Variabili d'ambiente

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

---

## Dati sul frontend

Il modello rimane invariato rispetto alla struttura originale; il mapping da snake_case (DB) a camelCase (JS) avviene nel layer `usePortafoglio.js`.

### ETF
```json
{
  "id": "uuid",
  "nome": "iShares Core MSCI World",
  "isin": "IE00B4L5Y983",
  "emittente": "iShares",
  "importoFisso": 200,
  "prezzoCorrente": 95.40,
  "archiviato": false,
  "acquisti": []
}
```

### Acquisto
```json
{
  "id": "uuid",
  "data": "2024-01-15",
  "importoInvestito": 200,
  "prezzoUnitario": 88.20,
  "quoteFrazionate": 2.2676,
  "fee": 0
}
```

### Scenario Proiezione
```json
{
  "id": "uuid",
  "nome": "Ottimistico",
  "rendimentoAnnuo": 0.10,
  "colore": "#22c55e"
}
```

---
