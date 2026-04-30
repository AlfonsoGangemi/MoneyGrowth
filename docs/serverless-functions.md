# Serverless Functions — Riferimento

## Cosa sono le Vercel Serverless Functions

Le **Serverless Functions** sono funzioni Node.js eseguite server-side su Vercel, senza che sia necessario gestire un server dedicato. Ogni file in `api/` diventa automaticamente un endpoint HTTP indipendente: Vercel lo istanzia su richiesta, lo esegue e lo distrugge — il ciclo di vita è completamente gestito dalla piattaforma.

Il modello "serverless" risolve tre problemi pratici di questa applicazione:

1. **Proxying sicuro verso API esterne.** Il browser non può chiamare direttamente ExtraETF (CORS bloccato). Le funzioni fanno da intermediario: ricevono la richiesta dal frontend, la inoltrano all'API esterna con le credenziali/socket necessari, e restituiscono i dati normalizzati.

2. **Logica server-side senza esporre segreti.** Le chiavi di servizio Supabase (`SUPABASE_SERVICE_KEY`), il segreto JWT OAuth (`OAUTH_JWT_SECRET`) e altre variabili sensibili esistono solo nell'ambiente Vercel — mai nel bundle client scaricato dal browser.

3. **Authorization server OAuth 2.1 + MCP.** Il flusso OAuth (PKCE, emissione JWT, refresh token) e l'endpoint MCP per i client AI richiedono endpoint HTTP persistenti e autenticati: le serverless functions li forniscono senza overhead infrastrutturale.

Ogni funzione è un modulo ESM con un export default `(req, res) => {}` compatibile con l'API Node.js `http`. In locale, Vite intercetta le chiamate a `/api/*` tramite il plugin `api-dev` in `vite.config.js` e le esegue nello stesso processo di sviluppo.

---

Tutte le funzioni vivono in `pac-dashboard/api/` e vengono eseguite come Vercel Serverless Functions (Node.js).

**Limite piano Hobby:** 12 handler file. Il progetto ne usa 11 — c'è uno slot libero.

**CORS globale** (da `vercel.json`): ogni rotta `/api/*` riceve automaticamente `Access-Control-Allow-Origin: https://claude.ai`. Le funzioni che lo leggono da `ALLOWED_ORIGIN` lo impostano anche per altri client.

---

## Panoramica

| File | Metodo | Endpoint pubblico | Auth |
|---|---|---|---|
| `extraetf-quotes.js` | GET | `/api/extraetf-quotes` | nessuna |
| `extraetf-detail.js` | GET | `/api/extraetf-detail` | nessuna |
| `stats.js` | GET | `/api/stats` | nessuna |
| `keys/generate.js` | POST | `/api/keys/generate` | Supabase JWT |
| `keys/[keyId].js` | DELETE | `/api/keys/:id` | Supabase JWT |
| `oauth/metadata.js` | GET | `/.well-known/oauth-authorization-server` | nessuna |
| `oauth/protected-resource.js` | GET | `/.well-known/oauth-protected-resource` | nessuna |
| `oauth/authorize.js` | POST | `/api/oauth/authorize` | Supabase access\_token nel body |
| `oauth/token.js` | POST | `/api/oauth/token` | nessuna (PKCE) |
| `oauth/register.js` | POST | `/api/oauth/register` | nessuna |
| `mcp.js` | GET / POST / DELETE | `/api/mcp` | Bearer `pac_…` o JWT OAuth |

`oauth/_lib.js` non è un handler — è una libreria condivisa (non conta nel limite).

---

## Proxy ETF (senza autenticazione)

### `extraetf-quotes.js` — Quotazioni ExtraETF

Proxy duale: il comportamento dipende dai query parameter.

**Modalità history** (`date_from` presente)

```
GET /api/extraetf-quotes?isin=IE00B4L5Y983&date_from=2024-01-01&date_to=2024-12-31
```

Chiama la REST chart API di ExtraETF:
```
https://quotes.extraetf.com/v1/chart?isin=...&currency=EUR&ordering=date&interval=1d
```

Risposta (passata tal quale dal proxy):
```json
{ "count": 250, "results": [{ "date": "2024-01-02", "closing_price": 95.42, ... }] }
```

Usato da `backfillETFPrices` in `src/utils/backfillPrezzi.js` per storicizzare i prezzi mensili.

**Modalità real-time** (`isins` presente, nessun `date_from`)

