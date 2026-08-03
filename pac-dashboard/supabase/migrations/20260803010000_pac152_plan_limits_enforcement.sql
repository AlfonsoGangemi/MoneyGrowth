-- PAC-152: Enforcement limiti piano FREE (broker, ETF, watchlist)
--
-- Introduce plan_limits (configurabile senza deploy di codice) e un trigger
-- Postgres unico che blocca gli insert oltre soglia su broker/etf/watchlist,
-- sia per insert diretti client (RLS) sia per insert via adminClient service-role
-- (api/import.js). Gli utenti PRO attivi (stessa definizione di getUserPlan()
-- in api/_lib/plan.js: plan='PRO' AND status='active') non sono soggetti a limiti.
--
-- Modifiche:
--   1. plan_limits → nuova tabella, RLS select per tutti gli autenticati
--   2. enforce_plan_limit() + trigger BEFORE INSERT su broker/etf/watchlist

-- ── 1. plan_limits: limiti per piano, NULL = illimitato ────────────────────

CREATE TABLE IF NOT EXISTS plan_limits (
  plan          text PRIMARY KEY,
  max_broker    integer,
  max_etf       integer,
  max_watchlist integer
);

INSERT INTO plan_limits (plan, max_broker, max_etf, max_watchlist)
VALUES ('FREE', 3, 9, 6)
ON CONFLICT (plan) DO NOTHING;

ALTER TABLE plan_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "plan_limits_select_authenticated" ON plan_limits
  FOR SELECT TO authenticated USING (true);

-- ── 2. Trigger di enforcement ────────────────────────────────────────────
--
-- Errore sollevato con SQLSTATE custom 'PLN01' + DETAIL = nome tabella,
-- distinguibile lato client come già si fa oggi con '23505' (unique_violation).

CREATE OR REPLACE FUNCTION enforce_plan_limit()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_is_pro boolean;
  v_limit  integer;
  v_count  integer;
BEGIN
  SELECT (plan = 'PRO' AND status = 'active') INTO v_is_pro
  FROM subscription_plan WHERE user_id = NEW.user_id;

  IF COALESCE(v_is_pro, false) THEN
    RETURN NEW;
  END IF;

  IF TG_TABLE_NAME = 'broker' THEN
    SELECT max_broker INTO v_limit FROM plan_limits WHERE plan = 'FREE';
    SELECT count(*) INTO v_count FROM broker WHERE user_id = NEW.user_id AND archiviato = false;
  ELSIF TG_TABLE_NAME = 'etf' THEN
    SELECT max_etf INTO v_limit FROM plan_limits WHERE plan = 'FREE';
    SELECT count(*) INTO v_count FROM etf WHERE user_id = NEW.user_id AND archiviato = false;
  ELSIF TG_TABLE_NAME = 'watchlist' THEN
    SELECT max_watchlist INTO v_limit FROM plan_limits WHERE plan = 'FREE';
    SELECT count(*) INTO v_count FROM watchlist WHERE user_id = NEW.user_id;
  END IF;

  IF v_limit IS NOT NULL AND v_count >= v_limit THEN
    RAISE EXCEPTION 'plan_limit_reached: %', TG_TABLE_NAME
      USING ERRCODE = 'PLN01', DETAIL = TG_TABLE_NAME;
  END IF;

  RETURN NEW;
END;
$$;

CREATE TRIGGER broker_plan_limit
  BEFORE INSERT ON broker
  FOR EACH ROW EXECUTE FUNCTION enforce_plan_limit();

CREATE TRIGGER etf_plan_limit
  BEFORE INSERT ON etf
  FOR EACH ROW EXECUTE FUNCTION enforce_plan_limit();

CREATE TRIGGER watchlist_plan_limit
  BEFORE INSERT ON watchlist
  FOR EACH ROW EXECUTE FUNCTION enforce_plan_limit();
