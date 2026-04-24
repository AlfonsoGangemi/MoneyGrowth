---
id: PAC-120
title: Implementazione Authorization Server OAuth 2.1 + PKCE per MCP
status: Done
assignee: []
created_date: '2026-04-23 07:11'
updated_date: '2026-04-23 11:07'
labels:
  - oauth
  - mcp
  - security
  - vercel
milestone: m-2 - mcp-ai-layer-—-accesso-dati-portafoglio-via-llm
dependencies:
  - PAC-119
references:
  - docs/oauth-pkce-analysis.md#4-architettura-proposta-su-vercel
  - docs/oauth-pkce-analysis.md#5-flusso-completo-pkce
  - docs/oauth-pkce-analysis.md#8-strategia-di-autenticazione-duale
documentation:
  - docs/oauth-pkce-analysis.md
priority: high
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Implementare l'Authorization Server OAuth 2.1 + PKCE come funzioni serverless Vercel, aggiornare `api/mcp.js` con dual-auth, e configurare il routing per il discovery endpoint.

Prerequisiti infrastrutturali pronti: schema `oauth.*` su Supabase, `OAUTH_JWT_SECRET`, dipendenza `jose` (PAC-119).

Riferimento architetturale completo: `docs/oauth-pkce-analysis.md`.

---

## File da creare

### `api/oauth/metadata.js` — Discovery endpoint (RFC 8414)

`GET /.well-known/oauth-authorization-server` (via rewrite `vercel.json`)

Risponde con il JSON di metadata dell'AS:
```json
{
  "issuer": "https://etflens.app",
  "authorization_endpoint": "https://etflens.app/oauth/authorize",
  "token_endpoint": "https://etflens.app/api/oauth/token",
  "registration_endpoint": "https://etflens.app/api/oauth/register",
  "response_types_supported": ["code"],
  "grant_types_supported": ["authorization_code", "refresh_token"],
  "code_challenge_methods_supported": ["S256"]
}
```

Note: `authorization_endpoint` punta alla route SPA (`/oauth/authorize`), non all'endpoint serverless.

---

### `src/components/OAuthConsent.jsx` — Consent page React

Route SPA (`/oauth/authorize`): mostra all'utente loggato la consent page.

Flusso:
1. Legge i parametri OAuth dalla query string (`client_id`, `redirect_uri`, `code_challenge`, `code_challenge_method`, `state`, `scope`)
2. Recupera la sessione Supabase da localStorage (`supabase.auth.getSession()`)
3. Se non loggato: mostra `AuthForm` o redirect al login con `next=/oauth/authorize?...` come parametro
4. Se loggato: mostra nome client + scope richiesti + pulsante "Autorizza"
5. Al click "Autorizza": POST a `/api/oauth/authorize` con body JSON:
   ```json
   {
     "client_id": "...",
     "redirect_uri": "...",
     "code_challenge": "...",
     "code_challenge_method": "S256",
     "state": "...",
     "scope": "...",
     "access_token": "<supabase-access-token>"
   }
   ```
6. Riceve `{ redirect_to: "redirect_uri?code=...&state=..." }` e fa `window.location.href = redirect_to`

---

### `api/oauth/authorize.js` — Emissione authorization code (POST-only)

**POST** — riceve il consenso dal componente React, emette il code.

1. Legge `access_token` dal body JSON, chiama `adminClient.auth.getUser(access_token)` → ottiene `user_id`
2. Valida `client_id` in `oauth.clients` (esiste + `is_active = true`)
3. Valida `redirect_uri` con `redirectUriMatches()` da `_lib.js`
4. Valida `code_challenge` presente + `code_challenge_method = 'S256'`
5. Genera `authorization_code` random (32 byte), ne salva l'hash SHA-256 in `oauth.auth_codes`
6. Risponde `{ redirect_to: "redirect_uri?code=<raw_code>&state=<state>" }`

**Validazione `redirect_uri` (RFC 8252 §7.3):**
- Per host loopback (`localhost`, `127.0.0.1`): confronta solo schema + host, ignora porta
- Per qualsiasi altro URI: exact match completo
- Rifiuta con 400 se l'URI non è in `oauth.clients.redirect_uris`

