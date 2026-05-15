# Modello dati

## Database Supabase

### Schema SQL

```sql
-- Broker
create table broker (
  id         uuid default gen_random_uuid() primary key,
  user_id    uuid references auth.users not null,
  nome       text not null,
  colore     text not null default '#6366f1',
  archiviato boolean not null default false,
  created_at timestamptz default now(),
  unique (user_id, nome)
);

alter table broker enable row level security;
create policy "user own" on broker
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Asset class (condivisa tra utenti, sola lettura per gli utenti normali)
create table asset_class (
  id       uuid    primary key default gen_random_uuid(),
  nome     text    not null unique,
  visibile boolean not null default true
);

insert into asset_class (nome, visibile) values
  ('Azioni',             true),
  ('Obbligazioni',       false),
  ('Materie prime',      false),
  ('Immobili',           false),
  ('Mercato monetario',  false),
  ('Portafogli di ETF',  false),
  ('Criptovalute',       false);

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
  asset_class_id  uuid references asset_class(id) not null,
  created_at      timestamptz default now(),
  constraint etf_user_isin_unique unique (user_id, isin)
);

-- Acquisti
create table acquisti (
  id                 uuid primary key default gen_random_uuid(),
  etf_id             uuid references etf(id) on delete cascade not null,
  user_id            uuid references auth.users(id) on delete cascade not null,
  data               date not null,
  importo_investito  numeric not null,
  prezzo_unitario    numeric not null,
  quote_frazionate   numeric not null,
  fee                numeric not null default 0,
  broker_id          uuid references broker(id) on delete restrict not null,
  created_at         timestamptz default now(),
  -- PAC-131: tracciabilità sorgente e dedup CSV broker
  sync_source           text not null default 'manual',  -- 'manual' | 'ui_upload' | 'telegram_bot'
  -- PAC-135: rinominato da tr_transaction_id → broker_transaction_id (multi-broker)
  broker_transaction_id text
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
  broker_filtro     uuid[] not null default '{}',
  is_pro            boolean not null default false  -- PAC-131: flag piano PRO
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

-- Valore del portafoglio per anno, persistito per utente e broker
create table portafoglio_storico_annuale (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid references auth.users not null,
  anno           integer not null,
  broker_id      uuid references broker(id) on delete restrict not null,
  valore         numeric(14,2) not null,
  totale_versato numeric(14,2) not null,
  aggiornato_il  timestamptz default now(),
  unique (user_id, anno, broker_id)
);

-- Watchlist (PAC-129) — ETF monitorati pre-acquisto, separati da etf
create table watchlist (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  isin        text not null check (isin ~ '^[A-Z]{2}[A-Z0-9]{10}$'),
  nome        text,
  emittente   text,
  created_at  timestamptz default now(),
  unique (user_id, isin)
);

-- Log import CSV broker (PAC-131, colonna broker_id aggiunta da PAC-135)
create table broker_sync_log (
  id             uuid        primary key default gen_random_uuid(),
  user_id        uuid        not null references auth.users(id) on delete cascade,
  broker_id      uuid        references broker(id) on delete set null,  -- PAC-135
  synced_at      timestamptz not null default now(),
  source         text        not null default 'ui_upload',  -- 'ui_upload' | 'telegram_bot'
  rows_total     int,
  rows_inserted  int,
  rows_skipped   int,
  error_message  text
);

-- Indici aggiuntivi (PAC-112)
create index on acquisti(user_id, etf_id);
create index on scenari(user_id);

-- Indici dedup acquisti CSV broker (PAC-131 + PAC-135)
-- Primario: (broker_id, broker_transaction_id) — stesso ID ammesso su broker diversi
create unique index acquisti_broker_transaction_id_unique
  on acquisti (broker_id, broker_transaction_id)
  where broker_transaction_id is not null;

-- Fallback: data+importo+ETF+broker tra righe senza ID transazione
create unique index acquisti_dedup_fallback
  on acquisti (broker_id, etf_id, data, importo_investito)
  where broker_transaction_id is null;

-- broker_sync_log: ricerca per utente ordinata per data
create index broker_sync_log_user_id_idx
  on broker_sync_log (user_id, synced_at desc);
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

-- asset_class: lettura per tutti gli autenticati, scrittura bloccata
alter table asset_class enable row level security;

create policy "asset_class_select_autenticati"
  on asset_class for select
  to authenticated
  using (true);

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

-- watchlist: ogni utente vede e modifica solo la propria (PAC-129)
alter table watchlist enable row level security;

create policy "watchlist_select" on watchlist for select using (auth.uid() = user_id);
create policy "watchlist_insert" on watchlist for insert with check (auth.uid() = user_id);
create policy "watchlist_delete" on watchlist for delete using (auth.uid() = user_id);

-- broker_sync_log: ogni utente vede e scrive solo i propri log (PAC-131)
alter table broker_sync_log enable row level security;

create policy "broker_sync_log_select" on broker_sync_log
  for select using (auth.uid() = user_id);
create policy "broker_sync_log_insert" on broker_sync_log
  for insert with check (auth.uid() = user_id);
```

