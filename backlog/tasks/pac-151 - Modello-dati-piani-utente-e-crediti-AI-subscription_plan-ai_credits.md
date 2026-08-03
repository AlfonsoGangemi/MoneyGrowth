---
id: PAC-151
title: 'Modello dati piani utente e crediti AI (subscription_plan, ai_credits)'
status: To Do
assignee: []
created_date: '2026-07-31 07:29'
updated_date: '2026-08-03 12:22'
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
- [ ] #1 Esiste su Supabase un'entità subscription_plan associata all'utente con valori FREE/PRO
- [ ] #2 L'entità piano include stato abbonamento (attivo, scaduto, in trial), data rinnovo e tipo di ciclo (mensile/annuale)
- [ ] #3 Esiste la tabella ai_credits con crediti residui, crediti totali del ciclo, data di reset e contatore ricariche acquistate
- [ ] #4 Le RLS policy impediscono a un utente di leggere o scrivere piano/crediti di un altro utente
- [ ] #5 Le modifiche allo schema sono documentate in docs/ secondo le regole del progetto
- [ ] #6 config.is_pro è ritirata: dati esistenti riportati (backfill) in subscription_plan, colonna eliminata
- [ ] #7 api/import.js e useBrokerImport.js leggono lo stato PRO da subscription_plan (non più da config.is_pro)
<!-- AC:END -->