Nessun `Authorization` HTTP header — il token Supabase viaggia nel body POST come campo `access_token`.

---

### `api/oauth/token.js` — Scambio code → token + refresh

**POST** con `Content-Type: application/x-www-form-urlencoded`

**grant_type=authorization_code:**
1. Cerca `code_hash` in `oauth.auth_codes` (non scaduto, non usato)
2. Verifica PKCE: `SHA256(code_verifier)` (base64url) === `code_challenge` salvato
3. Verifica `redirect_uri` e `client_id` corrispondenti
4. Segna il code come `used = true` (one-time use)
5. Emette:
   - `access_token`: JWT firmato con `OAUTH_JWT_SECRET`, payload `{ sub: user_id, iss: 'https://etflens.app', aud: 'etflens-mcp', exp: now+3600 }`
   - `refresh_token`: 32 byte random opaco, hash SHA-256 salvato in `oauth.refresh_tokens` (TTL 90gg)

**grant_type=refresh_token:**
1. Cerca `token_hash` in `oauth.refresh_tokens` (non scaduto, non revocato)
2. Ruota il refresh token (elimina vecchio, inserisce nuovo)
3. Emette nuovo access token JWT (TTL 1h)

---

### `api/oauth/register.js` — Dynamic client registration (RFC 7591, opzionale)

**POST** — permette a client non pre-registrati di registrarsi dinamicamente. Inserisce riga in `oauth.clients`. Utile per client MCP che non rientrano nei 4 seed.

---

## File da modificare

### `src/App.jsx` — Route `/oauth/authorize`

Aggiungere route per `OAuthConsent.jsx` in `App.jsx`.

### `api/mcp.js` — Dual-auth

Aggiungere validazione JWT OAuth in parallelo alla logica `pac_` esistente:

```js
async function resolveUserId(authHeader) {
  const token = authHeader?.replace('Bearer ', '') ?? ''
  if (token.startsWith('pac_')) {
    return resolveUserIdFromApiKey(token)   // flusso esistente invariato
  }
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.OAUTH_JWT_SECRET))
    return payload.sub ?? null
  } catch {
    return null
  }
}
```

### `vercel.json` — Rewrite discovery endpoint

```json
{
  "rewrites": [
    { "source": "/.well-known/oauth-authorization-server", "destination": "/api/oauth/metadata" }
  ]
}
```

Note: `/oauth/authorize` NON viene riscritto — Vercel deve servire la SPA su quel path.

### `vite.config.js` — Routing dev per `/api/oauth/*`

Aggiungere nel plugin `api-dev` il routing per i 3 handler OAuth, in modo da poterli testare in locale con `npm run dev`.

---

## Stima effort (da PAC-117)

| Endpoint | Giorni |
|---|---|
| `metadata.js` | 0.5 |
| `OAuthConsent.jsx` + route App.jsx | 1.5 |
| `authorize.js` | 2 |
| `token.js` | 3 |
| `register.js` | 1 |
| `api/mcp.js` dual-auth | 1 |
| `vercel.json` + `vite.config.js` | 0.5 |
| **Totale** | **9.5** |

Test unitari e E2E sono coperti da PAC-116.
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GET /.well-known/oauth-authorization-server risponde con JSON di metadata conforme RFC 8414; authorization_endpoint punta a /oauth/authorize (route SPA)
- [x] #2 GET /oauth/authorize (route SPA) mostra OAuthConsent.jsx all'utente loggato; se non loggato mostra AuthForm
- [x] #3 POST /api/oauth/authorize con access_token Supabase valido nel body emette un authorization code one-time e risponde { redirect_to: 'redirect_uri?code=...&state=...' }; parametri non validi (client sconosciuto, redirect_uri non autorizzato, utente non autenticato) ricevono 400/401
- [x] #4 POST /api/oauth/token con grant_type=authorization_code e code_verifier corretto restituisce access_token JWT + refresh_token; code_verifier errato riceve 400
- [x] #5 POST /api/oauth/token con grant_type=refresh_token valido restituisce nuovo access_token e nuovo refresh_token (rotazione); token revocato o scaduto riceve 401
- [x] #6 api/mcp.js accetta sia Bearer pac_* (flusso esistente) sia JWT OAuth firmato con OAUTH_JWT_SECRET; token non valido riceve 401
- [x] #7 Validazione redirect_uri: ignora la porta per host loopback (RFC 8252 §7.3), fa exact match per altri URI
- [x] #8 GET /.well-known/oauth-authorization-server funziona su Vercel Production via rewrite in vercel.json
- [x] #9 Gli endpoint /api/oauth/* sono raggiungibili in sviluppo locale via vite.config.js api-dev plugin
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
## Piano di implementazione

