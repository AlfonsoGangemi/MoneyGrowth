---
id: PAC-170
title: Migrazione server MCP etflens allo spec 2026-07-28
status: In Progress
assignee: []
created_date: '2026-08-27 09:31'
updated_date: '2026-08-27 12:55'
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
  - pac-dashboard/api/oauth/authorize.js
  - pac-dashboard/api/oauth/register.js
  - pac-dashboard/api/oauth/discovery.js
  - pac-dashboard/api/oauth/__tests__/authorize.test.js
  - pac-dashboard/api/oauth/__tests__/register.test.js
  - pac-dashboard/api/__tests__/mcp.integration.test.js
  - pac-dashboard/scripts/check-mcp-reachable.mjs
  - >-
    pac-dashboard/supabase/migrations/20260827000000_pac170_oauth_application_type.sql
  - docs/mcp.md
  - docs/model.md
  - docs/README.md
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
- [x] #2 Un client dichiarato sullo spec 2026-07-28 (header MCP-Protocol-Version + _meta nel body) completa discovery, tools/list e tools/call e riceve resultType/cache-hints/serverInfo
- [x] #3 Un client sulla versione precedente (2025-11-25, nessun envelope) continua a funzionare senza modifiche lato client
- [ ] #4 Flusso OAuth completo (authorize → token → refresh) verificato su preview deploy
- [x] #5 API key Bearer pac_* continua a funzionare come prima
- [x] #6 Nessun riferimento residuo a Mcp-Session-Id nel repo
- [x] #7 Header Mcp-Method e Mcp-Name validati in ingresso su Streamable HTTP, risposta 400 se assenti o incoerenti col body JSON-RPC
- [x] #8 Cache hints (ttlMs, cacheScope) impostati esplicitamente su tools/list, resources/list e sulle resource immutabili per deploy (portfolio://indici, portfolio://formulas/calcoli); portfolio://broker resta a cacheScope private
- [x] #9 api/oauth/authorize.js aggiunge iss alla redirect URL (RFC 9207); api/oauth/register.js accetta e persiste application_type; CIMD supportato affiancato a DCR senza rimuovere DCR
- [x] #10 Test di integrazione con SDK reale (non mockato) e Supabase mockato al confine coprono tools/list, tools/call su get_etf e get_calcoli, resources/read, header mancanti, versione di protocollo assente o vecchia, 401 senza token
- [x] #11 docs/mcp.md riflette la nuova architettura (pacchetti SDK v2, createMcpHandler/toNodeHandler, dual-version)
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

Fase 2 — Header routing: FATTO. Verificato empiricamente (server HTTP reale, richieste modern con/senza Mcp-Method e Mcp-Name, con valore corretto/sbagliato) che createMcpHandler valida GIA' nativamente questi header sulle richieste 2026-07-28: 400 con code -32020 (HeaderMismatch) se assenti o incoerenti col body JSON-RPC (cross-check su method e su params.name/params.uri). Nessun codice di validazione manuale aggiunto in api/mcp.js. Unico cambio reale: vercel.json Access-Control-Allow-Headers 'mcp-session-id' -> 'Mcp-Method, Mcp-Name, MCP-Protocol-Version'. Confermato nessun riferimento residuo a Mcp-Session-Id nel codice attivo (solo nei task di backlog storici, corretto lasciarli). npm run test (155/155) e npm run lint (0 errori) verdi. Non ancora committato.

Fase 3 — Cache hints: FATTO. new McpServer({name,version}, { cacheHints: { 'tools/list': {ttlMs, cacheScope}, 'resources/list': {ttlMs, cacheScope} } }) a livello server; cacheHint nel config di registerResource per portfolio://indici e portfolio://formulas/calcoli. Valore usato: 6h (21600000ms) / cacheScope 'public' per tutte e quattro. portfolio://broker lasciata senza cacheHint esplicito: default SDK ttlMs:0/cacheScope:'private' gia' soddisfa il requisito 'nessuna cache condivisa'. Verificato empiricamente con richieste reali (server HTTP vero): tools/list, resources/list, resources/read indici -> ttlMs:21600000,cacheScope:'public'; resources/read broker -> ttlMs:0,cacheScope:'private'. npm run test (155/155) e npm run lint (0 errori) verdi. Non ancora committato.

