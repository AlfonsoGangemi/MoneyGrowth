# MCP Authentication — Requisiti Ufficiali

Riassunto della documentazione ufficiale per il layer OAuth del server MCP ETF Lens.
Fonti: [modelcontextprotocol.io/specification/2025-03-26/basic/authorization](https://modelcontextprotocol.io/specification/2025-03-26/basic/authorization) · [claude.com/docs/connectors/building/authentication](https://claude.com/docs/connectors/building/authentication) · [claude.com/docs/connectors/building](https://claude.com/docs/connectors/building)

---

## 1. Protocollo base

- Standard di riferimento: **OAuth 2.1** (draft-ietf-oauth-v2-1-12) + **PKCE obbligatorio**
- Grant type richiesto per utenti umani: `authorization_code` con PKCE S256
- Transport MCP supportato: **Streamable HTTP** (l'HTTP+SSE legacy è deprecato)
- Versioni protocollo MCP supportate da Claude.ai: `2025-03-26`, `2025-06-18`, `2025-11-25`

---

## 2. Discovery dell'Authorization Server

Il client MCP **DEVE** eseguire la discovery (RFC 8414) prima di qualsiasi altra operazione.

### Authorization Base URL

> "The authorization base URL **MUST** be determined from the MCP server URL by discarding any existing path component."

Con MCP server URL `https://etflens.app/api/mcp`:
- Authorization base URL → `https://etflens.app`
- Metadata endpoint → `https://etflens.app/.well-known/oauth-authorization-server`

### Campi obbligatori nel metadata response

```json
{
  "issuer":                              "https://etflens.app",
  "authorization_endpoint":             "https://etflens.app/oauth/authorize",
  "token_endpoint":                     "https://etflens.app/api/oauth/token",
  "registration_endpoint":              "https://etflens.app/api/oauth/register",
  "response_types_supported":           ["code"],
  "grant_types_supported":              ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported":   ["S256"],
  "token_endpoint_auth_methods_supported": ["none"]
}
```

`"none"` in `token_endpoint_auth_methods_supported` è il modo corretto per indicare public clients senza client secret (PKCE).

### Fallback senza discovery

Se il server non espone il metadata endpoint (404), il client **DEVE** usare i percorsi di default relativi all'authorization base URL:

| Endpoint         | Path di default |
|------------------|-----------------|
| Authorization    | `/authorize`    |
| Token            | `/token`        |
| Registration     | `/register`     |

---

## 3. Dynamic Client Registration (DCR — RFC 7591)

Il client MCP si registra dinamicamente prima di iniziare il flusso OAuth. Il server **DOVREBBE** supportare DCR.

**Request:** `POST /api/oauth/register`
```json
{
  "client_name": "Claude",
  "redirect_uris": ["https://claude.ai/api/mcp/auth_callback"],
  "token_endpoint_auth_method": "none",
  "grant_types": ["authorization_code", "refresh_token"],
  "response_types": ["code"]
}
```

**Response attesa (RFC 7591):**
```json
{
  "client_id": "<uuid>",
  "client_name": "Claude",
  "redirect_uris": ["https://claude.ai/api/mcp/auth_callback"],
  "grant_types": ["authorization_code", "refresh_token"],
  "token_endpoint_auth_method": "none"
}
```

---

## 4. Flusso autorizzazione completo

```
Client                          Server
  │                               │
  │  GET /.well-known/oauth-      │
  │      authorization-server     │
  │ ─────────────────────────────►│
  │ ◄─────────────────────────────│  200 metadata JSON
  │                               │
  │  POST /api/oauth/register     │
  │ ─────────────────────────────►│
  │ ◄─────────────────────────────│  201 client_id
  │                               │
  │  Browser: GET /oauth/authorize│
  │  ?code_challenge=...          │
  │ ─────────────────────────────►│
  │               (utente acconsente nella SPA)
  │  redirect ?code=...&state=... │
  │ ◄─────────────────────────────│
  │                               │
  │  POST /api/oauth/token        │
  │  {code, code_verifier, ...}   │
  │ ─────────────────────────────►│
  │ ◄─────────────────────────────│  {access_token, refresh_token, ...}
  │                               │
  │  POST /api/mcp                │
  │  Authorization: Bearer <JWT>  │
  │ ─────────────────────────────►│
  │ ◄─────────────────────────────│  MCP response
```

---

## 5. Access Token (JWT)

### Claim obbligatori (RFC 9068 + MCP spec)

| Claim | Valore atteso                          | Note                                      |
|-------|----------------------------------------|-------------------------------------------|
| `sub` | UUID utente (Supabase `auth.users.id`) | Identifica l'utente                       |
| `iss` | `https://etflens.app`                  | Deve corrispondere all'`issuer` nel metadata |
| `aud` | `https://etflens.app/api/mcp`          | **CRITICO**: deve corrispondere al `resource` nel protected-resource metadata |
| `exp` | now + 3600                             | Scadenza 1 ora                            |
| `iat` | now                                    | Issued at                                 |

### Perché `aud` deve essere la URL della risorsa

RFC 9728 (Protected Resource Metadata) lega il claim `aud` all'identificatore della risorsa protetta (`resource`). Claude.ai legge `/.well-known/oauth-protected-resource` e si aspetta che il JWT emesso abbia `aud` uguale a quel valore.

Se `aud` non corrisponde, Claude.ai potrebbe rifiutare il token **prima** di inviare qualsiasi richiesta a `/api/mcp` — da cui l'assenza di log sul server.

### Token response obbligatoria

```json
{
  "access_token":  "<JWT>",
  "token_type":    "Bearer",
  "expires_in":    3600,
  "refresh_token": "<opaque>",
  "scope":         "portfolio:read"
}
```

---

## 6. Protected Resource Metadata (RFC 9728)

Esposto su `/.well-known/oauth-protected-resource`.

```json
{
  "resource":              "https://etflens.app/api/mcp",
  "authorization_servers": ["https://etflens.app"],
  "scopes_supported":      ["portfolio:read"]
}
```

Il valore di `resource` **deve coincidere esattamente** con l'`aud` claim del JWT.

---

## 7. Requisiti specifici di Claude.ai

Dalla documentazione `claude.com/docs/connectors/building/authentication`:

| Requisito | Dettaglio |
|-----------|-----------|
| Callback URL | `https://claude.ai/api/mcp/auth_callback` (hosted: web, desktop, mobile) |
| Refresh token | Rotazione obbligatoria; refresh reattivo su 401 + proattivo 5 min prima della scadenza |
| Errori token | Restituire codici RFC 6749 conformi (es. `invalid_grant`) |
| Metodo auth supportato | `oauth_dcr` (Dynamic Client Registration) — il metodo usato da ETF Lens |
| Client isolation | Claude.ai usa **una singola OAuth app condivisa** per connector (no multi-tenant isolation) |

> "Authentication is the most common stumbling block — Claude's auth support differs from the generic MCP specification."

---

## 8. Uso del token lato server

Il client **DEVE** includere il token in ogni richiesta HTTP:

```
Authorization: Bearer <access-token>
```

Il server **DEVE**:
- Validare il JWT (firma, scadenza, issuer, audience)
- Restituire `401` con `WWW-Authenticate` appropriato se il token è invalido/scaduto
- **Non** mettere il token nella query string

Header `WWW-Authenticate` per token assente (nessun token fornito):
```
WWW-Authenticate: Bearer resource_metadata="https://etflens.app/.well-known/oauth-protected-resource"
```

Header `WWW-Authenticate` per token invalido/scaduto:
```
WWW-Authenticate: Bearer error="invalid_token", resource_metadata="https://etflens.app/.well-known/oauth-protected-resource"
```

---

## 9. Limiti operativi

| Parametro | Claude.ai / Desktop | Claude Code |
|-----------|---------------------|-------------|
| Dimensione massima risposta | ~150.000 caratteri | 25.000 token (configurabile) |
| Timeout | 300 secondi | — |

---

## 10. Stato attuale implementazione ETF Lens

| Requisito | Stato |
|-----------|-------|
| `/.well-known/oauth-authorization-server` | ✅ implementato |
| `/.well-known/oauth-protected-resource` | ✅ implementato |
| DCR (`POST /api/oauth/register`) | ✅ implementato |
| Flusso PKCE S256 | ✅ implementato |
| Rotazione refresh token | ✅ implementato |
| JWT `aud` = `https://etflens.app/api/mcp` | ⚠️ fix in attesa di deploy (era `'etflens-mcp'`) |
| WWW-Authenticate RFC 6750 | ✅ implementato |
| Streamable HTTP stateless | ✅ implementato |