### Step 0 — Utility condivisa `api/oauth/_lib.js`

Crea il modulo condiviso importato da tutti gli endpoint OAuth.

```js
// api/oauth/_lib.js
import { createClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export const adminClient = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

/** SHA-256 hex di una stringa (per code_verifier e secret hash) */
export function sha256(str) {
  return createHash('sha256').update(str).digest('hex')
}

/** Base64url-encode di un Buffer */
export function base64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

/**
 * Confronto redirect_uri con supporto loopback (RFC 8252 §7.3):
 * - URI loopback (127.0.0.1 / localhost): ignora la porta, confronta solo schema + host + path
 * - URI non-loopback: confronto esatto
 */
export function redirectUriMatches(registered, requested) {
  try {
    const r = new URL(registered)
    const q = new URL(requested)
    const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(r.hostname)
    if (isLoopback) {
      return r.protocol === q.protocol && r.hostname === q.hostname && r.pathname === q.pathname
    }
    return registered === requested
  } catch {
    return false
  }
}
```

---

### Step 1 — `api/oauth/metadata.js` (endpoint più semplice)

Implementa `GET /.well-known/oauth-authorization-server` (RFC 8414).
Nessuna logica DB: restituisce solo la configurazione statica del server.

```js
export default function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).end()
  const base = process.env.VITE_APP_URL ?? 'https://etflens.app'
  res.json({
    issuer: base,
    authorization_endpoint: `${base}/oauth/authorize`,     // route SPA, non serverless
    token_endpoint: `${base}/api/oauth/token`,
    registration_endpoint: `${base}/api/oauth/register`,
    response_types_supported: ['code'],
    grant_types_supported: ['authorization_code', 'refresh_token'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],
  })
}
```

Aggiungere `VITE_APP_URL=https://etflens.app` a `.env.example`.

---

### Step 2 — Routing: `vercel.json` + `vite.config.js` + route `App.jsx`

**`vercel.json`** — aggiunge solo il rewrite per discovery. `/oauth/authorize` non viene toccato (Vercel serve la SPA):

```json
{
  "rewrites": [
    { "source": "/.well-known/oauth-authorization-server", "destination": "/api/oauth/metadata" },
    { "source": "/api/:path*", "destination": "/api/:path*" }
  ]
}
```

**`vite.config.js`** — aggiunge proxy per sviluppo locale:

```js
proxy: {
  '/.well-known': 'http://localhost:3001',
  '/api/oauth': 'http://localhost:3001',
}
```

**`App.jsx`** — aggiunge route `/oauth/authorize` che monta `OAuthConsent`:

```jsx
import OAuthConsent from './components/OAuthConsent'
// nella logica di routing:
if (path === '/oauth/authorize') return <OAuthConsent />
```

---

### Step 3 — `src/components/OAuthConsent.jsx`

Consent page React per il flusso OAuth PKCE.

```jsx
export default function OAuthConsent() {
  const params = new URLSearchParams(window.location.search)
  const { session } = useAuth()   // hook esistente

  async function authorize() {
    const body = {
      client_id: params.get('client_id'),
      redirect_uri: params.get('redirect_uri'),
      code_challenge: params.get('code_challenge'),
      code_challenge_method: params.get('code_challenge_method'),
      state: params.get('state'),
      scope: params.get('scope') ?? 'portfolio:read',
      access_token: session.access_token,   // token Supabase dal body, non header HTTP
    }
    const res = await fetch('/api/oauth/authorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const { redirect_to } = await res.json()
    window.location.href = redirect_to
  }

  if (!session) return <AuthForm />   // reusa componente esistente
  return (
    <div>
      <p>Vuoi dare accesso al tuo portafoglio su ETFLens?</p>
      <button onClick={authorize}>Autorizza</button>
    </div>
  )
}
```