```
GET /api/extraetf-quotes?isins=IE00B4L5Y983,LU1681043599
```

Apre una connessione WebSocket verso `wss://quotes.extraetf.com/v1/ws`, raccoglie i prezzi correnti e chiude dopo timeout (8 s) o ricezione completa.

Risposta:
```json
{ "prices": { "IE00B4L5Y983": 95.42 }, "missing": [] }
```

**Rate limit:** 60 richieste/minuto per IP (in-memory). Risponde 429 se superato.  
**Validazione:** ISIN con regex `^[A-Z]{2}[A-Z0-9]{10}$`, massimo 20 ISIN per richiesta, date in formato `YYYY-MM-DD`.

---

### `extraetf-detail.js` — Metadati ETF

```
GET /api/extraetf-detail?isin=IE00B4L5Y983
```

Chiama `https://extraetf.com/api-v2/detail/?isin=...` e normalizza la risposta.

Risposta:
```json
{ "nome": "Core MSCI World", "emittente": "iShares", "assetClassNome": "Azioni" }
```

`assetClassNome` è mappato da un ID numerico interno ExtraETF (vedi `ASSET_CLASS_MAP` nel file). Default: `"Azioni"` se non riconosciuto.

**Rate limit:** 60 req/min per IP.

---

## Statistiche pubbliche

### `stats.js`

```
GET /api/stats
```

Aggrega in parallelo quattro sorgenti (con `Promise.allSettled` — ogni sorgente che fallisce non blocca le altre):

| Campo | Sorgente |
|---|---|
| `acquisti` | `COUNT(*)` su tabella `acquisti` |
| `utenti` | `auth.admin.listUsers` totale |
| `portafogli` | `COUNT(*)` su `etf` dove `archiviato = false` |
| `capitale_gestito` | `SUM(importoInvestito)` su `acquisti` |
| `stelle_github` | GitHub API repo `alfonsogangemi/moneygrowth` |

Usa il `SUPABASE_SERVICE_KEY` (accesso admin). La risposta include solo i campi per cui la query ha avuto successo.

**Cache:** `public, max-age=3600, stale-while-revalidate=86400`.  
**Auth:** nessuna.

---

## Gestione API key MCP

Entrambi gli endpoint verificano il Supabase JWT nell'header `Authorization: Bearer <jwt>` chiamando `authClient.auth.getUser()` server-side.

### `keys/generate.js`

```
POST /api/keys/generate
Authorization: Bearer <supabase-jwt>
```

1. Elimina chiavi scadute dell'utente.
2. Conta le chiavi attive — rifiuta se ≥ 2 (409).
3. Conta le chiavi create nelle ultime 24 h — rifiuta se ≥ 5 (429).
4. Genera `pac_<64 hex char>`, salva l'SHA-256 nel DB.

La chiave in chiaro è restituita **una sola volta**:
```json
{ "id": "uuid", "key": "pac_...", "expires_at": "2026-07-30T..." }
```

TTL: 90 giorni (definito a livello DB con `DEFAULT NOW() + INTERVAL '90 days'`).

### `keys/[keyId].js`

```
DELETE /api/keys/:id
Authorization: Bearer <supabase-jwt>
```

Hard delete della chiave con verifica ownership (`user_id`). Risponde 404 se la chiave non esiste o appartiene a un altro utente.

---

## OAuth 2.1 + PKCE Authorization Server

Il server OAuth permette a client MCP (Claude Desktop, Claude Code, ecc.) di ottenere un JWT con scope `portfolio:read` per accedere a `/api/mcp` a nome dell'utente.

### `oauth/_lib.js` — Libreria condivisa (non handler)

Esporta: `adminClient` (Supabase service key), `sha256hex()`, `sha256raw()`, `base64url()`, `redirectUriMatches()` (con supporto loopback RFC 8252 — ignora la porta per `localhost`/`127.0.0.1`/`[::1]`).

---

### `oauth/metadata.js` — Discovery endpoint

```
GET /.well-known/oauth-authorization-server
```

(Rewrite Vercel → `/api/oauth/metadata`)

Risponde con il documento RFC 8414. Informa il client di token endpoint, authorization endpoint, metodi PKCE supportati, grant type, ecc.

**Cache:** `no-store`.

---

### `oauth/protected-resource.js` — Protected Resource Metadata

```
GET /.well-known/oauth-protected-resource
```

(Rewrite Vercel → `/api/oauth/protected-resource`)

