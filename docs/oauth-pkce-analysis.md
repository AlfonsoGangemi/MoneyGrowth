# Analisi OAuth 2.1 + PKCE — ETF Lens (PAC-117)

> **Conclusione anticipata:** si può implementare interamente sul progetto Vercel esistente. Non serve infrastruttura dedicata. L'effort stimato è 12–18 giorni. La strategia raccomandata è un approccio **ibrido progressivo**: le API key esistenti restano valide, OAuth 2.1 si aggiunge come flusso alternativo.

---

## Indice

1. [Contesto e motivazione](#1-contesto-e-motivazione)
2. [Cos'è OAuth 2.1 + PKCE](#2-cosè-oauth-21--pkce)
3. [Ruolo di Supabase: cosa fa e cosa non fa](#3-ruolo-di-supabase-cosa-fa-e-cosa-non-fa)
4. [Architettura proposta su Vercel](#4-architettura-proposta-su-vercel)
5. [Flusso completo PKCE](#5-flusso-completo-pkce)
6. [Impatti per componente](#6-impatti-per-componente)
7. [Nuove tabelle Supabase](#7-nuove-tabelle-supabase)
8. [Strategia di autenticazione duale](#8-strategia-di-autenticazione-duale)
9. [Sicurezza comparata: API key vs OAuth token](#9-sicurezza-comparata-api-key-vs-oauth-token)
10. [Stima effort](#10-stima-effort)
11. [Raccomandazione finale](#11-raccomandazione-finale)
12. [Dipendenze e librerie](#12-dipendenze-e-librerie)

---

## 1. Contesto e motivazione

L'obiettivo è duplice:

| Motivazione | Descrizione |
|---|---|
| **UX** | Eliminare il copy-paste manuale della chiave: il client MCP apre il browser, l'utente si autentica, il token viene configurato automaticamente senza toccare file JSON |
| **Conformità** | Allinearsi allo standard MCP Authorization (spec 2025-03-26) che definisce OAuth 2.1 come meccanismo di autenticazione raccomandato |

Tutti i client MCP in scope (Claude Code, Cursor, Codex CLI, Gemini CLI, Kiro) supportano anche la configurazione manuale via `Authorization: Bearer <token>`, quindi la migrazione può essere graduale.

---

## 2. Cos'è OAuth 2.1 + PKCE

OAuth 2.1 consolida le best practice di OAuth 2.0 (RFC 6749, 7636, 8252):

- **PKCE obbligatorio** per tutti i client (non solo public client)
- **Nessun implicit flow** (rimosso)
- **Nessun Resource Owner Password Credentials** (rimosso)
- **Redirect URI exact match** (no wildcard)
- **Authorization Code + PKCE** è l'unico flusso raccomandato per SPA e client nativi

### PKCE in sintesi

```
Client                         Authorization Server
  │                                    │
  │── genera code_verifier (random) ──▶│
  │── code_challenge = SHA256(cv)      │
  │                                    │
  │── GET /authorize?                  │
  │     code_challenge=...             │
  │     code_challenge_method=S256 ───▶│
  │                                    │
  │◀── redirect con ?code=... ─────────│
  │                                    │
  │── POST /token                      │
  │     code=...                       │
  │     code_verifier=... ────────────▶│
  │                                    │  verifica: SHA256(code_verifier) == code_challenge
  │◀── { access_token, refresh_token } │
```

Il `code_verifier` non viaggia mai durante il redirect, quindi un attaccante che intercetta il `code` non può ottenere il token senza `code_verifier`.

---

## 3. Ruolo di Supabase: cosa fa e cosa non fa

| Capacità | Supabase Auth | Note |
|---|---|---|
| Login email/password per la SPA | ✅ | Già in uso |
| Login Google OAuth per la SPA | ✅ | Già in uso |
| PKCE per i propri flussi interni | ✅ | `flowType: 'pkce'` nel client config |
| Authorization Server per client di terze parti | ❌ | Non può emettere token OAuth per Claude Desktop/Code |
| Endpoint `/authorize` e `/token` per client esterni | ❌ | Non esposto |

**Conclusione:** Supabase è un **Identity Provider** per gli utenti della SPA, non un Authorization Server generale. Il ruolo di AS va implementato come funzioni Vercel personalizzate, usando Supabase solo per verificare l'identità dell'utente durante il flusso di consenso.

---

## 4. Architettura proposta su Vercel

Tutto risiede nel progetto esistente. Nessuna infrastruttura esterna richiesta.

```
etflens.app/
│
├── /.well-known/oauth-authorization-server   ← metadata AS (RFC 8414)
│
├── /api/oauth/
│   ├── metadata.js       GET   — discovery endpoint
│   ├── authorize.js      GET   — mostra consent page (HTML)
│   │                     POST  — emette authorization code
│   ├── token.js          POST  — scambia code → access_token + refresh_token
│   └── register.js       POST  — dynamic client registration (RFC 7591, opzionale)
│
├── /api/mcp.js                 ← modificato: accetta API key pac_ O JWT OAuth
├── /api/keys/generate.js       ← invariato
└── /api/keys/[keyId].js        ← invariato
```

### Routing `vercel.json`

```json
{
  "rewrites": [
    {
      "source": "/.well-known/oauth-authorization-server",
      "destination": "/api/oauth/metadata"
    }
  ]
}
```

### Formato token: JWT firmato

L'access token è un **JWT firmato con `OAUTH_JWT_SECRET`** (variabile d'ambiente nuova). Vantaggi:
- `api/mcp.js` lo valida con `jose` o `jsonwebtoken` senza query DB
- Payload contiene `sub` (user_id), `iss`, `exp`, `aud`
- Nessun round-trip Supabase per ogni richiesta MCP

Il refresh token è **opaco** (random hex) con hash SHA-256 in DB — stesso pattern delle API key attuali.

---

## 5. Flusso completo PKCE

```
Claude Code / Claude Desktop (MCP client)
  │
  │ 1. Scopre l'AS via GET /.well-known/oauth-authorization-server
  │    → ottiene authorization_endpoint, token_endpoint, ecc.
  │
  │ 2. Genera code_verifier (32 byte random) e code_challenge = SHA256(cv)
  │
  │ 3. Apre browser: GET /api/oauth/authorize?
  │      response_type=code
  │      client_id=etflens-claude
  │      redirect_uri=http://localhost:PORT/callback
  │      code_challenge=BASE64URL(SHA256(cv))
  │      code_challenge_method=S256
  │      state=RANDOM
  │
  ▼
Browser dell'utente
  │
  │ 4. /api/oauth/authorize restituisce HTML:
  │    - Se utente non autenticato: form di login (chiama Supabase dal server)
  │    - Se autenticato: pagina di consenso ("Vuoi dare accesso al tuo portafoglio?")
  │
  │ 5. Utente acconsente → POST /api/oauth/authorize
  │    - Verifica JWT Supabase dell'utente
  │    - Genera authorization_code (JWT firmato, TTL 5 min)
  │    - Salva in oauth_auth_codes: code_hash, user_id, code_challenge, client_id, redirect_uri
  │    - Redirect a: redirect_uri?code=...&state=...
  │
  ▼
Claude Code / Claude Desktop
  │
  │ 6. POST /api/oauth/token
  │      grant_type=authorization_code
  │      code=...
  │      code_verifier=... (il cv originale)
  │      client_id=etflens-claude
  │      redirect_uri=http://localhost:PORT/callback
  │
  │ 7. /api/oauth/token:
  │    - Verifica code (cerca hash in oauth_auth_codes, non scaduto, non usato)
  │    - Verifica PKCE: SHA256(code_verifier) == code_challenge salvato
  │    - Genera access_token (JWT, TTL 1h) e refresh_token (opaque, TTL 90gg)
  │    - Segna il code come usato (one-time use)
  │
  │ → risposta: { access_token, token_type: "bearer", expires_in: 3600, refresh_token }
  │
  ▼
Chiamate MCP successive
  │
  │ 8. POST /api/mcp
  │    Authorization: Bearer <access_token JWT>
  │
  │    api/mcp.js: verifica JWT con OAUTH_JWT_SECRET → estrae user_id → procede
  │
  │ 9. Quando access_token scade: POST /api/oauth/token
  │      grant_type=refresh_token
  │      refresh_token=...
  │    → nuovo access_token senza che l'utente faccia nulla
```

---

## 6. Impatti per componente

| Componente | Impatto | Modifica richiesta |
|---|---|---|
| `api/mcp.js` | **Medio** | Aggiungere validazione JWT OAuth in parallelo alla logica `pac_` esistente. Dual-auth: `if key.startsWith('pac_') → API key flow; else → JWT validation` |
| `api/keys/generate.js` | Nessuno | Invariato |
| `api/keys/[keyId].js` | Nessuno | Invariato |
| `useApiKeys.js` | Nessuno | Invariato (gestisce solo API key) |
| `ApiKeyPanel.jsx` | **Basso** | Nessuna modifica obbligatoria. Opzionale: aggiungere sezione "token OAuth attivi" separata |
| `Dashboard.jsx` | Nessuno | Invariato |
| `useAuth.js` | **Basso** | Nessuna modifica (il flusso OAuth MCP è separato dal login SPA) |
| `AuthForm.jsx` | Nessuno | Invariato |
| `vercel.json` | **Medio** | Aggiungere rewrite per `/.well-known/oauth-authorization-server` |
| Supabase schema | **Medio** | 3 nuove tabelle: `oauth_clients`, `oauth_auth_codes`, `oauth_refresh_tokens` |
| Variabili d'ambiente | **Basso** | 1 nuova: `OAUTH_JWT_SECRET` (secret per firmare i JWT OAuth) |
| `vite.config.js` | **Basso** | Aggiungere routing dev per `/api/oauth/*` nel plugin `api-dev` |

---

## 7. Nuove tabelle Supabase

```sql
-- Client OAuth registrati (Claude Desktop, Claude Code, ecc.)
create table oauth_clients (
  client_id     text primary key,
  name          text not null,
  redirect_uris text[] not null,
  created_at    timestamptz default now()
);

-- Client pre-registrati (seed)
insert into oauth_clients values
  ('etflens-claude-desktop', 'Claude Desktop', ARRAY['http://localhost']),
  ('etflens-claude-code',    'Claude Code',    ARRAY['http://localhost']),
  ('etflens-cursor',         'Cursor',         ARRAY['http://localhost']),
  ('etflens-other',          'Other',          ARRAY['http://localhost']);

-- Authorization codes (TTL 5 minuti, one-time use)
create table oauth_auth_codes (
  id                    uuid primary key default gen_random_uuid(),
  code_hash             text not null unique,
  user_id               uuid references auth.users not null,
  client_id             text references oauth_clients not null,
  redirect_uri          text not null,
  code_challenge        text not null,
  code_challenge_method text not null default 'S256',
  used                  boolean not null default false,
  expires_at            timestamptz not null default now() + interval '5 minutes',
  created_at            timestamptz default now()
);

create index on oauth_auth_codes(code_hash) where used = false;

-- Refresh tokens (TTL 90 giorni, revocabili)
create table oauth_refresh_tokens (
  id           uuid primary key default gen_random_uuid(),
  token_hash   text not null unique,
  user_id      uuid references auth.users not null,
  client_id    text references oauth_clients not null,
  revoked_at   timestamptz,
  expires_at   timestamptz not null default now() + interval '90 days',
  created_at   timestamptz default now()
);

create index on oauth_refresh_tokens(token_hash) where revoked_at is null;

-- RLS: nessun accesso diretto dal client browser (solo service key server-side)
alter table oauth_clients       enable row level security;
alter table oauth_auth_codes    enable row level security;
alter table oauth_refresh_tokens enable row level security;
-- Nessuna policy SELECT per utenti: tutto via service key in api/oauth/*.js
```

---

## 8. Strategia di autenticazione duale

La strategia **ibrida** consente migrazione graduale senza breaking changes:

```js
// api/mcp.js — dual-auth
async function resolveUserId(authHeader) {
  const token = authHeader?.replace('Bearer ', '') ?? ''

  if (token.startsWith('pac_')) {
    // Flusso esistente: API key proprietaria
    return resolveUserIdFromApiKey(token)
  }

  // Flusso nuovo: JWT OAuth
  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.OAUTH_JWT_SECRET))
    return payload.sub  // user_id
  } catch {
    return null
  }
}
```

| Scenario | Auth accettata |
|---|---|
| Utenti esistenti (API key manuale) | `pac_` key → continua a funzionare |
| Nuovi utenti (flusso OAuth) | JWT OAuth → flusso automatico |
| Deprecazione API key (futuro) | Rimuovere il branch `pac_` quando il client base è migrato |

---

## 9. Sicurezza comparata: API key vs OAuth token

| Aspetto | API key `pac_` | OAuth 2.1 + PKCE |
|---|---|---|
| **Scadenza** | 90 giorni (hard), non rinnovabile | Access token 1h, refresh token 90gg rinnovabile |
| **Revoca** | Hard delete DB | `revoked_at` su refresh token; access token non revocabile prima di scadenza (TTL breve mitiga) |
| **Entropia** | 256 bit (32 byte random) | JWT firmato HMAC-SHA256 + refresh opaque 256 bit |
| **Storage client** | File JSON config (permanente) | Token store del client MCP (più sicuro) |
| **UX configurazione** | Manuale (genera, copia, incolla) | Automatica (browser flow una tantum) |
| **PKCE protection** | N/A | Previene auth code interception attack |
| **Scope granulari** | No (accesso totale al portafoglio) | Possibile in futuro (es. `read:portfolio`) |
| **Audit trail** | `last_used_at` per chiave | Log per client_id + user_id |
| **Complessità implementativa** | Bassa (già implementata) | Alta (nuovo AS completo) |

Entrambi i meccanismi sono **equivalenti in sicurezza** per questo caso d'uso con utenti propri. OAuth 2.1 aggiunge valore principalmente su UX e conformità allo standard MCP, non su protezione crittografica.

---

## 10. Stima effort

| Area | Giorni stimati |
|---|---|
| Schema DB (3 tabelle + seed) | 0.5 |
| `api/oauth/metadata.js` (discovery) | 0.5 |
| `api/oauth/register.js` (dynamic client reg.) | 1 |
| `api/oauth/authorize.js` (HTML consent + POST) | 4 |
| `api/oauth/token.js` (code exchange + refresh) | 3 |
| Modifica `api/mcp.js` (dual-auth) | 1 |
| `vercel.json` + routing dev plugin | 0.5 |
| Test unitari (vitest) per ogni endpoint | 2 |
| Test E2E con Claude Code / Claude Desktop | 2 |
| **Totale** | **14.5 giorni** |

La parte più complessa è `api/oauth/authorize.js`: deve gestire sia la sessione utente (verifica JWT Supabase), sia la generazione del codice, sia il rendering HTML della consent page — tutto in una funzione serverless stateless.

---

## 11. Raccomandazione finale

**Adottare OAuth 2.1 con approccio ibrido progressivo.**

### Fase 1 — Già completata
- API key proprietarie (`pac_`) operative
- `ApiKeyPanel` con snippet per tutti i client

### Fase 2 — OAuth 2.1 AS (nuovo sviluppo)
Implementare gli endpoint OAuth su Vercel, aggiungere dual-auth in `api/mcp.js`. I client aggiornati useranno il flusso automatico; i client già configurati con API key continuano a funzionare.

### Fase 3 — Deprecazione (facoltativa, futuro)
Quando la base di client è sufficientemente migrata, deprecare e poi rimuovere il flusso `pac_`. Non ha scadenza fissa.

### Perché non un'infrastruttura dedicata

| Opzione | Costo | Dipendenza esterna | Effort setup |
|---|---|---|---|
| **Vercel (progetto esistente)** | Zero aggiuntivo | No | Basso |
| Auth0 / Clerk | $25–100+/mese | Alta | Medio |
| Keycloak self-hosted | Infrastruttura VM | Alta | Alto |

Per un'app con utenti propri (non marketplace OAuth), costruire l'AS sul progetto esistente è la scelta corretta. La complessità è nella logica del flusso, non nell'infrastruttura.

---

## 12. Dipendenze e librerie

```json
{
  "dependencies": {
    "jose": "^5.x"
  }
}
```

`jose` (JavaScript Object Signing and Encryption) è la libreria standard per JWT in ambiente Edge/Node moderno. Già usata internamente da Supabase. Gestisce firma (`HS256`), verifica, e generazione di token. Peso ~50KB, zero dipendenze native.

**Nessuna altra dipendenza esterna necessaria.** Il flusso PKCE lato server richiede solo `crypto` (nativo Node.js) per `SHA-256`.