---

### Step 4 — `api/oauth/authorize.js` (POST-only)

Riceve il body dal componente React, valida, emette il code.

```js
import { randomBytes } from 'crypto'
import { adminClient, sha256, base64url, redirectUriMatches } from './_lib.js'

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end()

  const { client_id, redirect_uri, code_challenge, code_challenge_method,
          state, scope, access_token } = req.body

  // 1. Identifica l'utente dal token Supabase nel body
  const { data: { user }, error: authErr } = await adminClient.auth.getUser(access_token)
  if (authErr || !user) return res.status(401).json({ error: 'unauthorized' })

  // 2. Valida client
  const { data: client } = await adminClient
    .schema('oauth').from('clients')
    .select('redirect_uris, is_active')
    .eq('client_id', client_id).single()
  if (!client?.is_active) return res.status(400).json({ error: 'invalid_client' })

  // 3. Valida redirect_uri
  const allowed = client.redirect_uris.some(u => redirectUriMatches(u, redirect_uri))
  if (!allowed) return res.status(400).json({ error: 'invalid_redirect_uri' })

  // 4. Valida PKCE params
  if (!code_challenge || code_challenge_method !== 'S256')
    return res.status(400).json({ error: 'invalid_request' })

  // 5. Genera e salva authorization code
  const rawCode = base64url(randomBytes(32))
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString()
  await adminClient.schema('oauth').from('auth_codes').insert({
    code_hash: sha256(rawCode),
    client_id,
    user_id: user.id,
    redirect_uri,
    code_challenge,
    scope: scope ?? 'portfolio:read',
    expires_at: expiresAt,
  })

  // 6. Risponde con l'URL di redirect (SPA fa window.location.href)
  const redirectTo = `${redirect_uri}?code=${encodeURIComponent(rawCode)}&state=${encodeURIComponent(state ?? '')}`
  res.json({ redirect_to: redirectTo })
}
```

---

### Step 5 — `api/oauth/token.js`

Gestisce `POST /api/oauth/token`.

**Grant `authorization_code`**:
1. Leggi `code`, `redirect_uri`, `client_id`, `code_verifier` dal body (form o JSON)
2. Cerca `oauth.auth_codes` dove `code_hash = sha256(code)` e `expires_at > now` e `used = false`
3. Verifica `redirectUriMatches(stored.redirect_uri, redirect_uri)`
4. Verifica PKCE: `sha256(code_verifier)` (base64url) === `stored.code_challenge`
5. Segna il code come `used = true` (one-time use)
6. Emetti access token JWT e refresh token:

```js
import { SignJWT } from 'jose'

const secret = new TextEncoder().encode(process.env.OAUTH_JWT_SECRET)
const accessToken = await new SignJWT({ sub: userId, client_id })
  .setProtectedHeader({ alg: 'HS256' })
  .setIssuedAt()
  .setIssuer(process.env.VITE_APP_URL ?? 'https://etflens.app')
  .setAudience('etflens-mcp')
  .setExpirationTime('1h')
  .sign(secret)

// refresh token = randomBytes(32) hex, stored hashed in oauth.refresh_tokens (TTL 90gg)
```

7. Risposta: `{ access_token, token_type: 'Bearer', expires_in: 3600, refresh_token }`

**Grant `refresh_token`**:
1. Cerca `oauth.refresh_tokens` dove `token_hash = sha256(refresh_token)` e `expires_at > now`
2. Ruota il refresh token (elimina vecchio, inserisce nuovo con TTL 90gg)
3. Emetti nuovo access token JWT (TTL 1h)
4. Token scaduto o non trovato → 401

---

### Step 6 — Dual-auth in `api/mcp.js`

Modifica `resolveUserIdFromApiKey` per supportare entrambi i token:

