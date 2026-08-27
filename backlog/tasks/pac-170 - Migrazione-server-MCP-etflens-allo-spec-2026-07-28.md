---
id: PAC-170
title: Migrazione server MCP etflens allo spec 2026-07-28
status: In Progress
assignee: []
created_date: '2026-08-27 09:31'
updated_date: '2026-08-27 09:32'
labels:
  - mcp
  - migration
dependencies: []
references:
  - 'https://modelcontextprotocol.io/specification/2026-07-28'
  - 'https://modelcontextprotocol.io/specification/2026-07-28/changelog'
  - 'https://blog.modelcontextprotocol.io/posts/2026-07-28/'
documentation:
  - docs/mcp.md
  - docs/architecture.md
modified_files:
  - pac-dashboard/api/mcp.js
  - pac-dashboard/package.json
  - pac-dashboard/package-lock.json
  - pac-dashboard/vercel.json
priority: medium
---

## Description

<!-- SECTION:DESCRIPTION:BEGIN -->
Il server MCP di etflens (`api/mcp.js` + `api/oauth/*`) va portato dallo spec MCP legacy allo spec `2026-07-28` (core stateless, header `Mcp-Method`/`Mcp-Name` obbligatori, cache hints su list/read, auth hardening RFC 9207 + CIMD, deprecazione Roots/Sampling/Logging/SSE legacy), mantenendo la compatibilità con i client sulla versione precedente finché il rollout lato Claude non è completo.

Vincolo principale: nessun cambiamento a nomi, firme o output dei 6 tool e delle 3 resource esposte — i client MCP esistenti (Claude Desktop, Claude Code, altri) non devono rompersi. Nessun `SUPABASE_SERVICE_KEY` o segreto nei log/test/errori. Il filtro `user_id` su ogni query resta invariato (confine di isolamento dati).

Lavoro svolto interattivamente in sessione, una fase alla volta con review, su branch `ft_mcp-2026-07-28` (deploy Vercel disabilitato dal prefisso `ft_*` in `vercel.json`). Stato dettagliato per fase nel piano del task.

Riferimenti spec: https://modelcontextprotocol.io/specification/2026-07-28, changelog: https://modelcontextprotocol.io/specification/2026-07-28/changelog
<!-- SECTION:DESCRIPTION:END -->

## Acceptance Criteria
<!-- AC:BEGIN -->
- [x] #1 npm run test e npm run lint verdi su pac-dashboard
- [ ] #2 Un client dichiarato sullo spec 2026-07-28 (header MCP-Protocol-Version + _meta nel body) completa discovery, tools/list e tools/call e riceve resultType/cache-hints/serverInfo
- [ ] #3 Un client sulla versione precedente (2025-11-25, nessun envelope) continua a funzionare senza modifiche lato client
- [ ] #4 Flusso OAuth completo (authorize → token → refresh) verificato su preview deploy
- [ ] #5 API key Bearer pac_* continua a funzionare come prima
- [ ] #6 Nessun riferimento residuo a Mcp-Session-Id nel repo
- [ ] #7 Header Mcp-Method e Mcp-Name validati in ingresso su Streamable HTTP, risposta 400 se assenti o incoerenti col body JSON-RPC
- [ ] #8 Cache hints (ttlMs, cacheScope) impostati esplicitamente su tools/list, resources/list e sulle resource immutabili per deploy (portfolio://indici, portfolio://formulas/calcoli); portfolio://broker resta a cacheScope private
- [ ] #9 api/oauth/authorize.js aggiunge iss alla redirect URL (RFC 9207); api/oauth/register.js accetta e persiste application_type; CIMD supportato affiancato a DCR senza rimuovere DCR
- [ ] #10 Test di integrazione con SDK reale (non mockato) e Supabase mockato al confine coprono tools/list, tools/call su get_etf e get_calcoli, resources/read, header mancanti, versione di protocollo assente o vecchia, 401 senza token
- [ ] #11 docs/mcp.md riflette la nuova architettura (pacchetti SDK v2, createMcpHandler/toNodeHandler, dual-version)
<!-- AC:END -->

