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
  id                uuid primary key default gen_random_uuid(),
  etf_id            uuid references etf(id) on delete cascade not null,
  user_id           uuid references auth.users(id) on delete cascade not null,
  data              date not null,
  importo_investito numeric not null,
  prezzo_unitario   numeric not null,
  quote_frazionate  numeric not null,
  fee               numeric not null default 0,
  broker_id         uuid references broker(id) on delete restrict not null,
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
  broker_filtro     uuid[] not null default '{}'
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

-- Indici aggiuntivi (PAC-112)
create index on acquisti(user_id, etf_id);
create index on scenari(user_id);
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
  "brokerId": "uuid"
}
```

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