### GRANT espliciti (PAC-145)

> **Regola:** ogni nuova tabella esposta via Data API (supabase-js / PostgREST) **deve** includere GRANT espliciti nella propria migrazione, oltre a RLS e policies. Dal 30 ottobre 2026 Supabase rimuove i GRANT impliciti sullo schema public per tutti i progetti esistenti (breaking change annunciato a maggio 2026).

```sql
-- Tabelle utente — CRUD per ruolo authenticated
grant select, insert, update, delete on public.etf                         to authenticated;
grant select, insert, update, delete on public.acquisti                    to authenticated;
grant select, insert, update, delete on public.scenari                     to authenticated;
grant select, insert, update, delete on public.config                      to authenticated;
grant select, insert, update, delete on public.broker                      to authenticated;
grant select, insert, update, delete on public.portafoglio_storico_annuale to authenticated;
grant select, insert, update, delete on public.watchlist                   to authenticated;

-- user_api_keys: solo SELECT per authenticated (INSERT/DELETE via service_role in api/)
grant select on public.user_api_keys to authenticated;

-- asset_class: sola lettura condivisa
grant select on public.asset_class to authenticated;

-- etf_prezzi_storici: lettura + scrittura (backfill prezzi)
grant select, insert, update on public.etf_prezzi_storici to authenticated;

-- broker_sync_log: log import CSV, lettura + insert per authenticated (PAC-131)
grant select, insert on public.broker_sync_log to authenticated;

-- Funzioni SECURITY DEFINER oauth_* (PAC-122): chiamate lato server via service_role
grant execute on function public.oauth_get_client(text)                                             to service_role;
grant execute on function public.oauth_insert_auth_code(text, text, uuid, text, text, text, timestamptz) to service_role;
grant execute on function public.oauth_consume_auth_code(text)                                      to service_role;
grant execute on function public.oauth_insert_refresh_token(text, uuid, text, text, timestamptz)    to service_role;
grant execute on function public.oauth_rotate_refresh_token(text, text, timestamptz)                to service_role;
grant execute on function public.oauth_register_client(text, text, text[])                          to service_role;
```

### Migrazione dati esistenti (PAC-11)

Eseguire in ordine su Supabase SQL editor:

```sql
-- 1. Creare broker "Default" per ogni utente che ha acquisti
insert into broker (user_id, nome, colore)
select distinct user_id, 'Default', '#6366f1'
from acquisti
on conflict (user_id, nome) do nothing;

-- 2. Aggiornare acquisti esistenti con il broker_id del "Default" dell'utente
update acquisti a
set broker_id = b.id
from broker b
where b.user_id = a.user_id and b.nome = 'Default'
  and a.broker_id is null;

-- 3. Aggiornare portafoglio_storico_annuale con broker_id "Default"
update portafoglio_storico_annuale p
set broker_id = b.id
from broker b
where b.user_id = p.user_id and b.nome = 'Default'
  and p.broker_id is null;
```

### Migrazione PAC-61 — rimozione colonna obsoleta

```sql
ALTER TABLE config DROP COLUMN IF EXISTS mostra_proiezione;
```

### Migrazione PAC-96 — aggiunta asset_class

```sql
-- 1. Crea tabella e seed (vedi Schema SQL sopra)

-- 2. Aggiungi FK nullable, backfill, imposta NOT NULL e default
ALTER TABLE etf ADD COLUMN asset_class_id uuid REFERENCES asset_class(id);

DO $$
DECLARE azioni_id uuid;
BEGIN
  SELECT id INTO azioni_id FROM asset_class WHERE nome = 'Azioni';
  UPDATE etf SET asset_class_id = azioni_id WHERE asset_class_id IS NULL;
  EXECUTE format(
    'ALTER TABLE etf ALTER COLUMN asset_class_id SET DEFAULT %L::uuid',
    azioni_id
  );
END $$;

ALTER TABLE etf ALTER COLUMN asset_class_id SET NOT NULL;
```

