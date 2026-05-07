-- PAC-131: Schema Supabase per import CSV broker
--
-- Aggiunge l'infrastruttura necessaria al flusso di import acquisti da broker
-- (Trade Republic e futuri), indipendente dal canale di delivery (UI o Telegram bot).
--
-- Modifiche:
--   1. acquisti      → colonne sync_source, tr_transaction_id + indice dedup composito
--   2. config        → colonna is_pro
--   3. broker_sync_log → nuova tabella con RLS

-- ── 1. acquisti: tracciabilità sorgente e dedup ───────────────────────────────

ALTER TABLE acquisti
  ADD COLUMN IF NOT EXISTS sync_source       text NOT NULL DEFAULT 'manual',
  ADD COLUMN IF NOT EXISTS tr_transaction_id text;

-- Dedup primario: un tr_transaction_id deve essere univoco tra tutti gli utenti
-- (è un UUID v7 emesso da TR, globalmente univoco per ordine)
CREATE UNIQUE INDEX IF NOT EXISTS acquisti_tr_transaction_id_unique
  ON acquisti (tr_transaction_id)
  WHERE tr_transaction_id IS NOT NULL;

-- Dedup fallback: stessa data + stesso importo sullo stesso ETF non può
-- provenire da due import distinti (usato se tr_transaction_id è assente)
CREATE UNIQUE INDEX IF NOT EXISTS acquisti_dedup_fallback
  ON acquisti (etf_id, data, importo_investito)
  WHERE tr_transaction_id IS NULL;

-- ── 2. config: flag piano PRO ─────────────────────────────────────────────────

ALTER TABLE config
  ADD COLUMN IF NOT EXISTS is_pro boolean NOT NULL DEFAULT false;

-- ── 3. broker_sync_log: tracciabilità import ─────────────────────────────────

CREATE TABLE IF NOT EXISTS broker_sync_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  synced_at      timestamptz NOT NULL DEFAULT now(),
  source         text        NOT NULL DEFAULT 'ui_upload', -- 'ui_upload' | 'telegram_bot'
  rows_total     int,
  rows_inserted  int,
  rows_skipped   int,
  error_message  text
);

CREATE INDEX IF NOT EXISTS broker_sync_log_user_id_idx
  ON broker_sync_log (user_id, synced_at DESC);

ALTER TABLE broker_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "broker_sync_log_select" ON broker_sync_log
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "broker_sync_log_insert" ON broker_sync_log
  FOR INSERT WITH CHECK (auth.uid() = user_id);
