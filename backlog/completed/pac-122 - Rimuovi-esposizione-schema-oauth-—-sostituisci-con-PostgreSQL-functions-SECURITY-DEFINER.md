---
id: PAC-122
title: >-
  Rimuovi esposizione schema oauth — sostituisci con PostgreSQL functions
  SECURITY DEFINER
status: Done
assignee: []
created_date: '2026-04-23 09:39'
updated_date: '2026-04-23 12:01'
labels:
  - oauth
  - security
  - supabase
milestone: m-2 - mcp-ai-layer-—-accesso-dati-portafoglio-via-llm
dependencies:
  - PAC-120
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Lo schema `oauth` è stato temporaneamente esposto negli `exposed_schemas` Supabase per sbloccare i test di integrazione (PAC-119 AC #5 violato). Va ripristinata la design originale: schema non esposto, accesso solo tramite PostgreSQL functions `SECURITY DEFINER` in `public` chiamate via `adminClient.rpc(...)`.

## Motivazione

Con lo schema esposto, le tabelle `oauth.*` sono raggiungibili via PostgREST anche se RLS le blocca senza policy. La superficie di attacco è maggiore del necessario. Il design originale (schema non esposto) garantisce che nessuna richiesta REST raggiunga mai quelle tabelle, indipendentemente da errori di configurazione RLS futuri.

## Modifiche richieste

### 1. Supabase Dashboard
Rimuovere `oauth` dagli `exposed_schemas` in Settings → API.

### 2. Migration — PostgreSQL functions in `public`

Creare una funzione per ogni operazione OAuth che i serverless devono eseguire:

```sql
-- Lettura client
create or replace function public.oauth_get_client(p_client_id text)
returns setof oauth.clients language sql security definer as $$
  select * from oauth.clients where client_id = p_client_id;
$$;

-- Inserimento authorization code
create or replace function public.oauth_insert_auth_code(
  p_code_hash text, p_client_id text, p_user_id uuid,
  p_redirect_uri text, p_code_challenge text, p_expires_at timestamptz
) returns void language sql security definer as $$
  insert into oauth.auth_codes(code_hash, client_id, user_id, redirect_uri, code_challenge, expires_at)
  values (p_code_hash, p_client_id, p_user_id, p_redirect_uri, p_code_challenge, p_expires_at);
$$;

-- Consume authorization code (atomico: legge + segna used)
create or replace function public.oauth_consume_auth_code(p_code_hash text)
returns setof oauth.auth_codes language sql security definer as $$
  update oauth.auth_codes
  set used = true
  where code_hash = p_code_hash and used = false and expires_at > now()
  returning *;
$$;

-- Inserimento refresh token
create or replace function public.oauth_insert_refresh_token(
  p_token_hash text, p_client_id text, p_user_id uuid, p_expires_at timestamptz
) returns void language sql security definer as $$
  insert into oauth.refresh_tokens(token_hash, client_id, user_id, expires_at)
  values (p_token_hash, p_client_id, p_user_id, p_expires_at);
$$;

-- Rotazione refresh token (atomico: elimina vecchio + inserisce nuovo)
create or replace function public.oauth_rotate_refresh_token(
  p_old_hash text, p_new_hash text, p_client_id text, p_user_id uuid, p_new_expires_at timestamptz
) returns uuid language plpgsql security definer as $$
declare
  v_user_id uuid;
begin
  delete from oauth.refresh_tokens
  where token_hash = p_old_hash and revoked_at is null and expires_at > now()
  returning user_id into v_user_id;

  if v_user_id is null then return null; end if;

  insert into oauth.refresh_tokens(token_hash, client_id, user_id, expires_at)
  values (p_new_hash, p_client_id, v_user_id, p_new_expires_at);

  return v_user_id;
end;
$$;
```

### 3. Aggiornamento pattern query in `api/oauth/*.js`

Sostituire `adminClient.schema('oauth').from(...)` con `adminClient.rpc('oauth_*', {...})` in tutti gli endpoint OAuth (PAC-120).

### 4. Aggiornamento `scripts/test-oauth-schema.mjs`

Riscrivere il test per usare `adminClient.rpc(...)` invece di `.schema('oauth').from(...)`.

### 5. Aggiornare PAC-119 AC #5

Riportare la nota che lo schema è non esposto e l'accesso avviene via PG functions.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Schema oauth rimosso dagli exposed_schemas Supabase
- [x] #2 Le 5 PG functions SECURITY DEFINER sono presenti in public e funzionanti
- [x] #3 Nessun endpoint api/oauth/*.js usa adminClient.schema('oauth')
- [x] #4 scripts/test-oauth-schema.mjs verifica le funzioni via rpc e passa
- [ ] #5 PAC-119 AC #5 ripristinato: schema oauth non esposto
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Implementazione completata

### Cosa è stato fatto

**SQL migration** (`docs/model.md` — sezione "Migrazione PAC-122"):
- 6 funzioni SECURITY DEFINER nel public schema che incapsulano tutte le operazioni su `oauth.*`:
  - `oauth_get_client(p_client_id)` — SELECT su `oauth.clients`
  - `oauth_insert_auth_code(...)` — INSERT su `oauth.auth_codes`
  - `oauth_consume_auth_code(p_code_hash)` — DELETE...RETURNING atomico (monouso garantito)
  - `oauth_insert_refresh_token(...)` — INSERT su `oauth.refresh_tokens`
  - `oauth_rotate_refresh_token(p_old_hash, p_new_hash, p_new_expires_at)` — CTE atomica: DELETE old + INSERT new in un'unica transazione
  - `oauth_register_client(p_client_id, p_name, p_redirect_uris)` — INSERT su `oauth.clients`

**Endpoint aggiornati** (tutti usano `adminClient.rpc(...)` invece di `.schema('oauth').from(...)`):
- `api/oauth/authorize.js` — `oauth_get_client` + `oauth_insert_auth_code`
- `api/oauth/token.js` — `oauth_consume_auth_code` (atomico, elimina la doppia query select+delete) + `oauth_insert_refresh_token` + `oauth_rotate_refresh_token`
- `api/oauth/register.js` — `oauth_register_client`

**Test script riscritto** (`scripts/test-oauth-schema.mjs`):
- 9 test case: verifica ogni funzione inclusi casi negativi (codice già consumato, token già ruotato)
- Cleanup automatico dei dati di test alla fine

### Note implementative
- `oauth_consume_auth_code` usa DELETE...RETURNING: il codice viene consumato atomicamente al primo accesso, anche se PKCE fallisce successivamente. Migliora la sicurezza rispetto a SELECT→validate→DELETE (nessuna race condition).
- AC #1 e #5 richiedono uno step manuale in produzione: rimuovere `oauth` da `exposed_schemas` in Supabase Dashboard → Settings → API (documentato in `docs/model.md`).
<!-- SECTION:FINAL_SUMMARY:END -->
