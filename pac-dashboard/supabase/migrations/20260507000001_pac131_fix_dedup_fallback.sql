-- PAC-131 fix: dedup acquisti esistenti + retry indice fallback
--
-- Motivo: la migration 20260507000000 ha fallito al CREATE UNIQUE INDEX
-- acquisti_dedup_fallback perché esistono già righe con (etf_id, data,
-- importo_investito) duplicati. Questo script pulisce i duplicati
-- mantenendo la riga fisicamente più vecchia (ctid ASC) e poi ricrea
-- l'indice.
--
-- Prima di applicare: verifica quali righe verranno eliminate con:
--   SELECT etf_id, data, importo_investito, COUNT(*), array_agg(id ORDER BY ctid)
--   FROM acquisti WHERE tr_transaction_id IS NULL
--   GROUP BY etf_id, data, importo_investito HAVING COUNT(*) > 1;

-- ── 1. Elimina duplicati manuali ─────────────────────────────────────────────

WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY etf_id, data, importo_investito
      ORDER BY ctid ASC  -- mantiene la riga inserita prima (fisicamente)
    ) AS rn
  FROM acquisti
  WHERE tr_transaction_id IS NULL
)
DELETE FROM acquisti
WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

-- ── 2. Crea l'indice ora che i dati sono puliti ───────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS acquisti_dedup_fallback
  ON acquisti (etf_id, data, importo_investito)
  WHERE tr_transaction_id IS NULL;

-- ── 3. Crea broker_sync_log se non esiste già ─────────────────────────────────
-- (potrebbe non essere stato creato se la migration precedente si è interrotta
--  prima di arrivare a questo punto)

CREATE TABLE IF NOT EXISTS broker_sync_log (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  synced_at      timestamptz NOT NULL DEFAULT now(),
  source         text        NOT NULL DEFAULT 'ui_upload',
  rows_total     int,
  rows_inserted  int,
  rows_skipped   int,
  error_message  text
);

CREATE INDEX IF NOT EXISTS broker_sync_log_user_id_idx
  ON broker_sync_log (user_id, synced_at DESC);

ALTER TABLE broker_sync_log ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'broker_sync_log' AND policyname = 'broker_sync_log_select'
  ) THEN
    CREATE POLICY "broker_sync_log_select" ON broker_sync_log
      FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'broker_sync_log' AND policyname = 'broker_sync_log_insert'
  ) THEN
    CREATE POLICY "broker_sync_log_insert" ON broker_sync_log
      FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;
