---
id: PAC-125
title: >-
  Fix: WWW-Authenticate header invia error="invalid_token" su richieste senza
  token (McpAuthorizationError Claude.ai)
status: Done
assignee: []
created_date: '2026-04-28 11:03'
labels:
  - bug
  - oauth
  - mcp
  - security
dependencies: []
references:
  - pac-dashboard/api/mcp.js
  - 'https://datatracker.ietf.org/doc/html/rfc6750#section-3'
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Problema

Quando Claude.ai Desktop tentava di connettersi all'endpoint MCP (`/api/mcp`) per la prima volta (senza token), il server rispondeva con:

```
HTTP 401
WWW-Authenticate: Bearer error="invalid_token", resource_metadata="https://etflens.app/.well-known/oauth-protected-resource"
```

### Perché è sbagliato

Secondo **RFC 6750 Section 3**, il parametro `error="invalid_token"` deve essere incluso nell'header `WWW-Authenticate` **solo quando un token è stato fornito ma è invalido/scaduto/revocato**. Una richiesta senza token deve restituire una challenge Bearer senza `error`:

```
WWW-Authenticate: Bearer resource_metadata="..."
```

### Effetto osservato

Claude.ai Desktop riceveva `error="invalid_token"` già sulla richiesta iniziale (prima ancora di aver completato l'OAuth flow). Il client interpretava questo come un rifiuto esplicito delle credenziali, mostrando all'utente:

> **McpAuthorizationError**: "Your account was authorized but the integration rejected the credentials, so the connection was reverted."

L'utente completava correttamente il consenso OAuth, ma la connessione veniva comunque rifiutata.

---

## Root Cause

**File:** `api/mcp.js`, funzione handler principale.

**Codice difettoso (prima del fix):**
```js
const userId = await resolveUserId(req.headers['authorization'])
if (!userId) {
  const base = (process.env.VITE_APP_URL ?? 'https://etflens.app').replace(/\/$/, '')
  // `error="invalid_token"` sempre presente, anche senza token!
  res.setHeader('WWW-Authenticate', `Bearer error="invalid_token", resource_metadata="${base}/.well-known/oauth-protected-resource"`)
  return res.status(401).json({ error: 'Unauthorized' })
}
```

---

## Fix applicato

Il parametro `error` viene ora incluso **solo se un `Authorization` header era presente** (token fornito ma rifiutato dal server).

```js
const authHeader = req.headers['authorization']
const userId = await resolveUserId(authHeader)
if (!userId) {
  const base = (process.env.VITE_APP_URL ?? 'https://etflens.app').replace(/\/$/, '')
  // RFC 6750: error="invalid_token" solo se un token era presente ma invalido
  const errorPart = authHeader ? `error="invalid_token", ` : ''
  res.setHeader('WWW-Authenticate', `Bearer ${errorPart}resource_metadata="${base}/.well-known/oauth-protected-resource"`)
  return res.status(401).json({ error: 'Unauthorized' })
}
```

### Comportamento corretto dopo il fix

| Scenario | Header restituito |
|---|---|
| Richiesta senza token (prima connessione) | `Bearer resource_metadata="..."` |
| Token presente ma JWT verification fallita | `Bearer error="invalid_token", resource_metadata="..."` |

---

## Note aggiuntive

- Verificare su Vercel Dashboard che `OAUTH_JWT_SECRET` e `VITE_APP_URL` siano consistenti tra le funzioni `/api/oauth/token` e `/api/mcp`.
- Il formato `Bearer, resource_metadata=...` (con virgola subito dopo Bearer) era anche sintatticamente invalido per RFC 7235 — corretto nella stessa patch.
<!-- SECTION:DESCRIPTION:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Fix in `api/mcp.js`: il parametro `error=\"invalid_token\"` nell'header `WWW-Authenticate` ora viene incluso solo quando un token Authorization era effettivamente presente nella richiesta. Le richieste iniziali senza token ricevono una plain Bearer challenge conforme a RFC 6750, permettendo a Claude.ai Desktop di avviare correttamente il flusso OAuth invece di interpretare la risposta come un rifiuto definitivo delle credenziali.
<!-- SECTION:FINAL_SUMMARY:END -->
