---
id: PAC-121
title: Switch host OAuth AS da branch preview a produzione etflens.app
status: Done
assignee: []
created_date: '2026-04-23 08:54'
updated_date: '2026-07-30 12:33'
labels:
  - oauth
  - deploy
  - config
milestone: m-2 - mcp-ai-layer-—-accesso-dati-portafoglio-via-llm
dependencies:
  - PAC-120
  - PAC-116
priority: low
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Dopo il merge del branch `mcp` su `main` e la verifica E2E (PAC-116), aggiornare la variabile `VITE_APP_URL` in Vercel Production da `https://money-growth-git-mcp-alfonsogangemis-projects.vercel.app` a `https://etflens.app`.

Impatto:
- `api/oauth/metadata.js` — `issuer` e tutti gli endpoint nel discovery JSON
- `oauth.clients.redirect_uris` in Supabase — aggiornare i 4 client seed con redirect URI di produzione se diversi
- Verifica che `/.well-known/oauth-authorization-server` risponda con l'issuer corretto su `etflens.app`
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 GET https://etflens.app/.well-known/oauth-authorization-server risponde con issuer='https://etflens.app'
- [x] #2 I client seed in oauth.clients hanno redirect_uris aggiornati per produzione
- [x] #3 VITE_APP_URL=https://etflens.app impostato nelle env var Vercel Production
<!-- AC:END -->

## Final Summary

<!-- SECTION:FINAL_SUMMARY:BEGIN -->
## Risultato

Tutte le precondizioni (PAC-120, PAC-116, merge branch `mcp` su `main`) erano già soddisfatte. Il codice (`api/oauth/metadata.js`, `register.js`, `protected-resource.js`, `token.js`, `authorize.js`) usa già di default `https://etflens.app` come fallback quando `VITE_APP_URL` non è impostata, quindi non sono state necessarie modifiche al codice.

## Verifiche eseguite (manuali, in ordine)

1. **Vercel Production** — `VITE_APP_URL` risultava già impostata a `https://etflens.app`.
2. **Supabase `oauth.clients`** — i 4 client seed (`etflens-claude-desktop`, `etflens-claude-code`, `etflens-cursor`, `etflens-other`) usano redirect URI loopback (`http://localhost`, `http://127.0.0.1`), validi indipendentemente dall'host dell'AS (RFC 8252 §7.3) — nessun aggiornamento necessario.
3. **Discovery endpoint** — `GET https://etflens.app/.well-known/oauth-authorization-server` risponde con `issuer: "https://etflens.app"` e tutti gli endpoint corretti.

## Nota

Durante la verifica del punto 2 è emerso un accumulo di client di test e client duplicati generati via Dynamic Client Registration in `oauth.clients`. Tracciato separatamente in **PAC-149**.
<!-- SECTION:FINAL_SUMMARY:END -->