### Migrazione PAC-131 — import CSV broker

Aggiunge tracciabilità sorgente e dedup su `acquisti`, flag PRO su `config`, nuova tabella `broker_sync_log`.

File: `pac-dashboard/supabase/migrations/20260507000000_pac131_import_csv_schema.sql`

Se la migration fallisce con `could not create unique index acquisti_dedup_fallback` (duplicati preesistenti), applicare prima la fix migration: `20260507000001_pac131_fix_dedup_fallback.sql` — deduplica le righe manuali mantenendo quella fisicamente più vecchia, poi ricrea l'indice.

```sql
-- Colonne acquisti
ALTER TABLE acquisti
  ADD COLUMN IF NOT EXISTS sync_source       text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS tr_transaction_id text;

-- Colonna config
ALTER TABLE config
  ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;

-- Tabella broker_sync_log (+ RLS: vedi sezione sopra)
CREATE TABLE IF NOT EXISTS broker_sync_log ( ... );
```

### Migrazione PAC-135 — rename broker_transaction_id (multi-broker)

Rinomina `tr_transaction_id` → `broker_transaction_id` su `acquisti`, aggiorna gli indici dedup per includere `broker_id`, aggiunge `broker_id` a `broker_sync_log`.

File: `pac-dashboard/supabase/migrations/20260508000000_pac135_broker_transaction_id.sql`

```sql
-- Drop indici vecchi (specifici Trade Republic)
DROP INDEX IF EXISTS acquisti_tr_transaction_id_unique;
DROP INDEX IF EXISTS acquisti_dedup_fallback;

-- Rinomina colonna
ALTER TABLE acquisti
  RENAME COLUMN tr_transaction_id TO broker_transaction_id;

-- Dedup primario: (broker_id, broker_transaction_id) — stesso ID ammesso su broker diversi
CREATE UNIQUE INDEX acquisti_broker_transaction_id_unique
  ON acquisti (broker_id, broker_transaction_id)
  WHERE broker_transaction_id IS NOT NULL;

-- Dedup fallback: include broker_id per non confondere transazioni su broker diversi
CREATE UNIQUE INDEX acquisti_dedup_fallback
  ON acquisti (broker_id, etf_id, data, importo_investito)
  WHERE broker_transaction_id IS NULL;

-- Aggiunge broker_id a broker_sync_log per tracciare quale broker è stato importato
ALTER TABLE broker_sync_log
  ADD COLUMN IF NOT EXISTS broker_id uuid REFERENCES broker(id) ON DELETE SET NULL;
```

### Migrazione PAC-122 — funzioni SECURITY DEFINER per schema oauth

Sostituisce l'accesso diretto `adminClient.schema('oauth').from(...)` con RPC via public schema.
Eseguire dopo aver rimosso `oauth` da `exposed_schemas` in Supabase API settings.

