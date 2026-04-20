---
id: PAC-113
title: >-
  Sicurezza critica: service key isolation — SUPABASE_SERVICE_KEY mai nel bundle
  Vite
status: Done
assignee: []
created_date: '2026-04-18 16:18'
updated_date: '2026-04-20 11:22'
labels:
  - security
  - backend
milestone: m-2
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problema

`SUPABASE_SERVICE_KEY` non deve mai avere prefisso `VITE_`. Le variabili `VITE_*` vengono iniettate nel bundle JS client da Vite e sono visibili in chiaro a chiunque apra il browser DevTools. La service key bypassa RLS su tutti gli utenti: se trapela è un data breach globale.

## Azioni

- Denominare la variabile `SUPABASE_SERVICE_KEY` (senza `VITE_`) in Vercel env
- Verificare che nessun file sotto `src/` la referenzi come `import.meta.env.SUPABASE_SERVICE_KEY` o simili
- Aggiungere un test/check di build che verifichi l'assenza della stringa `SUPABASE_SERVICE_KEY` nel bundle output e nei sourcemap

## Riferimento originale

Estratto da PAC-104 (archiviato) — concern C1.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 SUPABASE_SERVICE_KEY non ha prefisso VITE_ in Vercel env e in nessun file del progetto
- [x] #2 Nessun file sotto src/ referenzia SUPABASE_SERVICE_KEY tramite import.meta.env
- [x] #3 SUPABASE_SERVICE_KEY non compare in nessun output di build Vite (bundle .js, sourcemap .map)
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
- AC #1: chiave creata su Vercel come `SUPABASE_SERVICE_KEY` (senza `VITE_`) — fatto manualmente dall'utente
- AC #2: grep su `src/` confermato — nessun riferimento a `SUPABASE_SERVICE_KEY` via `import.meta.env`
- AC #3: aggiunto `scripts/check-bundle-secrets.mjs` che scansiona `dist/**/*.{js,map,html}` e fallisce se trova la stringa; agganciato alla fine dello script `build` in `package.json`; check eseguito sul bundle esistente → OK
<!-- SECTION:FINAL_SUMMARY:END -->
