-- PAC-151: Modello dati piani utente e crediti AI
--
-- Introduce subscription_plan come fonte unica di verita' per il piano
-- utente (sostituisce config.is_pro, usato finora da api/import.js e
-- useBrokerImport.js) e ai_credits per il sistema di crediti AI (PAC-154/155/156).
--
-- Modifiche:
--   1. subscription_plan → nuova tabella, RLS select-only (scritture solo service role)
--   2. ai_credits        → nuova tabella, RLS select-only (scritture solo service role)
--   3. config             → backfill in subscription_plan, poi drop colonna is_pro

-- ── 1. subscription_plan ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS subscription_plan (
  user_id       uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan          text        NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PRO')),
  status        text        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'expired', 'trial')),
  billing_cycle text        CHECK (billing_cycle IN ('monthly', 'annual')),
  renews_at     timestamptz,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE subscription_plan ENABLE ROW LEVEL SECURITY;

CREATE POLICY "subscription_plan_select" ON subscription_plan
  FOR SELECT USING (auth.uid() = user_id);

-- ── 2. ai_credits ───────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_credits (
  user_id                uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  credits_remaining      integer     NOT NULL DEFAULT 0,
  credits_total          integer     NOT NULL DEFAULT 0,
  reset_at               timestamptz,
  purchased_topups_count integer     NOT NULL DEFAULT 0,
  created_at             timestamptz NOT NULL DEFAULT now(),
  updated_at             timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE ai_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ai_credits_select" ON ai_credits
  FOR SELECT USING (auth.uid() = user_id);

-- ── 3. config: backfill e ritiro is_pro ─────────────────────────────────────

INSERT INTO subscription_plan (user_id, plan, status)
SELECT user_id, CASE WHEN is_pro THEN 'PRO' ELSE 'FREE' END, 'active'
FROM config
ON CONFLICT (user_id) DO NOTHING;

ALTER TABLE config DROP COLUMN IF EXISTS is_pro;
