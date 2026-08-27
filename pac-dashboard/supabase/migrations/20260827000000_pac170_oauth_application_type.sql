-- PAC-170: application_type per client OAuth (RFC 7591 / OIDC DCR, SEP-837)
--
-- Richiesto dallo spec MCP 2026-07-28: i client DEVONO specificare application_type
-- durante la Dynamic Client Registration per evitare conflitti di redirect URI in
-- stile OpenID Connect. Valori supportati: 'web' (redirect https, default OIDC se
-- omesso) e 'native' (redirect loopback/custom-scheme — client desktop/CLI come
-- Claude Desktop, Claude Code; vedi RFC 8252, già gestito da redirectUriMatches()).
--
-- Verifica post-migrazione:
--   node --env-file=.env scripts/test-oauth-schema.mjs

ALTER TABLE oauth.clients
  ADD COLUMN IF NOT EXISTS application_type text NOT NULL DEFAULT 'web'
    CHECK (application_type IN ('web', 'native'));

CREATE OR REPLACE FUNCTION public.oauth_register_client(
  p_client_id        text,
  p_name             text,
  p_redirect_uris    text[],
  p_application_type text DEFAULT 'web'
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = oauth
AS $$
  INSERT INTO oauth.clients (client_id, name, redirect_uris, is_active, application_type)
  VALUES (p_client_id, p_name, p_redirect_uris, true, p_application_type);
$$;
