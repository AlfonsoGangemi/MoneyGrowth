CREATE TABLE watchlist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  isin        text NOT NULL CHECK (isin ~ '^[A-Z]{2}[A-Z0-9]{10}$'),
  nome        text,
  emittente   text,
  created_at  timestamptz DEFAULT now(),
  UNIQUE (user_id, isin)
);

ALTER TABLE watchlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "watchlist_select" ON watchlist FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "watchlist_insert" ON watchlist FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "watchlist_delete" ON watchlist FOR DELETE USING (auth.uid() = user_id);
