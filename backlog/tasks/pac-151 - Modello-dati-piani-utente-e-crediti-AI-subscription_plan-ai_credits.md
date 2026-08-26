---
id: PAC-151
title: 'Modello dati piani utente e crediti AI (subscription_plan, ai_credits)'
status: Done
assignee: []
created_date: '2026-07-31 07:29'
updated_date: '2026-08-26 14:23'
labels: []
milestone: m-5
dependencies: []
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Fondamenta dati per il piano Pro: serve un'entità piano per utente (subscription_plan) e una tabella crediti AI (ai_credits), entrambe protette da RLS, su cui si baseranno tutti gli altri task della milestone (enforcement limiti, AI, pagamenti).

Nel repo esisteva già `config.is_pro` (PAC-131), unico gate PRO usato da `api/import.js` e `useBrokerImport.js`. Decisione presa in fase di analisi: `subscription_plan` diventa l'unica fonte di verità per lo stato del piano — niente doppia fonte dati. `config.is_pro` viene ritirato (backfill in `subscription_plan` + drop colonna) e i due consumer esistenti migrati a leggere dalla nuova tabella tramite l'helper condiviso `api/_lib/plan.js` (`getUserPlan`).
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Esiste su Supabase un'entità subscription_plan associata all'utente con valori FREE/PRO
- [x] #2 L'entità piano include stato abbonamento (attivo, scaduto, in trial), data rinnovo e tipo di ciclo (mensile/annuale)
- [x] #3 Esiste la tabella ai_credits con crediti residui, crediti totali del ciclo, data di reset e contatore ricariche acquistate
- [x] #4 Le RLS policy impediscono a un utente di leggere o scrivere piano/crediti di un altro utente
- [x] #5 Le modifiche allo schema sono documentate in docs/ secondo le regole del progetto
- [x] #6 config.is_pro è ritirata: dati esistenti riportati (backfill) in subscription_plan, colonna eliminata
- [x] #7 api/import.js e useBrokerImport.js leggono lo stato PRO da subscription_plan (non più da config.is_pro)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
1. Migrazione `supabase/migrations/20260803000000_pac151_subscription_plan_ai_credits.sql`: creazione tabelle `subscription_plan` (plan FREE/PRO, status active/expired/trial, billing_cycle monthly/annual, renews_at) e `ai_credits` (credits_remaining, credits_total, reset_at, purchased_topups_count), entrambe con RLS SELECT-only per l'utente proprietario (le scritture passano solo da service role).
2. Backfill: INSERT in subscription_plan da `config.is_pro` esistente, poi `DROP COLUMN is_pro` da `config`.
3. Helper condiviso `api/_lib/plan.js` (`getUserPlan`) come unica fonte di lettura del piano lato server.
4. Migrazione consumer: `api/import.js` usa `getUserPlan()`; `src/hooks/useBrokerImport.js` e `src/hooks/usePortafoglio.js` leggono direttamente `subscription_plan` lato client.
5. Documentazione aggiornata in docs/architecture.md, docs/model.md, docs/serverless-functions.md.
<!-- SECTION:PLAN:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementato lo schema dati fondamenta per il piano Pro (commit ecfaa3f).

**Schema**: nuove tabelle `subscription_plan` (piano/stato/ciclo/rinnovo, PK user_id) e `ai_credits` (crediti residui/totali, reset, contatore ricariche), entrambe RLS-protette (SELECT solo per l'utente proprietario, nessuna policy di scrittura per authenticated → solo service role può scrivere).

**Ritiro config.is_pro**: backfill in subscription_plan (`PRO` se `is_pro=true`, altrimenti `FREE`) seguito da `DROP COLUMN is_pro`. Nessuna doppia fonte di verità residua: verificato che `is_pro` non compare più in nessun path di codice attivo (solo in commenti/migrazioni storiche).

**Consumer migrati**: `api/import.js` usa il nuovo helper `getUserPlan()` in `api/_lib/plan.js`; `useBrokerImport.js` e `usePortafoglio.js` leggono `subscription_plan` direttamente.

**Documentazione**: aggiornata in docs/architecture.md, docs/model.md, docs/serverless-functions.md.

**Nota**: task già implementato e committato ma lo stato in Backlog era rimasto "To Do" — verificato ora tutti i 7 AC contro il codice effettivo e chiuso di conseguenza. Nessun test automatico dedicato trovato per le nuove tabelle/RLS (solo verifica manuale via lettura schema/codice).
<!-- SECTION:FINAL_SUMMARY:END -->
