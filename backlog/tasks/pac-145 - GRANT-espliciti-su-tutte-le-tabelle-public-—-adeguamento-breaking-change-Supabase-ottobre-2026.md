---
id: PAC-145
title: >-
  GRANT espliciti su tutte le tabelle public — adeguamento breaking change
  Supabase (ottobre 2026)
status: Done
assignee: []
created_date: '2026-05-14 14:13'
updated_date: '2026-05-14 14:15'
labels: []
dependencies: []
references:
  - pac-dashboard/supabase/migrations/20260430000000_pac129_watchlist.sql
  - >-
    pac-dashboard/supabase/migrations/20260423000000_pac122_oauth_security_definer.sql
  - docs/model.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Supabase rimuoverà i GRANT impliciti sullo schema public per tutti i progetti esistenti il 30 ottobre 2026. Attualmente nessuna migrazione include GRANT espliciti per i ruoli `authenticated`/`anon`/`service_role`. Senza di essi, PostgREST restituirà errore 42501 su tutte le tabelle.

Email ufficiale Supabase ricevuta il 14 maggio 2026.

**Tabelle interessate (tutte nel public schema):**
- `etf` — authenticated: SELECT, INSERT, UPDATE, DELETE
- `acquisti` — authenticated: SELECT, INSERT, UPDATE, DELETE
- `scenari` — authenticated: SELECT, INSERT, UPDATE, DELETE
- `config` — authenticated: SELECT, INSERT, UPDATE, DELETE
- `broker` — authenticated: SELECT, INSERT, UPDATE, DELETE
- `portafoglio_storico_annuale` — authenticated: SELECT, INSERT, UPDATE, DELETE
- `etf_prezzi_storici` — authenticated: SELECT, INSERT, UPDATE
- `asset_class` — authenticated: SELECT
- `watchlist` — authenticated: SELECT, INSERT, DELETE
- `user_api_keys` — authenticated: SELECT, INSERT, UPDATE, DELETE

**Funzioni SECURITY DEFINER nel public schema (PAC-122):**
Verificare se necessitano GRANT EXECUTE a `authenticated` o `service_role`.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Nuova migrazione SQL creata in pac-dashboard/supabase/migrations/ con GRANT espliciti su tutte le tabelle public
- [x] #2 Ogni tabella ha GRANT per il ruolo corretto (authenticated per tabelle utente, authenticated per shared tables)
- [x] #3 La migrazione include anche GRANT EXECUTE per le funzioni SECURITY DEFINER oauth_* al ruolo service_role
- [x] #4 docs/model.md aggiornato con i GRANT nella sezione Schema SQL e con la regola: ogni nuova tabella deve includere GRANT espliciti nella propria migrazione
- [x] #5 Nessun GRANT inutile al ruolo anon (l'app richiede sempre autenticazione)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Creata migrazione `pac-dashboard/supabase/migrations/20260514000000_pac145_explicit_grants.sql` con GRANT espliciti per tutti i ruoli necessari su tutte le tabelle public. Aggiornato `docs/model.md` con la sezione "GRANT espliciti" e la regola per le migrazioni future.
<!-- SECTION:FINAL_SUMMARY:END -->
