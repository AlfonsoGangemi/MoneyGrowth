---
id: PAC-8
title: 'Schema DB Supabase: constraint di unicità e nuove tabelle'
status: Done
assignee: []
created_date: '2026-03-10 16:43'
updated_date: '2026-03-11 08:18'
labels:
  - ops
  - database
  - supabase
dependencies: []
references:
  - spec/model.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Modifiche manuali da eseguire sul progetto Supabase (SQL Editor) per completare lo schema DB. Include l'aggiunta di constraint di unicità mancanti sulle tabelle esistenti, la creazione delle nuove tabelle previste da PAC-3 e PAC-7, e le nuove colonne per PAC-10.

---

### 1. Constraint mancante su tabella esistente `etf`

Aggiungere unicità su `(user_id, isin)` per impedire che lo stesso utente inserisca due volte lo stesso ISIN:

```sql
ALTER TABLE etf
  ADD CONSTRAINT etf_user_isin_unique UNIQUE (user_id, isin);
```

---

### 2. Nuova colonna `fee` su tabella `acquisti` (PAC-10)

```sql
ALTER TABLE acquisti
  ADD COLUMN fee numeric NOT NULL DEFAULT 0;
```

---

### 3. Nuova tabella `etf_prezzi_storici` (PAC-3)

Storico prezzi mensili condiviso tra utenti, indicizzato per ISIN:

```sql
CREATE TABLE etf_prezzi_storici (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  isin       text NOT NULL,
  anno       int NOT NULL,
  mese       int NOT NULL CHECK (mese BETWEEN 1 AND 12),
  prezzo     numeric(12,4) NOT NULL,
  creato_il  timestamptz DEFAULT now(),
  UNIQUE (isin, anno, mese)
);

-- RLS: lettura e scrittura per tutti gli utenti autenticati
ALTER TABLE etf_prezzi_storici ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated read" ON etf_prezzi_storici
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "authenticated write" ON etf_prezzi_storici
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "authenticated update" ON etf_prezzi_storici
  FOR UPDATE USING (auth.role() = 'authenticated');
```

---

### 4. Nuova tabella `portafoglio_storico_annuale` (PAC-7)

Valore del portafoglio per anno, persistito per utente:

```sql
CREATE TABLE portafoglio_storico_annuale (
  id             uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id        uuid REFERENCES auth.users NOT NULL,
  anno           int NOT NULL,
  valore         numeric(14,2) NOT NULL,
  totale_versato numeric(14,2) NOT NULL,
  aggiornato_il  timestamptz DEFAULT now(),
  UNIQUE (user_id, anno)
);

-- RLS: ogni utente vede e modifica solo i propri record
ALTER TABLE portafoglio_storico_annuale ENABLE ROW LEVEL SECURITY;

CREATE POLICY "user own" ON portafoglio_storico_annuale
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());
```

---

### 5. Aggiornare `spec/model.md`

Dopo aver applicato le modifiche su Supabase, aggiornare [spec/model.md](spec/model.md) con il DDL completo e aggiornato (constraint, nuove tabelle, RLS).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Constraint `UNIQUE (user_id, isin)` aggiunto alla tabella `etf` su Supabase
- [x] #2 Colonna `fee numeric NOT NULL DEFAULT 0` aggiunta alla tabella `acquisti`
- [x] #3 Tabella `etf_prezzi_storici` creata con constraint `UNIQUE (isin, anno, mese)` e RLS per utenti autenticati
- [x] #4 Tabella `portafoglio_storico_annuale` creata con constraint `UNIQUE (user_id, anno)` e RLS per user_id
- [x] #5 `spec/model.md` aggiornato con DDL completo: constraint, nuove colonne, nuove tabelle e relative policy RLS
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Le modifiche manuali su Supabase erano già state applicate dall'utente (criteri 1-4 spuntati). Completato il criterio 5: `spec/model.md` aggiornato con lo schema completo includendo:\n- `UNIQUE (user_id, isin)` sulla tabella `etf`\n- Colonna `fee numeric not null default 0` sulla tabella `acquisti`\n- Nuova tabella `etf_prezzi_storici` con `UNIQUE (isin, anno, mese)` e RLS per authenticated\n- Nuova tabella `portafoglio_storico_annuale` con `UNIQUE (user_id, anno)` e RLS per user_id\n- Modello frontend `Acquisto` aggiornato con il campo `fee`
<!-- SECTION:FINAL_SUMMARY:END -->
