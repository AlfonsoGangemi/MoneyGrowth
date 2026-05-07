---
id: PAC-131
title: 'Schema Supabase — import CSV broker (acquisti, is_pro, broker_sync_log)'
status: Done
assignee: []
created_date: '2026-05-02 14:10'
updated_date: '2026-05-07 17:44'
labels:
  - database
  - supabase
  - pro
milestone: m-4
dependencies: []
references:
  - 'https://github.com/cdamken/Trade_Republic_Connector'
documentation:
  - >-
    pac-dashboard/supabase/migrations/20260507000000_pac131_import_csv_schema.sql
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Aggiornamento schema Supabase per supportare il flusso di import CSV broker — indipendente dal canale di delivery (UI o Telegram bot).

**Tabelle coinvolte:**

### 1. `acquisti` (colonne aggiuntive)
```sql
ALTER TABLE acquisti
  ADD COLUMN sync_source TEXT DEFAULT 'manual',        -- 'manual' | 'ui_upload' | 'telegram_bot'
  ADD COLUMN tr_transaction_id TEXT UNIQUE;            -- ID ordine TR per dedup
```

### 2. `config` (colonna aggiuntiva)
```sql
ALTER TABLE config
  ADD COLUMN is_pro BOOLEAN NOT NULL DEFAULT false;
```

### 3. `broker_sync_log` (nuova)
Log degli import CSV per tracciabilità.

```sql
CREATE TABLE broker_sync_log (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  synced_at    TIMESTAMPTZ DEFAULT now(),
  source       TEXT DEFAULT 'ui_upload',              -- 'ui_upload' | 'telegram_bot'
  rows_total   INT,
  rows_inserted INT,
  rows_skipped  INT,
  error_message TEXT
);
```

**RLS:** abilitare su tutte le tabelle con policy `auth.uid() = user_id`.

### Tabella esclusa da questo task
`telegram_links` — gestita in PAC-132 (milestone m-3), dipende dal bot Telegram.

Acceptance Criteria:
- [ ] #1 Migration SQL: colonne `sync_source` e `tr_transaction_id` aggiunte ad `acquisti` con UNIQUE constraint su `tr_transaction_id`
- [ ] #2 Migration SQL: colonna `is_pro` aggiunta a `config`
- [ ] #3 Tabella `broker_sync_log` creata con RLS
- [ ] #4 Constraint composito `(etf_id, data, importo_investito)` su `acquisti` come fallback dedup
- [ ] #5 Migration applicabile idempotentemente (IF NOT EXISTS / IF column does not exist)
- [ ] #6 Nessuna tabella `broker_credentials` o `telegram_links` in questo task
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Migration SQL: colonne `sync_source` e `tr_transaction_id` aggiunte ad `acquisti` con UNIQUE constraint su `tr_transaction_id`
- [x] #2 Migration SQL: colonna `is_pro` aggiunta a `config`
- [x] #3 Tabella `broker_sync_log` creata con RLS abilitata (policy `auth.uid() = user_id`)
- [x] #4 Constraint composito `(etf_id, data, importo_investito)` su `acquisti` come fallback dedup
- [x] #5 Migration applicabile idempotentemente (IF NOT EXISTS / IF column does not exist)
- [x] #6 Nessuna tabella `broker_credentials` o `telegram_links` in questo task — `telegram_links` è gestita in PAC-132 (m-3)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
["1. Scrivere migration SQL completa in `supabase/migrations/`", "2. Testare su Supabase staging (dashboard SQL editor)", "3. Verificare RLS con utente autenticato e utente non autenticato", "4. Applicare in produzione", "5. Aggiornare `docs/model.md` con le nuove tabelle e colonne"]
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Migration SQL completa in `pac-dashboard/supabase/migrations/20260507000000_pac131_import_csv_schema.sql`: colonne `sync_source` e `tr_transaction_id` su `acquisti`, indici dedup (primario su `tr_transaction_id`, fallback su `etf_id+data+importo_investito`), colonna `is_pro` su `config`, nuova tabella `broker_sync_log` con RLS. Fix migration `20260507000001_pac131_fix_dedup_fallback.sql` per gestire ambienti con dati duplicati preesistenti. Documentazione aggiornata in `docs/model.md`.
<!-- SECTION:FINAL_SUMMARY:END -->
