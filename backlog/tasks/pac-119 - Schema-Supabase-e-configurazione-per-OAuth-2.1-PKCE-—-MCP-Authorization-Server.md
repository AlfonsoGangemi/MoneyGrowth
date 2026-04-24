---
id: PAC-119
title: >-
  Schema Supabase e configurazione per OAuth 2.1 + PKCE — MCP Authorization
  Server
status: Done
assignee: []
created_date: '2026-04-21 12:50'
updated_date: '2026-04-23 06:59'
labels:
  - supabase
  - oauth
  - security
  - mcp
milestone: m-2 - mcp-ai-layer-—-accesso-dati-portafoglio-via-llm
dependencies:
  - PAC-117
references:
  - docs/oauth-pkce-analysis.md#7-nuove-tabelle-supabase
  - docs/oauth-pkce-analysis.md#4-architettura-proposta-su-vercel
documentation:
  - docs/oauth-pkce-analysis.md
  - docs/model.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Creare le 3 tabelle Supabase, i seed data e la variabile d'ambiente necessari come prerequisito infrastrutturale per implementare l'Authorization Server OAuth 2.1 + PKCE su Vercel (PAC-117).

Questo task copre **solo la parte DB/infrastruttura**: nessun endpoint `/api/oauth/*.js` (quelli sono task separati).

---

## Schema dedicato `oauth`

Le tabelle vengono create nello schema `oauth` (non `public`) per:
- Namespace pulito — il prefisso `oauth_` nel nome tabella è ridondante se già nello schema
- Non esposto via REST API Supabase per default (solo `public` è accessibile via `anon key`)
- Permessi granulari: solo `service_role` ha accesso; nessun client browser può raggiungerle

```sql
create schema if not exists oauth;

-- Accesso esclusivo via service_role (usata dai serverless api/oauth/*.js)
grant usage on schema oauth to service_role;
grant all on all tables in schema oauth to service_role;
alter default privileges in schema oauth grant all on tables to service_role;
```

> **Non aggiungere `oauth` agli `exposed_schemas` in Supabase:** deve restare inaccessibile via REST API pubblica. L'accesso avviene solo server-side tramite `createClient(url, SUPABASE_SERVICE_KEY)`.

---

## Tabelle da creare

### 1. `oauth.clients`

```sql
create table oauth.clients (
  client_id     text primary key,
  name          text not null,
  redirect_uris text[] not null,
  created_at    timestamptz default now()
);

-- Seed client pre-registrati
-- Entrambi i loopback: alcuni client CLI usano 127.0.0.1 invece di localhost
insert into oauth.clients values
  ('etflens-claude-desktop', 'Claude Desktop', ARRAY['http://localhost', 'http://127.0.0.1']),
  ('etflens-claude-code',    'Claude Code',    ARRAY['http://localhost', 'http://127.0.0.1']),
  ('etflens-cursor',         'Cursor',         ARRAY['http://localhost', 'http://127.0.0.1']),
  ('etflens-other',          'Other',          ARRAY['http://localhost', 'http://127.0.0.1']);
```

### 2. `oauth.auth_codes`

```sql
create table oauth.auth_codes (
  id                    uuid primary key default gen_random_uuid(),
  code_hash             text not null unique,
  user_id               uuid references auth.users not null,
  client_id             text references oauth.clients not null,
  redirect_uri          text not null,
  code_challenge        text not null,
  code_challenge_method text not null default 'S256',
  used                  boolean not null default false,
  expires_at            timestamptz not null default now() + interval '5 minutes',
  created_at            timestamptz default now()
);

create index on oauth.auth_codes(code_hash) where used = false;
```

### 3. `oauth.refresh_tokens`

```sql
create table oauth.refresh_tokens (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text not null unique,
  user_id      uuid references auth.users not null,
  client_id    text references oauth.clients not null,
  revoked_at   timestamptz,
  expires_at   timestamptz not null default now() + interval '90 days',
  created_at   timestamptz default now()
);

create index on oauth.refresh_tokens(token_hash) where revoked_at is null;
```

### RLS

```sql
alter table oauth.clients       enable row level security;
alter table oauth.auth_codes    enable row level security;
alter table oauth.refresh_tokens enable row level security;
-- Nessuna policy SELECT: accesso solo via service_role in api/oauth/*.js
```

---

## Nota redirect URI loopback (RFC 8252 §7.3)

Per indirizzi loopback (`localhost`, `127.0.0.1`) il server di autorizzazione **non deve fare exact match sulla porta** — solo schema e host. Un redirect a `http://localhost:34521/callback` è valido se la tabella contiene `http://localhost`. Per qualsiasi altro URI (non loopback) il match deve essere esatto. Questa logica va implementata in `api/oauth/authorize.js`.

---

## Variabile d'ambiente

Aggiungere `OAUTH_JWT_SECRET` su Vercel (Production + Preview):
- Tipo: stringa random 64 byte (es. `openssl rand -base64 64`)
- Uso: firma HMAC-SHA256 degli JWT access token (TTL 1h) emessi da `api/oauth/token.js`
- **Non esporre mai nel bundle Vite / client-side**

Aggiungere anche nel file `.env.local` per sviluppo locale.

---

## Dipendenza npm

Aggiungere `jose` come dipendenza di produzione:

```bash
npm install jose
```

Usata da `api/oauth/token.js` e `api/mcp.js` per firma/verifica JWT. Zero dipendenze native, compatibile con Vercel Edge.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Schema `oauth` creato su Supabase Production; `grant usage` e `grant all on all tables` assegnati a `service_role`
- [x] #2 Le 3 tabelle (`oauth.clients`, `oauth.auth_codes`, `oauth.refresh_tokens`) esistono con schema esatto come da questo task
- [x] #3 I 4 client seed sono presenti in `oauth.clients` con redirect_uris `['http://localhost', 'http://127.0.0.1']` per ciascuno
- [x] #4 Gli indici parziali sono presenti su `oauth.auth_codes(code_hash) where used = false` e `oauth.refresh_tokens(token_hash) where revoked_at is null`
- [x] #5 RLS abilitata su tutte e 3 le tabelle; schema `oauth` NON aggiunto agli `exposed_schemas` Supabase
- [x] #6 `OAUTH_JWT_SECRET` configurato su Vercel (Production e Preview) e documentato in `.env.local.example`
- [x] #7 Dipendenza `jose` aggiunta a `package.json` e installata
- [x] #8 Verificare in `api/oauth/authorize.js`: validazione redirect_uri ignora la porta per host loopback, fa exact match per tutti gli altri URI (RFC 8252 §7.3)
<!-- AC:END -->
