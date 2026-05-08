---
id: PAC-134
title: 'Vercel Cron Job: re-sync giornaliero automatico transazioni Trade Republic'
status: To Do
assignee: []
created_date: '2026-05-02 14:10'
labels:
  - backend
  - cron
  - pro
milestone: m-3
dependencies:
  - PAC-133
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Configurare un Vercel Cron Job che esegue il re-sync automatico ogni giorno per tutti gli utenti PRO con account TR collegato.

## Implementazione
- Endpoint `GET /api/tr/cron-sync` protetto da `CRON_SECRET` header (Vercel best practice)
- Itera su tutti gli utenti PRO con `broker_credentials` attive
- Chiama la logica di sync (riusa PAC-133) per ciascun utente
- Configurazione in `vercel.json`:
```json
{
  "crons": [{ "path": "/api/tr/cron-sync", "schedule": "0 6 * * *" }]
}
```
- Limite: 1 Cron Job su piano Hobby Vercel → verificare compatibilità con altri cron già presenti

## Note
- Vercel Hobby plan: max 1 cron job — se già usato, valutare alternativa (Supabase pg_cron o external scheduler)
- Loggare risultato per ogni utente in `broker_sync_log`
- Evitare sync paralleli per lo stesso utente (lock ottimistico tramite colonna `sync_in_progress`)
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Cron job configurato in vercel.json
- [ ] #2 Endpoint protetto da CRON_SECRET
- [ ] #3 Sync eseguito con successo per tutti gli utenti PRO attivi
- [ ] #4 Compatibilità con limite piano Hobby Vercel verificata e documentata
- [ ] #5 Fallimenti per singolo utente non bloccano gli altri
<!-- AC:END -->
