---
id: PAC-104
title: 'Sicurezza critica: service key isolation e doppio filtro user_id nel MCP layer'
status: To Do
assignee: []
created_date: '2026-04-07 14:20'
labels:
  - security
  - backend
milestone: m-2
dependencies: []
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Due vulnerabilità critiche da risolvere prima di qualsiasi deploy del MCP layer.

## C1 — Service key isolation (bundle Vite)

`SUPABASE_SERVICE_KEY` non deve mai avere prefisso `VITE_`. Le variabili `VITE_*` vengono iniettate nel bundle JS client da Vite e sono visibili in chiaro a chiunque apra il browser DevTools. La service key bypassa RLS su tutti gli utenti: se trapela è un data breach globale.

**Azioni:**
- Denominare la variabile `SUPABASE_SERVICE_KEY` (senza `VITE_`) in Vercel env
- Verificare che nessun file sotto `src/` la referenzi come `import.meta.env.*`
- Aggiungere test di build che verifichi l'assenza di `SUPABASE_SERVICE_KEY` nel bundle output

## C2 — Doppio filtro user_id (null → leak globale)

Il flusso critico è: `api_key` → sha256 → lookup `user_api_keys` → `user_id`. Se il lookup restituisce null (chiave non trovata, bug, race condition) e la query dati successiva non ha un filtro esplicito, Supabase con service key restituisce i dati di **tutti gli utenti**.

**Pattern obbligatorio in `api/mcp.js`:**
```js
const userId = await resolveUserIdFromApiKey(apiKey)
if (!userId) return res.status(401).json({ error: 'Unauthorized' })

// OGNI query dati deve avere .eq('user_id', userId) hardcoded
const { data } = await adminClient.from('etf')
  .select('*, acquisti(*)')
  .eq('user_id', userId)   // ← mai omettere, mai parametrizzare da input
```

**Azioni:**
- Creare helper `resolveUserIdFromApiKey(key)` → `string | null` con early return
- Aggiungere guard esplicita dopo ogni chiamata all'helper
- Ogni `.from(table)` nel MCP handler deve avere `.eq('user_id', userId)` come primo filtro
- Test unitario: key non trovata → 401, nessuna query dati eseguita
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [ ] #1 SUPABASE_SERVICE_KEY non compare in nessun output di build Vite (bundle, sourcemap)
- [ ] #2 Se api_key non trovata, l'endpoint ritorna 401 prima di eseguire qualsiasi query Supabase
- [ ] #3 Ogni query dati in api/mcp.js ha .eq('user_id', userId) hardcoded
- [ ] #4 Test unitario: lookup chiave fallisce → nessuna query DB eseguita → 401
<!-- AC:END -->
