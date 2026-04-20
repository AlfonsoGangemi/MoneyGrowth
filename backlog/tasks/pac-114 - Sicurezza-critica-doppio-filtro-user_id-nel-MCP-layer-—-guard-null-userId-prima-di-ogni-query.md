---
id: PAC-114
title: >-
  Sicurezza critica: doppio filtro user_id nel MCP layer — guard null userId
  prima di ogni query
status: To Do
assignee: []
created_date: '2026-04-18 16:18'
labels:
  - security
  - backend
milestone: m-2
dependencies:
  - PAC-108
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problema

Il flusso critico è: `api_key` → sha256 → lookup `user_api_keys` → `user_id`. Se il lookup restituisce null (chiave non trovata, bug, race condition) e la query dati successiva non ha un filtro esplicito `.eq('user_id', userId)`, Supabase con service key restituisce i dati di **tutti gli utenti** — data breach globale.

## Pattern obbligatorio in `api/mcp.js`

```js
const userId = await resolveUserIdFromApiKey(apiKey)
if (!userId) return res.status(401).json({ error: 'Unauthorized' })

// OGNI query dati deve avere .eq('user_id', userId) hardcoded
const { data } = await adminClient.from('etf')
  .select('*, acquisti(*)')
  .eq('user_id', userId)   // ← mai omettere, mai parametrizzare da input
```

## Azioni

- Creare helper `resolveUserIdFromApiKey(key)` → `string | null` con early return 401 se null
- Aggiungere guard esplicita `if (!userId) return 401` dopo ogni chiamata all'helper
- Ogni `.from(table)` nel MCP handler deve avere `.eq('user_id', userId)` come primo filtro — mai omettere, mai parametrizzare da input utente
- Test unitario: key non trovata → 401, nessuna query dati eseguita

## Riferimento originale

Estratto da PAC-104 (archiviato) — concern C2.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 Se api_key non trovata o non valida, l'endpoint ritorna 401 prima di eseguire qualsiasi query Supabase
- [ ] #2 Ogni query dati in api/mcp.js ha .eq('user_id', userId) hardcoded come primo filtro
- [ ] #3 Test unitario: lookup chiave fallisce → nessuna query DB eseguita → risposta 401
<!-- AC:END -->