## Implementation Plan

<!-- SECTION:PLAN:BEGIN -->
Fase 1 — Upgrade SDK e handler: FATTO (branch ft_mcp-2026-07-28)
- @modelcontextprotocol/sdk (v1, monolitico) sostituito con @modelcontextprotocol/server + @modelcontextprotocol/node, entrambi ^2.0.0 stabili su npm (non beta, contrariamente a quanto indicato inizialmente dal blog SDK-betas — verificato via npm view).
- api/mcp.js riscritto: .resource()/.tool() -> registerResource()/registerTool() (schemi Zod avvolti in z.object()).
- Handler finale riscritto su createMcpHandler(() => buildMcpServer(userId)) + toNodeHandler(...) — NON sul pattern low-level McpServer + NodeStreamableHTTPServerTransport (identico a v1): verificato empiricamente che quel pattern NON implementa affatto 2026-07-28 (risponde 400 "Unsupported protocol version" su MCP-Protocol-Version: 2026-07-28). createMcpHandler è il vero entry-point stateless per la nuova revisione.
- Rimosso l'hack sull'header accept; rimossi GET/DELETE dai metodi consentiti (il default legacy:'stateless' di createMcpHandler risponde già 405 automaticamente alle vecchie operazioni di sessione).
- vercel.json: Access-Control-Allow-Methods -> "POST, OPTIONS" (conseguenza diretta della rimozione GET/DELETE nello stesso commit; Mcp-Session-Id in Allow-Headers resta per la fase 2).
- Verificato con un vero http.Server (non i test esistenti, che mockano interamente l'SDK v1 e non intercettano nulla): tools/list (6 tool con schemi JSON corretti), tools/call get_etf, resources/read, 401 senza token, e soprattutto una richiesta 2026-07-28 completa (header MCP-Protocol-Version + _meta.io.modelcontextprotocol/protocolVersion nel body) -> risposta con resultType:"complete", ttlMs/cacheScope di default, _meta.serverInfo automatici. Una richiesta legacy senza envelope continua a funzionare con lo stesso handler, senza branching manuale -> risponde in anticipo alla domanda della fase 5 (dual-version è automatico).
- npm run test (155/155 passati) e npm run lint (0 errori, solo warning React preesistenti non correlati) verdi.
- Non ancora committato: in attesa di review utente prima del commit di fase 1.

Fase 2 — Header routing (Mcp-Method/Mcp-Name in ingresso, vercel.json Allow-Headers): DA FARE

Fase 3 — Cache hints (ttlMs/cacheScope su tools/list, resources/list, resource immutabili): DA FARE
- Meccanismo SDK già individuato: new McpServer(..., { cacheHints: { 'tools/list': {...}, 'resources/list': {...} } }) a livello server, e { cacheHint: {...} } nel config di registerResource per singola resource.

Fase 4 — Auth hardening (iss RFC 9207, application_type DCR, CIMD, metadata.js): DA FARE

Fase 5 — Dual-version: verificato empiricamente in fase 1 che createMcpHandler(factory) con legacy:'stateless' (default) serve automaticamente sia 2025-11-25 (legacy, nessun envelope) sia 2026-07-28 (envelope completo) dalla stessa factory, senza branching manuale nell'handler. Da confermare formalmente con test dedicati (fase 6) e documentare la scelta in PR.

Fase 6 — Test (integrazione reali con SDK non mockato, aggiornamento scripts/check-mcp-reachable.mjs): DA FARE
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-08-27 09:32
---
Fase 1 completata e verificata (test/lint verdi, smoke test manuale con SDK reale su server HTTP vero). In attesa di review utente prima del commit sul branch ft_mcp-2026-07-28. Dettagli completi nel piano del task.
---
<!-- COMMENTS:END -->