```js
import { jwtVerify } from 'jose'

async function resolveUserId(token) {
  if (!token) return null

  // Bearer API key (legacy)
  if (token.startsWith('pac_')) {
    const hash = createHash('sha256').update(token).digest('hex')
    const { data } = await adminClient
      .from('user_api_keys')
      .select('user_id, id')
      .eq('key_hash', hash)
      .gt('expires_at', new Date().toISOString())
      .single()
    if (!data) return null
    adminClient.from('user_api_keys').update({ last_used_at: new Date().toISOString() }).eq('id', data.id)
    return data.user_id
  }

  // OAuth JWT access token
  try {
    const secret = new TextEncoder().encode(process.env.OAUTH_JWT_SECRET)
    const { payload } = await jwtVerify(token, secret, {
      issuer: process.env.VITE_APP_URL ?? 'https://etflens.app',
      audience: 'etflens-mcp',
    })
    return payload.sub ?? null
  } catch {
    return null
  }
}
```

---

### Step 7 — `api/oauth/register.js` (Dynamic Client Registration, RFC 7591)

Endpoint opzionale per auto-registrazione client:

```js
// POST /api/oauth/register
// Body: { client_name, redirect_uris, grant_types?, response_types? }
// Genera client_id (UUID), client_secret = null (public client, PKCE-only)
// Inserisce in oauth.clients con is_active = true
// Risposta 201: { client_id, client_name, redirect_uris, ... }
```

---

### Ordine di sviluppo consigliato

| # | Step | Perché |
|---|------|--------|
| 1 | `_lib.js` | Foundation per tutti gli altri |
| 2 | `metadata.js` + routing | Verifica subito il setup di routing |
| 3 | `token.js` | Testabile con `curl` prima del consent flow |
| 4 | `OAuthConsent.jsx` + route App.jsx | Consent page React |
| 5 | `authorize.js` (POST-only) | Dipende da OAuthConsent per il flusso completo |
| 6 | dual-auth `mcp.js` | Dipende da token.js (JWT format) |
| 7 | `register.js` | Indipendente, aggiungibile dopo |

---

### Note tecniche

- Tutti i code/token sensibili sono stored **hashed** (SHA-256 hex), mai in chiaro nel DB
- `oauth.auth_codes` ha TTL 10 minuti; cleanup periodico via Supabase lazy delete
- `api/oauth/authorize.js` è POST-only: nessun HTML, nessun `Authorization` HTTP header — il token Supabase viaggia nel body JSON come campo `access_token`
- La consent page è `OAuthConsent.jsx` (React): nessun serverless GET, nessuna sessione server-side
- Supabase RLS sullo schema `oauth` è disabilitata: accesso solo via `service_role` (adminClient)
- Note: il pattern `adminClient.schema('oauth').from(...)` è temporaneo; PAC-122 lo sostituisce con `adminClient.rpc(...)` (PG SECURITY DEFINER functions)
- Test locale: usare `vite-plugin-api-dev` già configurato; aggiungere mock per `OAUTH_JWT_SECRET`
- Riferimento: `docs/oauth-pkce-analysis.md`
<!-- SECTION:PLAN:END -->

## Implementation Notes

<!-- SECTION:NOTES:BEGIN -->
## Host per i test sul branch `mcp`

Durante lo sviluppo e il test su Vercel Preview (branch `mcp`), usare:

```
https://money-growth-git-mcp-alfonsogangemis-projects.vercel.app
```

La variabile `VITE_APP_URL` in Vercel Preview deve essere impostata su questo URL.

Il passaggio all'host di produzione `https://etflens.app` è tracciato in PAC-121 (da eseguire dopo il merge su `main`).

## Decisione architetturale — consent page (punto 2)

`GET /api/oauth/authorize` non restituisce HTML. La consent page è una **route React** (`/oauth/authorize`) nella SPA.

Flusso:
1. CLI apre browser → `https://etflens.app/oauth/authorize?...`
2. Vercel serve la SPA (nessun rewrite verso serverless per questo path)
3. React route `/oauth/authorize` — se non loggato usa AuthForm esistente, poi torna
4. Utente clicca Autorizza → `fetch POST /api/oauth/authorize` con `Authorization: Bearer <supabase-jwt>`
5. API risponde `{ redirect_to: 'http://localhost:PORT?code=...&state=...' }`
6. SPA esegue `window.location.href = redirect_to`

