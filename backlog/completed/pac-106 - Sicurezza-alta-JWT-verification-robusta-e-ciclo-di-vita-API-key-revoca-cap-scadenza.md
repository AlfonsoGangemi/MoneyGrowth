---
id: PAC-106
title: >-
  Sicurezza alta: JWT verification robusta e ciclo di vita API key (revoca, cap,
  scadenza)
status: Done
assignee: []
created_date: '2026-04-07 14:21'
updated_date: '2026-04-20 13:21'
labels:
  - security
  - backend
  - frontend
milestone: m-2
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Tre problemi distinti sul ciclo di vita delle API key, tutti di priorità alta.

## A1 — JWT verification server-side per generazione chiave

L'endpoint `/api/keys/generate` riceve il JWT Supabase dall'app React (header `Authorization: Bearer <jwt>`). Il JWT non deve mai essere fiduciato lato client senza verifica server-side.

**Pattern corretto:**
```js
// ✓ Verifica server-side: Supabase valida firma RS256
const { data: { user }, error } = await supabase.auth.getUser(jwtFromHeader)
if (error || !user) return res.status(401).json({ error: 'JWT non valido' })
const userId = user.id  // ← questo è sicuro
```

**Pattern da evitare:**
```js
// ✗ MAI fidarsi del body/params per user_id
const { user_id } = req.body  // falsificabile
```

## A2 — Cancellazione chiave (hard delete)

Una chiave compromessa dà accesso ai dati finanziari a tempo indeterminato. Servono:
- Endpoint `DELETE /api/keys/:keyId` autenticato con JWT (verifica che la chiave appartenga all'utente richiedente)
- Hard delete fisico: `DELETE FROM user_api_keys WHERE id = :keyId AND user_id = :userId`
- **Nessun `revoked_at`**: la cancellazione è permanente e immediata
- Il lookup in `resolveUserIdFromApiKey` filtra solo su `expires_at > now()` (le cancellate non esistono più in tabella)
- UI: lista chiavi con `created_at`, `last_used_at`, pulsante "Revoca" (che esegue il delete fisico)

## A3 — Cap chiavi per utente (key flooding)

Un utente autenticato potrebbe generare N chiavi senza limite, gonfiando la tabella.

**Soluzione:**
- Limite hard: massimo **2** chiavi non scadute per utente (una attiva, una di riserva durante la rotazione)
- Enforced a livello DB: trigger `BEFORE INSERT` su `user_api_keys` (conta `WHERE user_id = NEW.user_id AND expires_at > now()`)
- Enforced a livello applicativo: conta chiavi attive prima dell'insert, rifiuta con 409 se al limite
- Il messaggio di errore deve suggerire di revocare la chiave esistente
- Il cleanup delle scadute avviene prima del conteggio (vedi PAC-108)

## A4 — Scadenza automatica

`expires_at timestamptz DEFAULT now() + interval '90 days'` nella tabella. Il lookup ignora chiavi scadute (`expires_at > now()`). L'UI mostra la data di scadenza.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Il JWT viene validato server-side con supabase.auth.getUser(), mai da parametri client
- [x] #2 Endpoint DELETE /api/keys/:keyId esegue hard delete fisico con verifica ownership
- [x] #3 Un utente non può avere più di 2 chiavi non scadute simultanee (rifiuto con 409)
- [x] #4 Il lookup chiave filtra solo su expires_at > now() (nessun filtro revoked_at — campo non esiste)
- [x] #5 UI mostra lista chiavi con last_used_at, expires_at e pulsante revoca per ciascuna
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
A1/A3/A4 implementati in `api/keys/generate.js` (JWT via `auth.getUser()`, cap 2 chiavi, cleanup scadute, rate limit 24h). A2 implementato in `api/keys/[keyId].js` (DELETE con ownership check, hard delete fisico, 404 se non trovata). AC #5 (UI lista chiavi con last_used_at, expires_at, pulsante revoca) coperto da PAC-110 AC #1.
<!-- SECTION:FINAL_SUMMARY:END -->