RFC 9728: indica al client quale risorsa protegge (`/api/mcp`) e quali Authorization Server usare (etflens.app stesso).

---

### `oauth/register.js` — Dynamic Client Registration

```
POST /api/oauth/register
Content-Type: application/json

{ "client_name": "MyCLI", "redirect_uris": ["http://localhost:1234/callback"] }
```

RFC 7591: registra un nuovo OAuth client e restituisce il `client_id`. Nessuna autenticazione richiesta (registrazione aperta, come da spec MCP).

---

### `oauth/authorize.js` — Emissione authorization code

```
POST /api/oauth/authorize
Content-Type: application/json

{
  "client_id": "...",
  "redirect_uri": "...",
  "code_challenge": "...",
  "code_challenge_method": "S256",
  "state": "...",
  "scope": "portfolio:read",
  "access_token": "<supabase-token>"
}
```

Il Supabase `access_token` viene passato nel body (non nell'header) — è la pagina `/oauth/authorize` nel client che si autentica e poi posta qui. Il server verifica l'identità tramite `adminClient.auth.getUser(access_token)`, valida il client e la `redirect_uri`, genera un authorization code casuale (TTL 10 minuti), lo salva hashed nel DB e restituisce:

```json
{ "redirect_to": "https://redirect-uri?code=...&state=..." }
```

---

### `oauth/token.js` — Scambio token

```
POST /api/oauth/token
Content-Type: application/json
```

Supporta due grant type:

**`authorization_code`** — scambia il code con access token + refresh token.
- Consume atomico del code (eliminato al primo accesso, indipendentemente da PKCE).
- Verifica PKCE S256: `base64url(SHA256(code_verifier)) === code_challenge`.
- Emette JWT HMAC-SHA256 (TTL 1 h) firmato con `OAUTH_JWT_SECRET`.
- Claims JWT: `sub=userId`, `iss=etflens.app`, `aud=etflens.app/api/mcp`, `typ=at+JWT`.
- Emette refresh token (TTL 30 giorni).

**`refresh_token`** — rotation atomica.
- Elimina il vecchio refresh token e ne inserisce uno nuovo nella stessa transazione DB (via RPC `oauth_rotate_refresh_token`).
- Emette un nuovo access token.

---

## MCP Server

### `mcp.js`

```
GET | POST | DELETE /api/mcp
Authorization: Bearer <token>
```

Server MCP Streamable HTTP che espone il portafoglio dell'utente a LLM come Claude. Usa `@modelcontextprotocol/sdk`.

**Autenticazione duale:**

| Token | Verifica |
|---|---|
| `pac_<hex>` (Bearer key) | SHA-256 → lookup `user_api_keys`, controlla `expires_at` |
| JWT OAuth | `jwtVerify` con `OAUTH_JWT_SECRET`, verifica `iss` e `aud` |

Se non autenticato, risponde 401 con header `WWW-Authenticate: Bearer resource_metadata="..."` (RFC 6750/9728) per guidare il client nel flusso OAuth.

**Resources** (lettura passiva da parte del client):

| URI | Contenuto |
|---|---|
| `portfolio://broker` | Array broker dell'utente |
| `portfolio://indici` | Lista indici finanziari calcolabili con firma e descrizione |
| `portfolio://formulas/calcoli` | Sorgente completo di `calcoli.js` |

**Tools** (eseguibili dall'LLM):

| Tool | Parametri | Descrizione |
|---|---|---|
| `get_portafoglio` | — | ETF + acquisti + prezzi storici + scenari + broker + storico annuale in un unico payload |
| `get_etf` | `brokers[]?` | ETF dell'utente, filtrabili per broker |
| `get_acquisti` | `etf_ids[]?`, `from?`, `to?` | Acquisti filtrabili per ETF e intervallo di date |
| `get_prezzi_storici` | `isin` | Prezzi mensili storici per un ISIN (con verifica ownership) |
| `get_storico` | `anno?` | Record `portafoglio_storico_annuale`, filtrabile per anno |
| `get_calcoli` | `indice?` | Sorgente JS di una funzione specifica (o tutto `calcoli.js`) da applicare lato LLM |

**Note operative:**
- `api/mcp.js` include `src/utils/calcoli.js` nel bundle tramite `vercel.json` (`includeFiles`).
- I prezzi nei dati non sono real-time: riflettono l'ultimo sync manuale nell'app.
- Il campo `_meta.avviso` è incluso in ogni risposta `get_portafoglio` per informare l'LLM.
