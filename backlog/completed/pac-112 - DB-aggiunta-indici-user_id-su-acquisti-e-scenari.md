---
id: PAC-112
title: 'DB: aggiunta indici user_id su acquisti e scenari'
status: Done
assignee: []
created_date: '2026-04-18 15:59'
updated_date: '2026-04-20 12:52'
labels:
  - database
milestone: m-2
dependencies: []
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Le tabelle `acquisti` e `scenari` non hanno indici su `user_id`. Tutte le query del MCP layer (e dell'app) filtrano per `user_id` con service key (nessuna RLS), rendendo la seq scan l'unico percorso disponibile.

Per `acquisti` si usa un indice composito `(user_id, etf_id)` che copre con un solo indice sia le query per solo `user_id` (prefisso sinistro) sia quelle per `user_id + etf_id` (tool `get_acquisti(etf_ids?)`). Tutte le query nel MCP layer hanno sempre `user_id` come primo filtro.

Le altre tabelle con `user_id` sono già coperte da indici impliciti:
- `broker` → `UNIQUE(user_id, nome)`
- `etf` → `UNIQUE(user_id, isin)`
- `portafoglio_storico_annuale` → `UNIQUE(user_id, anno, broker_id)`
- `config` → `user_id` è PK

## Migrazione SQL

```sql
create index on acquisti(user_id, etf_id);
create index on scenari(user_id);
```

Da eseguire su Supabase SQL editor.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Indice composito su acquisti(user_id, etf_id) creato in Supabase
- [x] #2 Indice su scenari(user_id) creato in Supabase
- [x] #3 docs/model.md aggiornato con i due CREATE INDEX nello schema SQL
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Indici creati manualmente su Supabase SQL editor. `docs/model.md` già aggiornato con i due `CREATE INDEX` (righe 109-110). Tutti gli AC soddisfatti.
<!-- SECTION:FINAL_SUMMARY:END -->
