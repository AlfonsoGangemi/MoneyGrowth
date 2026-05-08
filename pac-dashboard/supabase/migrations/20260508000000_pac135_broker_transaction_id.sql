-- PAC-135: rename tr_transaction_id → broker_transaction_id, aggiorna indici dedup,
--          aggiunge broker_id a broker_sync_log
--
-- Motivazione:
--   - tr_transaction_id era specifico di Trade Republic; con il supporto multi-broker
--     il nome deve essere generico (lo stesso ID può esistere su broker diversi)
--   - Il dedup primario diventa (broker_id, broker_transaction_id) invece che globale
--   - Il dedup fallback include broker_id per non confondere transazioni identiche
--     su broker diversi
--   - broker_sync_log riceve broker_id per tracciare quale broker è stato importato

-- ── 1. acquisti: drop indici vecchi ──────────────────────────────────────────

DROP INDEX IF EXISTS acquisti_tr_transaction_id_unique;
DROP INDEX IF EXISTS acquisti_dedup_fallback;

-- ── 2. acquisti: rinomina colonna ─────────────────────────────────────────────

ALTER TABLE acquisti
  RENAME COLUMN tr_transaction_id TO broker_transaction_id;

-- ── 3. acquisti: nuovi indici dedup ──────────────────────────────────────────

-- Dedup primario: (broker_id, broker_transaction_id) — permette lo stesso ID
-- su broker diversi (raro ma possibile)
CREATE UNIQUE INDEX acquisti_broker_transaction_id_unique
  ON acquisti (broker_id, broker_transaction_id)
  WHERE broker_transaction_id IS NOT NULL;

-- Dedup fallback: aggiunge broker_id per non confondere transazioni identiche
-- per data/importo/etf su broker diversi
CREATE UNIQUE INDEX acquisti_dedup_fallback
  ON acquisti (broker_id, etf_id, data, importo_investito)
  WHERE broker_transaction_id IS NULL;

-- ── 4. broker_sync_log: aggiunge broker_id ───────────────────────────────────

ALTER TABLE broker_sync_log
  ADD COLUMN IF NOT EXISTS broker_id uuid REFERENCES broker(id) ON DELETE SET NULL;
