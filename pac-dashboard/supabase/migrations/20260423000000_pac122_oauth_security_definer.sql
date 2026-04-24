-- PAC-122: Funzioni SECURITY DEFINER per lo schema oauth
--
-- Parte 1: allinea lo schema PAC-119 con le colonne usate dal codice applicativo
-- Parte 2: crea le funzioni RPC nel public schema
--
-- Prerequisito manuale (una-tantum in produzione):
--   Supabase Dashboard → Settings → API → exposed_schemas
--   Rimuovere 'oauth' dalla lista.
--
-- Verifica post-migrazione:
--   node --env-file=.env scripts/test-oauth-schema.mjs

-- ── Parte 1: colonne mancanti ─────────────────────────────────────────────

-- oauth.clients: colonna is_active per revoca client
ALTER TABLE oauth.clients
  ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- oauth.auth_codes: colonna scope per tracking per-code
ALTER TABLE oauth.auth_codes
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'portfolio:read';

-- oauth.refresh_tokens: colonna scope per tracking per-token
ALTER TABLE oauth.refresh_tokens
  ADD COLUMN IF NOT EXISTS scope text NOT NULL DEFAULT 'portfolio:read';

-- ── Parte 2: permessi e funzioni SECURITY DEFINER ─────────────────────────

GRANT USAGE ON SCHEMA oauth TO service_role;

-- ── 1. oauth_get_client ───────────────────────────────────────────────────
-- Usata da: api/oauth/authorize.js
CREATE OR REPLACE FUNCTION public.oauth_get_client(p_client_id text)
RETURNS TABLE(redirect_uris text[], is_active boolean)
LANGUAGE sql
SECURITY DEFINER
SET search_path = oauth
AS $$
  SELECT redirect_uris, is_active
  FROM oauth.clients
  WHERE client_id = p_client_id;
$$;

-- ── 2. oauth_insert_auth_code ─────────────────────────────────────────────
-- Usata da: api/oauth/authorize.js
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = oauth
AS $$
  INSERT INTO oauth.auth_codes
    (code_hash, client_id, user_id, redirect_uri, code_challenge, scope, expires_at)
  VALUES
    (p_code_hash, p_client_id, p_user_id, p_redirect_uri, p_code_challenge, p_scope, p_expires_at);
$$;

-- ── 3. oauth_consume_auth_code ────────────────────────────────────────────
-- DELETE...RETURNING atomico: il codice è monouso e viene eliminato
-- al primo accesso, anche se la verifica PKCE fallisce successivamente.
-- Usata da: api/oauth/token.js (grant authorization_code)
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
LANGUAGE sql
SECURITY DEFINER
SET search_path = oauth
AS $$
  DELETE FROM oauth.auth_codes
  WHERE code_hash = p_code_hash
    AND expires_at > now()
  RETURNING code_hash, client_id, user_id, redirect_uri, code_challenge, scope, expires_at;
$$;

-- ── 4. oauth_insert_refresh_token ─────────────────────────────────────────
-- Usata da: api/oauth/token.js (al termine del grant authorization_code)
CREATE OR REPLACE FUNCTION public.oauth_insert_refresh_token(
  p_token_hash text,
  p_user_id    uuid,
  p_client_id  text,
  p_scope      text,
  p_expires_at timestamptz
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = oauth
AS $$
  INSERT INTO oauth.refresh_tokens
    (token_hash, user_id, client_id, scope, expires_at)
  VALUES
    (p_token_hash, p_user_id, p_client_id, p_scope, p_expires_at);
$$;

-- ── 5. oauth_rotate_refresh_token ─────────────────────────────────────────
-- CTE atomica: elimina il token vecchio e inserisce il nuovo nella stessa
-- transazione. Se il vecchio token non esiste o è scaduto, restituisce
-- zero righe → il chiamante risponde 401 invalid_grant.
-- Usata da: api/oauth/token.js (grant refresh_token)
CREATE OR REPLACE FUNCTION public.oauth_rotate_refresh_token(
  p_old_hash       text,
  p_new_hash       text,
  p_new_expires_at timestamptz
)
RETURNS TABLE(user_id uuid, client_id text, scope text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = oauth
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

-- ── 6. oauth_register_client ──────────────────────────────────────────────
-- Usata da: api/oauth/register.js
CREATE OR REPLACE FUNCTION public.oauth_register_client(
  p_client_id     text,
  p_name          text,
  p_redirect_uris text[]
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = oauth
AS $$
  INSERT INTO oauth.clients (client_id, name, redirect_uris, is_active)
  VALUES (p_client_id, p_name, p_redirect_uris, true);
$$;
