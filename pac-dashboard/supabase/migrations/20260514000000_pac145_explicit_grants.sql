-- PAC-145: GRANT espliciti su tutte le tabelle public
--
-- Dal 30 ottobre 2026 Supabase rimuove i GRANT impliciti sullo schema public
-- per tutti i progetti esistenti. Senza GRANT espliciti PostgREST restituisce
-- errore 42501.
-- Ref: email Supabase del 14 maggio 2026 — "Changes to the Data API"

-- ── Tabelle utente (CRUD per utente autenticato) ──────────────────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON public.etf                         TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.acquisti                    TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.scenari                     TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.config                      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broker                      TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.portafoglio_storico_annuale TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watchlist                   TO authenticated;

-- user_api_keys: SELECT via anon client (authenticated user); INSERT/DELETE
-- avvengono tramite service_role in api/keys/ (service_role bypassa RLS)
GRANT SELECT ON public.user_api_keys TO authenticated;

-- ── Tabelle condivise ─────────────────────────────────────────────────────

-- asset_class: sola lettura, nessun utente può modificarla via Data API
GRANT SELECT ON public.asset_class TO authenticated;

-- etf_prezzi_storici: lettura + scrittura per utenti autenticati (backfill prezzi)
GRANT SELECT, INSERT, UPDATE ON public.etf_prezzi_storici TO authenticated;

-- broker_sync_log: log import CSV broker (PAC-131)
GRANT SELECT, INSERT ON public.broker_sync_log TO authenticated;

-- ── Funzioni SECURITY DEFINER (PAC-122) ──────────────────────────────────
-- Chiamate lato server (api/oauth/*) con service_role key tramite supabase.rpc()

GRANT EXECUTE ON FUNCTION public.oauth_get_client(text)                                            TO service_role;
GRANT EXECUTE ON FUNCTION public.oauth_insert_auth_code(text, text, uuid, text, text, text, timestamptz) TO service_role;
GRANT EXECUTE ON FUNCTION public.oauth_consume_auth_code(text)                                     TO service_role;
GRANT EXECUTE ON FUNCTION public.oauth_insert_refresh_token(text, uuid, text, text, timestamptz)   TO service_role;
GRANT EXECUTE ON FUNCTION public.oauth_rotate_refresh_token(text, text, timestamptz)               TO service_role;
GRANT EXECUTE ON FUNCTION public.oauth_register_client(text, text, text[])                         TO service_role;
