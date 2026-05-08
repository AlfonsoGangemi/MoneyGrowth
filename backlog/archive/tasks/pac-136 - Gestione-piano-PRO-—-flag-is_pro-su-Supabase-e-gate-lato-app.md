---
id: PAC-136
title: Gestione piano PRO — flag is_pro su Supabase e gate lato app
status: To Do
assignee: []
created_date: '2026-05-02 14:20'
labels:
  - database
  - supabase
  - pro
  - auth
milestone: m-3
dependencies:
  - PAC-131
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementare la gestione del piano PRO tramite un flag booleano `is_pro` sulla tabella `profiles` in Supabase.

## Schema
- Aggiungere colonna `is_pro BOOLEAN DEFAULT FALSE NOT NULL` a `profiles`
- Aggiungere colonna `pro_activated_at TIMESTAMPTZ` (opzionale, per analytics)
- RLS invariata: ogni utente vede solo il proprio profilo

## Lato app
- Hook `usePro()` che legge `is_pro` dal profilo Supabase dell'utente corrente
- Componente `<ProGate>` (o HOC) che wrappa le sezioni PRO: se FREE mostra CTA upgrade, se PRO mostra il contenuto
- Attivazione manuale del flag da parte dell'admin (via Supabase dashboard o endpoint admin protetto)

## Endpoint admin (opzionale, per il futuro)
- `POST /api/admin/set-pro` — protetto da ruolo admin Supabase, imposta `is_pro` per un utente

## Note
- Per ora l'attivazione PRO è manuale (nessun sistema di pagamento integrato in questo scope)
- Il flag va letto ad ogni mount dell'app (incluso nel profilo utente già caricato da Supabase Auth)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Colonna is_pro aggiunta alla tabella profiles con migrazione SQL
- [ ] #2 Hook usePro() disponibile e funzionante
- [ ] #3 Componente ProGate implementato e riusabile
- [ ] #4 Gate applicato su tutte le sezioni PRO (Trade Republic sync, configurazione avanzata broker)
- [ ] #5 CTA upgrade visibile agli utenti FREE nelle sezioni gated
- [ ] #6 Documentato in docs/architecture.md
<!-- AC:END -->