Fase 4 — Auth hardening: FATTO. api/oauth/authorize.js: aggiunto iss (issuer, RFC 9207) nella redirect URL costruita; aggiunto resolveClient() che risolve il client sia via DCR (oauth_get_client, invariato) sia via CIMD (client_id in forma https://.../path -> fetch del documento JSON remoto, valida client_id nel documento == URL richiesta e redirect_uris contiene il redirect_uri, nessuna cache per statelessness serverless). DCR non rimosso. api/oauth/register.js: accetta application_type ('web'|'native', default 'web' se omesso per compat OIDC), valida i valori ammessi, lo passa a oauth_register_client e lo riflette nella risposta 201. Nuova migration pac-dashboard/supabase/migrations/20260827000000_pac170_oauth_application_type.sql: colonna oauth.clients.application_type (CHECK web/native, default web) + oauth_register_client aggiornata con p_application_type. NON APPLICATA al DB Supabase reale (solo il file SQL e' stato creato/committato: applicarla e' un'azione su infrastruttura condivisa, richiede conferma esplicita dell'utente e le credenziali/CLI Supabase). api/oauth/discovery.js: aggiunte authorization_response_iss_parameter_supported e client_id_metadata_document_supported alla AS metadata. redirectUriMatches() in _lib.js gia' corretto per loopback RFC 8252, nessuna modifica necessaria (verificato leggendo il codice + con test register.test.js 'native + loopback'). Aggiunti test permanenti (non temporanei, colmano un gap di copertura zero preesistente): api/oauth/__tests__/authorize.test.js (iss sempre presente, CIMD valido, CIMD client_id mismatch, CIMD redirect_uri non autorizzato, CIMD fetch fallita, http:// non trattato come CIMD) e api/oauth/__tests__/register.test.js (default web, native+loopback, valore invalido) — 9 test totali. docs/model.md e docs/mcp.md aggiornati. npm run test (164/164) e npm run lint (0 errori) verdi. Non ancora committato.

IMPORTANTE per fase 5/6 e per il deploy: la migration SQL di fase 4 va applicata manualmente al DB Supabase (staging poi produzione) PRIMA che register.js possa funzionare in quell'ambiente, altrimenti oauth_register_client fallira' per firma funzione non corrispondente. Da fare esplicitamente dall'utente, non automaticamente da me.

Fase 5 — Dual-version: FATTO (confermata formalmente, nessun codice aggiuntivo necessario oltre a quanto gia' presente da fase 1). Confermato con test permanenti dedicati in mcp.integration.test.js: nessun header/envelope -> legacy 200; header su revisione precedente esplicita (2025-11-25) senza envelope -> legacy 200; header 2026-07-28 + _meta completo -> moderna 200 con resultType/ttlMs/cacheScope/serverInfo; header 2026-07-28 senza _meta -> 400 controllato (envelope incompleto, non un crash). Nessun branching manuale nell'handler: createMcpHandler classifica autonomamente ogni richiesta.

Fase 6 — Test: FATTO. Nuovo pac-dashboard/api/__tests__/mcp.integration.test.js (15 test) contro SDK reale (non mockato, solo Supabase mockato al confine) su un vero http.Server (necessario: NodeStreamableHTTPServerTransport/createMcpHandler richiedono un vero http.ServerResponse con writeHead, il mock leggero di mcp.test.js non basta per questi test). Copre: 401 (token assente/invalido), tools/list (6 tool, legacy e moderna), tools/call su get_etf e get_calcoli, resources/read su portfolio://indici, server/discover, header Mcp-Method/Mcp-Name mancanti o incoerenti (400 code -32020), negoziazione di versione (vedi fase 5). mcp.test.js (SDK interamente mockato) lasciato invariato: continua a coprire in isolamento auth-gate e validazione metodo HTTP, scopo diverso e complementare. scripts/check-mcp-reachable.mjs: aggiunta probe in envelope 2026-07-28 (step 2, numerazione step successivi shiftata), commento step 1 aggiornato per chiarire perche' resta valido per entrambe le revisioni (auth verificata prima di toccare il body). npm run test (179/179) e npm run lint (0 errori) verdi. Non ancora committato.
<!-- SECTION:PLAN:END -->

## Comments

<!-- COMMENTS:BEGIN -->
created: 2026-08-27 09:32
---
Fase 1 completata e verificata (test/lint verdi, smoke test manuale con SDK reale su server HTTP vero). In attesa di review utente prima del commit sul branch ft_mcp-2026-07-28. Dettagli completi nel piano del task.
---

created: 2026-08-27 10:59
---
Fase 2 completata: nessuna modifica di codice necessaria in mcp.js (l'SDK valida gia' Mcp-Method/Mcp-Name nativamente per le richieste 2026-07-28), solo vercel.json aggiornato. Verificato con test/lint verdi. In attesa di review utente prima del commit.
---

created: 2026-08-27 11:05
---
Fase 3 completata: cache hints impostati e verificati empiricamente (valori corretti in tutte le risposte testate). In attesa di review utente prima del commit.
---

created: 2026-08-27 11:15
---
Fase 4 completata: iss (RFC 9207), CIMD affiancato a DCR, application_type persistito, nuova migration SQL creata ma NON applicata al DB reale (richiede conferma esplicita dell'utente prima del deploy). 9 nuovi test permanenti, 164/164 verdi. In attesa di review utente prima del commit.
---

created: 2026-08-27 12:55
---
Fasi 5 e 6 completate insieme (strettamente accoppiate: la conferma del dual-version passa proprio dai nuovi test di integrazione). 15 nuovi test permanenti su SDK reale, check-mcp-reachable.mjs aggiornato con probe 2026-07-28. 179/179 test verdi, lint pulito. AC rimaste aperte: #4 (verifica su preview deploy, impossibile da qui: il branch ft_* ha deploy Vercel disabilitato — richiede merge o deploy manuale dell'utente). Tutto il resto del lavoro di implementazione e' completo. In attesa di review utente prima del commit.
---
<!-- COMMENTS:END -->