```sql
-- Permette al service role di eseguire le funzioni
GRANT USAGE ON SCHEMA oauth TO service_role;

-- 1. Recupera dati client (usata in authorize.js)
CREATE OR REPLACE FUNCTION public.oauth_get_client(p_client_id text)
RETURNS TABLE(redirect_uris text[], is_active boolean)
LANGUAGE sql SECURITY DEFINER SET search_path = oauth
AS $$
  SELECT redirect_uris, is_active
  FROM oauth.clients
  WHERE client_id = p_client_id;
$$;

-- 2. Inserisce authorization code (usata in authorize.js)
CREATE OR REPLACE FUNCTION public.oauth_insert_auth_code(
  p_code_hash      text,
  p_client_id      text,
  p_user_id        uuid,
  p_redirect_uri   text,
  p_code_challenge text,
  p_scope          text,
  p_expires_at     timestamptz
)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = oauth
AS $$
  INSERT INTO oauth.auth_codes
    (code_hash, client_id, user_id, redirect_uri, code_challenge, scope, expires_at)
  VALUES
    (p_code_hash, p_client_id, p_user_id, p_redirect_uri, p_code_challenge, p_scope, p_expires_at);
$$;

-- 3. Consuma authorization code (DELETE...RETURNING atomico, usata in token.js)
CREATE OR REPLACE FUNCTION public.oauth_consume_auth_code(p_code_hash text)
RETURNS TABLE(
  code_hash      text,
  client_id      text,
  user_id        uuid,
  redirect_uri   text,
  code_challenge text,
  scope          text,
  expires_at     timestamptz
)
LANGUAGE sql SECURITY DEFINER SET search_path = oauth
AS $$
  DELETE FROM oauth.auth_codes
  WHERE code_hash = p_code_hash
    AND expires_at > now()
  RETURNING code_hash, client_id, user_id, redirect_uri, code_challenge, scope, expires_at;
$$;

-- 4. Inserisce refresh token (usata in token.js)
CREATE OR REPLACE FUNCTION public.oauth_insert_refresh_token(
  p_token_hash text,
  p_user_id    uuid,
  p_client_id  text,
  p_scope      text,
  p_expires_at timestamptz
)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = oauth
AS $$
  INSERT INTO oauth.refresh_tokens
    (token_hash, user_id, client_id, scope, expires_at)
  VALUES
    (p_token_hash, p_user_id, p_client_id, p_scope, p_expires_at);
$$;

-- 5. Rotazione atomica refresh token: elimina il vecchio, inserisce il nuovo (usata in token.js)
CREATE OR REPLACE FUNCTION public.oauth_rotate_refresh_token(
  p_old_hash       text,
  p_new_hash       text,
  p_new_expires_at timestamptz
)
RETURNS TABLE(user_id uuid, client_id text, scope text)
LANGUAGE sql SECURITY DEFINER SET search_path = oauth
AS $$
  WITH deleted AS (
    DELETE FROM oauth.refresh_tokens
    WHERE token_hash = p_old_hash
      AND expires_at > now()
    RETURNING user_id, client_id, scope
  ),
  inserted AS (
    INSERT INTO oauth.refresh_tokens (token_hash, user_id, client_id, scope, expires_at)
    SELECT p_new_hash, user_id, client_id, scope, p_new_expires_at
    FROM deleted
    RETURNING user_id, client_id, scope
  )
  SELECT user_id, client_id, scope FROM inserted;
$$;

-- 6. Registra nuovo client OAuth (usata in register.js)
CREATE OR REPLACE FUNCTION public.oauth_register_client(
  p_client_id     text,
  p_name          text,
  p_redirect_uris text[]
)
RETURNS void
LANGUAGE sql SECURITY DEFINER SET search_path = oauth
AS $$
  INSERT INTO oauth.clients (client_id, name, redirect_uris, is_active)
  VALUES (p_client_id, p_name, p_redirect_uris, true);
$$;
```

**Step manuale prerequisito:** in Supabase Dashboard → Settings → API → `exposed_schemas`, rimuovere `oauth` dalla lista. Questo blocca l'accesso diretto a `adminClient.schema('oauth')` da qualsiasi client e forza il passaggio dalle funzioni SECURITY DEFINER.

Verifica dopo migrazione:
```bash
node --env-file=.env scripts/test-oauth-schema.mjs
```

---

### Variabili d'ambiente

```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
SUPABASE_SERVICE_KEY=<service-role-key>    # solo lato server (api/)
VITE_APP_URL=https://etflens.app           # issuer JWT + base URL endpoint OAuth
OAUTH_JWT_SECRET=<secret-64-bytes-base64>  # HMAC-SHA256 JWT signing
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
  "assetClassId": "uuid",
  "acquisti": []
}
```

### Asset Class
```json
{
  "id": "uuid",
  "nome": "Azioni",
  "visibile": true
}
```
Caricata al mount tramite query `WHERE visibile = true`. Usata per popolare il select in fase di inserimento/modifica ETF.

### Acquisto
```json
{
  "id": "uuid",
  "data": "2024-01-15",
  "importoInvestito": 200,
  "prezzoUnitario": 88.20,
  "quoteFrazionate": 2.2676,
  "fee": 0,
  "brokerId": "uuid",
  "syncSource": "manual",
  "brokerTransactionId": null
}
```
`syncSource`: `"manual"` | `"ui_upload"` | `"telegram_bot"`.
`brokerTransactionId`: ID transazione emesso dal broker (UUID v7 per Trade Republic), `null` per acquisti inseriti manualmente. Rinominato da `trTransactionId` in PAC-135 per supporto multi-broker.

### Broker
```json
{
  "id": "uuid",
  "nome": "Default",
  "colore": "#6366f1",
  "archiviato": false
}
```

Stato globale aggiuntivo in `usePortafoglio`:
```json
{
  "broker": [],
  "brokerFiltro": []
}
```
`brokerFiltro` è un array di UUID; array vuoto = tutti i broker aggregati.

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