Impatti sul piano:
- `api/oauth/authorize.js` diventa POST-only (niente GET/HTML)
- Nuovo componente `src/components/OAuthConsent.jsx` + route in `App.jsx`
- `vercel.json` non deve riscrivere `/oauth/authorize` (route SPA)
- `docs/architecture.md` da aggiornare con OAuthConsent.jsx

## Decisione — rotazione refresh token (punto 3)

Quando grant_type=refresh_token: eliminare il vecchio token e inserirne uno nuovo. Token già scaduto → 401.

## Decisione — consent page Authorization header (aggiornamento)

`api/oauth/authorize.js` è POST-only e **non gestisce Authorization HTTP header**.

Il token Supabase dell'utente viaggia nel body JSON come campo `access_token`.
Il server chiama `adminClient.auth.getUser(access_token)` per identificare l'utente.

Flusso finale:
1. `OAuthConsent.jsx` legge `session.access_token` da `supabase.auth.getSession()`
2. POST a `/api/oauth/authorize` con body JSON contenente `access_token` + tutti i parametri OAuth
3. Server valida, genera il code, risponde `{ redirect_to: 'redirect_uri?code=...&state=...' }`
4. React fa `window.location.href = data.redirect_to`

Il campo `Authorization` HTTP (Bearer) è riservato al flusso MCP (`api/mcp.js`), non al consent flow.
<!-- SECTION:NOTES:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Implementazione completata

### File creati
- `api/oauth/_lib.js` — utility condivise: `adminClient`, `sha256hex`, `sha256raw`, `base64url`, `redirectUriMatches` (RFC 8252 loopback)
- `api/oauth/metadata.js` — discovery endpoint RFC 8414; `authorization_endpoint` punta a `/oauth/authorize` (SPA)
- `api/oauth/authorize.js` — POST-only; token Supabase nel body JSON (`access_token`), nessun `Authorization` header; emette authorization code PKCE con TTL 10 min
- `api/oauth/token.js` — scambio `authorization_code` → JWT access token (HMAC-SHA256, TTL 1h) + `refresh_token`; verifica PKCE S256 con `sha256raw`; rotation refresh token
- `api/oauth/register.js` — dynamic client registration RFC 7591; inserisce in `oauth.clients`
- `src/components/OAuthConsent.jsx` — pagina consenso React; mostra `AuthForm` se non autenticato, poi chiama `/api/oauth/authorize` e reindirizza a `redirect_to`

### File modificati
- `vercel.json` — aggiunto rewrite `/.well-known/oauth-authorization-server → /api/oauth/metadata` prima del wildcard
- `vite.config.js` — aggiunto routing `/api/oauth/*` e `/.well-known/*`; body parser esteso a `application/x-www-form-urlencoded`
- `src/App.jsx` — aggiunta route `/oauth/authorize` → `OAuthConsent` (con `ThemeProvider` + `LocaleProvider`)
- `api/mcp.js` — dual-auth: `pac_` Bearer (esistente) + JWT OAuth via `jwtVerify` (jose)
- `src/i18n/it.js` / `en.js` — chiavi `oauth_consent_*`, `oauth_scope_label`, `oauth_authorize_btn`, `oauth_authorizing`, `oauth_error_generic`
- `.env.example` — aggiunta `VITE_APP_URL`
- `docs/architecture.md` / `docs/model.md` — documentazione aggiornata

### Note architetturali chiave
- `api/oauth/authorize.js` è POST-only: il token Supabase viaggia nel body JSON, non in `Authorization` header
- PKCE S256: `base64url(SHA256_raw_bytes(code_verifier))` con `sha256raw()` (digest Buffer, non hex)
- `authorization_endpoint` in metadata = `/oauth/authorize` (SPA React), non `/api/oauth/authorize`
- Refresh token rotation: delete + insert atomici; token scaduto → 401
<!-- SECTION:FINAL_SUMMARY:END -->
