---
id: PAC-117
title: 'Analisi: OAuth 2.1 con PKCE — impatti sull''architettura esistente'
status: Done
assignee: []
created_date: '2026-04-21 10:51'
updated_date: '2026-04-21 11:02'
labels:
  - security
  - analysis
  - auth
dependencies: []
references:
  - docs/mcp.md
  - docs/model.md
  - pac-dashboard/api/mcp.js
  - pac-dashboard/api/keys/generate.js
  - pac-dashboard/src/components/ApiKeyPanel.jsx
documentation:
  - docs/oauth-pkce-analysis.md
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
## Obiettivo

Analisi tecnica dell'adozione di OAuth 2.1 con PKCE come meccanismo di autorizzazione, in aggiunta o sostituzione dell'attuale flusso Supabase Auth (magic link / email+password). Produrre un documento di impatto che guidi le decisioni implementative.

---

## Contesto attuale

L'app usa **Supabase Auth** per l'autenticazione utente (JWT emessi da Supabase). Il layer MCP usa **API key proprietarie** (`pac_` + 64 hex, hash SHA-256 su DB) con autenticazione Bearer. Non è presente OAuth 2.1 né PKCE.

---

## Aree da analizzare

### 1. Flusso OAuth 2.1 + PKCE
- Differenze rispetto a OAuth 2.0 (rimozione implicit flow, PKCE obbligatorio per public clients, redirect URI exact match)
- Compatibilità con Supabase Auth come Authorization Server (supporta PKCE natively?)
- Flusso PKCE applicato alla SPA React: `code_verifier`, `code_challenge`, `state`, redirect

### 2. Impatti sul layer MCP
- Possibilità di emettere token OAuth invece di API key proprietarie per l'accesso MCP
- Compatibilità con lo standard MCP Authorization (`Authorization: Bearer <oauth_token>`)
- Impatto su `api/mcp.js`: cambio da `resolveUserIdFromApiKey` a validazione JWT OAuth

### 3. Impatti su Supabase
- Supabase come Authorization Server: endpoint `/authorize`, `/token`, PKCE support
- Necessità di custom Auth server esterno (es. Auth0, Clerk, custom) se Supabase non copre il caso d'uso
- Gestione refresh token e scadenza

### 4. Impatti su API key esistenti (`user_api_keys`)
- Le API key attuali restano valide in parallelo o vengono deprecate?
- Migrazione graduale: dual-auth (API key + OAuth token) vs sostituzione completa
- Impatto su UI `ApiKeyPanel.jsx` e hook `useApiKeys.js`

### 5. Impatti su frontend (SPA React)
- Gestione PKCE nel browser: `crypto.getRandomValues`, `TextEncoder`, `SubtleCrypto`
- Archiviazione sicura del `code_verifier` (sessionStorage, mai localStorage)
- Redirect handling in Vite dev e in produzione (Vercel)

### 6. Sicurezza comparata
- API key proprietarie vs OAuth 2.1 token: pro/contro per il caso d'uso MCP
- Token binding, audience validation (`aud` claim), scopes
- Rischi residui: token leakage, CSRF su redirect

### 7. Effort stimato
- Stima giorni/punti per ogni area di impatto
- Dipendenze esterne (librerie, provider)
- Raccomandazione: adottare OAuth 2.1, mantenere API key, o approccio ibrido

---

## Output atteso

Documento di analisi in `docs/oauth-pkce-analysis.md` con:
- Diagramma del flusso PKCE applicato all'architettura attuale
- Tabella impatti per componente (basso / medio / alto)
- Raccomandazione finale motivata
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 Analisi del supporto PKCE nativo in Supabase Auth documentata con evidenza (docs ufficiali o test)
- [x] #2 Impatti su api/mcp.js, useApiKeys.js e ApiKeyPanel.jsx descritti con le modifiche necessarie
- [x] #3 Confronto sicurezza API key proprietarie vs OAuth 2.1 token per il caso d'uso MCP
- [x] #4 Stima effort per ogni area di impatto (giorni o story points)
- [x] #5 Raccomandazione finale: adottare / non adottare / ibrido, con motivazione
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
Analisi completata in docs/oauth-pkce-analysis.md. Punti chiave: (1) Supabase non può fungere da AS OAuth per client di terze parti — ruolo limitato a IdP per la SPA. (2) L'AS OAuth 2.1 si implementa interamente sul progetto Vercel esistente (4 nuovi endpoint, 3 tabelle Supabase, 1 variabile d'ambiente). (3) Strategia ibrida: le API key pac_ restano valide in parallelo; OAuth 2.1 si aggiunge senza breaking changes. (4) Token format: access token JWT firmato (TTL 1h, no DB query per validazione) + refresh token opaco SHA-256 (TTL 90gg). (5) Effort stimato: 14.5 giorni. (6) Raccomandata libreria jose per JWT. (7) Nessuna infrastruttura esterna necessaria.
<!-- SECTION:FINAL_SUMMARY:END -->
