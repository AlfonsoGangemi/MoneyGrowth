---
id: PAC-105
title: 'Sicurezza: rate limiting per-utente su /api/keys/generate via query DB'
status: Done
assignee: []
created_date: '2026-04-07 14:20'
updated_date: '2026-04-20 12:10'
labels:
  - security
  - backend
milestone: m-2
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
L'endpoint `/api/keys/generate` non ha protezione contro il key flooding: un utente autenticato può generare centinaia di richieste, gonfiando la tabella `user_api_keys` e aumentando il load su Supabase.

## Soluzione

Rate limiting stateless via query DB: prima dell'insert, contare le chiavi create dall'utente nelle ultime 24h. Se il conteggio supera la soglia, rispondere 429. Nessuna dipendenza da KV o Redis.

```js
const { count } = await adminClient
  .from('user_api_keys')
  .select('*', { count: 'exact', head: true })
  .eq('user_id', userId)
  .gte('created_at', new Date(Date.now() - 86_400_000).toISOString())

if (count >= 5) return res.status(429).json({ error: 'Limite giornaliero raggiunto' })
```

## Nota

Il rate limiting per `/api/mcp` (che richiede KV globale) è trattato in PAC-69.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 L'endpoint /api/keys/generate risponde 429 se lo stesso user_id ha generato 5 o più chiavi nelle ultime 24h
- [x] #2 Il controllo usa una query su user_api_keys (created_at >= now - 24h) senza KV o stato in-memory
- [x] #3 La risposta 429 include un messaggio leggibile (es. 'Limite giornaliero raggiunto')
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Implementato in `pac-dashboard/api/keys/generate.js`. Prima dell'insert, conta le chiavi con `created_at >= now - 24h` per `user_id`; se >= 5 risponde 429 con messaggio leggibile. Nessuna dipendenza da KV o Redis.
<!-- SECTION:FINAL_SUMMARY:END -->
